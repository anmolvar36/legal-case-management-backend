const prisma = require('../../config/db');
const billingService = require('../billing/billing.service');

const canAccessMatter = (matter, user) => {
  if (!matter || !user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'lawyer') return matter.assigned_lawyer_id === user.id;
  if (user.role === 'client') {
    return matter.client?.user_id === user.id || (matter.parties && matter.parties.some(p => p.user_id === user.id));
  }
  return false;
};

const nextMatterNumber = async () => {
  const count = await prisma.matter.count();
  return `MT-${String(count + 1).padStart(5, '0')}`;
};

const getAll = async (query, user) => {
  const { status, client_id, lawyer_id, page = 1, limit = 10 } = query;
  const take = parseInt(limit);
  const skip = (parseInt(page) - 1) * take;

  const where = {};
  if (status) where.status = status;
  if (client_id) where.client_id = parseInt(client_id);
  if (lawyer_id) where.assigned_lawyer_id = parseInt(lawyer_id);
  if (user?.role === 'lawyer') where.assigned_lawyer_id = user.id;
  if (user?.role === 'client') {
    where.OR = [
      { client: { user_id: user.id } },
      { parties: { some: { user_id: user.id } } }
    ];
  }

  const matters = await prisma.matter.findMany({
    where,
    skip,
    take,
    include: {
      client: { select: { id: true, full_name: true } },
      parties: { select: { id: true, full_name: true } },
      assigned_lawyer: { select: { id: true, full_name: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  const matterIds = matters.map(m => m.id);
  const customFields = await prisma.matterCustomFieldValue.findMany({
    where: { matter_id: { in: matterIds } },
    include: { field_definition: true }
  });

  return matters.map(m => {
    m.custom_fields = customFields
      .filter(cf => cf.matter_id === m.id)
      .map(cf => ({
        field_id: cf.field_definition_id,
        name: cf.field_definition?.name || 'Unknown Field',
        type: cf.field_definition?.type || 'text',
        value: cf.value,
      }));
    return m;
  });
};

const getById = async (id, user) => {
  const matter = await prisma.matter.findUnique({
    where: { id: parseInt(id) },
    include: {
      client: true,
      parties: { select: { id: true, full_name: true, user_id: true } },
      assigned_lawyer: { select: { id: true, full_name: true, email: true } },
      created_by: { select: { id: true, full_name: true } },
      documents: {
        include: {
          uploader: { select: { id: true, full_name: true } },
        },
      },
      drafts: {
        orderBy: { updated_at: 'desc' },
      },
      communications: {
        orderBy: { created_at: 'desc' },
        take: 50,
        include: {
          sender: { select: { id: true, full_name: true, role: true } },
        },
      },
      status_history: {
        orderBy: { created_at: 'desc' },
        take: 20,
      },
      invoices: {
        include: { payments: true }
      },
      activities: {
        orderBy: { created_at: 'desc' },
        take: 20,
        include: {
          actor: { select: { id: true, full_name: true } },
        },
      },
      tasks: {
        include: {
          assigned_user: { select: { id: true, full_name: true, role: true } },
        },
        orderBy: [
          { status: 'asc' },
          { due_date: 'asc' }
        ]
      },
    }
  });
  if (!matter) return null;
  if (!canAccessMatter(matter, user)) {
    const err = new Error('Not authorized to access this matter');
    err.statusCode = 403;
    throw err;
  }

  // Fetch custom fields
  const customFields = await prisma.matterCustomFieldValue.findMany({
    where: { matter_id: parseInt(id) },
    include: { field_definition: true }
  });
  matter.custom_fields = customFields.map(cf => ({
    field_id: cf.field_definition_id,
    name: cf.field_definition?.name || 'Unknown Field',
    type: cf.field_definition?.type || 'text',
    value: cf.value,
  }));

  // Standardize invoices
  if (matter.invoices) {
    matter.invoices = matter.invoices.map(billingService.calculateInvoiceFields);
  }

  if (user?.role === 'client') {
    matter.documents = (matter.documents || []).filter((d) =>
      d.visibility === 'client_shared' || d.visibility === 'client_visible',
    );
    matter.communications = (matter.communications || []).filter((c) =>
      c.visibility === 'client_visible' || c.visibility === 'client_shared',
    );
    matter.drafts = (matter.drafts || []).filter((d) =>
      d.status === 'sent_for_signature' || d.status === 'signed',
    );
  }
  return matter;
};

const create = async (data, user) => {
  if (user?.role === 'client') {
    const err = new Error('Client cannot create matters');
    err.statusCode = 403;
    throw err;
  }
  if (user?.role === 'lawyer') {
    if (data.assigned_lawyer_id && Number(data.assigned_lawyer_id) !== user.id) {
      const err = new Error('Lawyer can only create matters assigned to self');
      err.statusCode = 403;
      throw err;
    }
    data.assigned_lawyer_id = user.id;
    data.created_by_user_id = user.id;
  }

  const { custom_fields, clientIds, clientId, ...payload } = data;

  let idsToConnect = [];
  if (clientIds && Array.isArray(clientIds) && clientIds.length > 0) {
    idsToConnect = clientIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
  } else if (clientId) {
    idsToConnect = [parseInt(clientId, 10)].filter(id => !isNaN(id));
  }

  if (idsToConnect.length > 0) {
    payload.client_id = idsToConnect[0];
    payload.parties = {
      connect: idsToConnect.map(id => ({ id }))
    };
  }

  if (!payload.matter_number) {
    payload.matter_number = await nextMatterNumber();
  }
  
  if (payload.initial_filing_date) payload.initial_filing_date = new Date(payload.initial_filing_date);
  if (payload.date_of_loss) payload.date_of_loss = new Date(payload.date_of_loss);
  if (payload.trial_date) payload.trial_date = new Date(payload.trial_date);
  if (payload.next_hearing) payload.next_hearing = new Date(payload.next_hearing);

  const matter = await prisma.matter.create({ data: payload });
  
  // Sync to calendar
  try {
    const calendarService = require('../calendar/calendar.service');
    await calendarService.syncMatterDates(matter, data.created_by_user_id);
  } catch(e) {
    console.error('Failed to sync matter dates to calendar', e);
  }
  
  // Log activity
  await prisma.activity.create({
    data: {
      matter_id: matter.id,
      entity_type: 'matter',
      entity_id: matter.id,
      action: 'created',
      description: `Matter ${matter.matter_number} created: ${matter.title}`,
      actor_user_id: data.created_by_user_id
    }
  });

  // Save custom fields
  if (custom_fields && Array.isArray(custom_fields)) {
    for (const cf of custom_fields) {
      if (cf.field_id !== undefined && cf.value !== undefined) {
        await prisma.matterCustomFieldValue.create({
          data: {
            matter_id: matter.id,
            field_definition_id: parseInt(cf.field_id),
            value: String(cf.value),
          }
        });
      }
    }
  }

  return matter;
};

const update = async (id, data, user) => {
  const idInt = parseInt(id, 10);
  const existing = await prisma.matter.findUnique({ where: { id: idInt } });
  if (!existing) {
    const err = new Error('Matter not found');
    err.statusCode = 404;
    throw err;
  }
  if (!canAccessMatter(existing, user)) {
    const err = new Error('Not authorized to update this matter');
    err.statusCode = 403;
    throw err;
  }
  if (user?.role === 'client') {
    const err = new Error('Client cannot update matters');
    err.statusCode = 403;
    throw err;
  }
  if (user?.role === 'lawyer') {
    delete data.client_id;
    delete data.assigned_lawyer_id;
    delete data.created_by_user_id;
  }

  const { updated_by_user_id, custom_fields, ...prismaData } = data;
  if (prismaData.next_hearing) {
    prismaData.next_hearing = new Date(prismaData.next_hearing);
  }
  if (prismaData.initial_filing_date) {
    prismaData.initial_filing_date = new Date(prismaData.initial_filing_date);
  }
  if (prismaData.date_of_loss) {
    prismaData.date_of_loss = new Date(prismaData.date_of_loss);
  }
  if (prismaData.trial_date) {
    prismaData.trial_date = new Date(prismaData.trial_date);
  }
  const matter = await prisma.matter.update({
    where: { id: idInt },
    data: prismaData,
  });

  // Sync to calendar
  try {
    const calendarService = require('../calendar/calendar.service');
    await calendarService.syncMatterDates(matter, updated_by_user_id ?? existing.created_by_user_id);
  } catch(e) {
    console.error('Failed to sync matter dates to calendar on update', e);
  }

  if (data.status && data.status !== existing.status) {
    const actorId = updated_by_user_id ?? existing.created_by_user_id;

    await prisma.activity.create({
      data: {
        matter_id: matter.id,
        entity_type: 'matter',
        entity_id: matter.id,
        action: 'status_updated',
        description: `Matter status changed to ${data.status}`,
        actor_user_id: actorId,
      },
    });

    await prisma.matterStatusHistory.create({
      data: {
        matter_id: matter.id,
        old_status: existing.status,
        new_status: data.status,
        changed_by_user_id: actorId,
      },
    });
  }

  // Update custom fields
  if (custom_fields && Array.isArray(custom_fields)) {
    for (const cf of custom_fields) {
      if (cf.field_id !== undefined && cf.value !== undefined) {
        await prisma.matterCustomFieldValue.upsert({
          where: {
            matter_id_field_definition_id: {
              matter_id: matter.id,
              field_definition_id: parseInt(cf.field_id)
            }
          },
          update: { value: String(cf.value) },
          create: {
            matter_id: matter.id,
            field_definition_id: parseInt(cf.field_id),
            value: String(cf.value)
          }
        });
      }
    }
  }

  return matter;
};

const remove = async (id, user) => {
  if (user?.role !== 'admin') {
    const err = new Error('Only admin can delete matters');
    err.statusCode = 403;
    throw err;
  }
  const matterId = parseInt(id, 10);
  await prisma.$transaction([
    prisma.matterStatusHistory.deleteMany({ where: { matter_id: matterId } }),
    prisma.document.deleteMany({ where: { matter_id: matterId } }),
    prisma.communication.deleteMany({ where: { matter_id: matterId } }),
    prisma.invoice.deleteMany({ where: { matter_id: matterId } }),
    prisma.draft.deleteMany({ where: { matter_id: matterId } }),
    prisma.activity.deleteMany({ where: { matter_id: matterId } }),
    prisma.timeEntry.deleteMany({ where: { matter_id: matterId } }),
    prisma.calendarEvent.deleteMany({ where: { matter_id: matterId } }),
    prisma.folder.deleteMany({ where: { matter_id: matterId } }),
    prisma.trustTransaction.deleteMany({ where: { matter_id: matterId } }),
    prisma.task.deleteMany({ where: { matter_id: matterId } }),
    prisma.matterCustomFieldValue.deleteMany({ where: { matter_id: matterId } }),
    prisma.matter.delete({ where: { id: matterId } })
  ]);
  return { success: true };
};


module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};