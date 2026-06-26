const prisma = require('../../config/db');

const getAll = async (query) => {
  const { status, matter_type, page = 1, limit = 10 } = query;
  
  const where = {};
  if (status) where.status = status;
  if (matter_type) where.matter_type = matter_type;

  const take = parseInt(limit);
  const skip = (parseInt(page) - 1) * take;

  return await prisma.lead.findMany({
    where,
    skip,
    take,
    orderBy: { created_at: 'desc' },
  });
};

const getById = async (id) => {
  return await prisma.lead.findUnique({ 
    where: { id: parseInt(id) },
    include: {
      created_by: {
        select: { id: true, full_name: true }
      }
    }
  });
};

const create = async (data) => {
  const lead = await prisma.lead.create({ data });
  
  // Log activity
  await prisma.activity.create({
    data: {
      entity_type: 'lead',
      entity_id: lead.id,
      action: 'created',
      description: `Lead created for ${lead.full_name}`,
    }
  });

  return lead;
};

const createFromPublicConsultation = async (body) => {
  const full_name = String(body?.full_name || '').trim();
  const email = String(body?.email || '').trim();
  const phoneRaw = String(body?.phone ?? '').trim();
  const preferred_date = String(body?.preferred_date || '').trim();
  const matter_type = String(body?.matter_type || '').trim();
  const message = String(body?.message || '').trim();

  if (!full_name || !email || !preferred_date || !matter_type || !message) {
    const err = new Error('Full name, email, preferred date, matter type, and matter overview are required');
    err.statusCode = 400;
    throw err;
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    const err = new Error('Valid email is required');
    err.statusCode = 400;
    throw err;
  }

  const notesLines = [
    'Channel: website book consultation',
    `Preferred consultation date: ${preferred_date}`,
  ];

  return create({
    full_name,
    email,
    phone: phoneRaw || null,
    matter_type,
    practice_area: matter_type,
    source: 'website',
    message,
    notes: notesLines.join('\n'),
    status: 'new',
    created_by_user_id: null,
  });
};

const createFromPublicInquiry = async (body) => {
  const full_name = String(body?.full_name || '').trim();
  const email = String(body?.email || '').trim();
  const phoneRaw = String(body?.phone ?? '').trim();
  const matter_type = String(body?.matter_type || '').trim();
  const message = String(body?.message || '').trim();

  if (!full_name || !email || !message) {
    const err = new Error('Full name, email, and matter narrative are required');
    err.statusCode = 400;
    throw err;
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    const err = new Error('Valid email is required');
    err.statusCode = 400;
    throw err;
  }

  const phone = phoneRaw || null;
  const area = matter_type || null;

  return create({
    full_name,
    email,
    phone,
    matter_type: area,
    practice_area: area,
    source: 'website_inquiry',
    message,
    notes: 'Channel: website inquiry form',
    status: 'new',
    created_by_user_id: null,
  });
};

const update = async (id, data) => {
  const lead = await prisma.lead.update({
    where: { id: parseInt(id) },
    data,
  });

  // Log activity
  await prisma.activity.create({
    data: {
      entity_type: 'lead',
      entity_id: lead.id,
      action: 'updated',
      description: `Lead updated: status changed to ${lead.status}`,
    }
  });

  return lead;
};

const remove = async (id) => {
  return await prisma.lead.delete({ where: { id: parseInt(id) } });
};

const convertToClient = async (leadId, createdByUserId) => {
  const lead = await prisma.lead.findUnique({ where: { id: parseInt(leadId) } });
  
  if (!lead) throw new Error('Lead not found');

  // Transaction to convert lead to client
  return await prisma.$transaction(async (tx) => {
    // 1. Create client
    const client = await tx.client.create({
      data: {
        full_name: lead.full_name,
        email: lead.email,
        phone: lead.phone,
        notes: `Converted from lead. Original message: ${lead.message}`,
      }
    });

    // 2. Update lead
    await tx.lead.update({
      where: { id: lead.id },
      data: { 
        status: 'retained',
        converted_client_id: client.id 
      }
    });

    // 3. Log activity
    await tx.activity.create({
      data: {
        entity_type: 'client',
        entity_id: client.id,
        action: 'converted_from_lead',
        actor_user_id: createdByUserId,
        description: `Client created from Lead #${lead.id}`,
      }
    });

    return client;
  });
};


module.exports = {
  getAll,
  getById,
  create,
  createFromPublicConsultation,
  createFromPublicInquiry,
  update,
  remove,
  convertToClient,
};
