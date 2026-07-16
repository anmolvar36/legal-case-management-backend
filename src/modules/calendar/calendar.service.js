const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const notificationsService = require('../notifications/notifications.service');

exports.getAllEvents = async () => {
  const events = [];

  // 1. Invoice due
  const invoices = await prisma.invoice.findMany({
    where: { due_date: { not: null } },
    select: { id: true, invoice_number: true, amount: true, due_date: true, status: true, description: true, matter: { select: { status: true } } }
  });

  invoices.forEach(i => {
    if (i.matter && i.matter.status === 'completed') return;
    events.push({
      id: i.id,
      title: `Invoice ${i.invoice_number} due`,
      date: i.due_date,
      type: 'invoice',
      amount: i.amount,
      status: i.status,
      description: i.description,
      raw_id: i.id
    });
  });

  // 2. Matters
  const matters = await prisma.matter.findMany({
    where: { status: { not: 'completed' } },
    select: { id: true, title: true, created_at: true, closed_at: true, updated_at: true, status: true, matter_number: true, description: true }
  });

  matters.forEach(m => {
    events.push({
      id: m.id,
      title: `Matter Opened: ${m.title}`,
      date: m.created_at,
      type: 'matter',
      matter_id: m.id,
      matter_number: m.matter_number,
      description: m.description,
      raw_id: m.id
    });
  });

  // 3. Manual events
  const custom = await prisma.calendarEvent.findMany({
    include: {
      matter: { select: { matter_number: true, title: true, status: true } },
      attendees: { include: { user: { select: { full_name: true, email: true } } } }
    }
  });

  custom.forEach(e => {
    if (e.matter && e.matter.status === 'completed') return;
    events.push({
      id: e.id,
      title: e.title,
      date: e.event_date,
      type: e.type,
      matter_id: e.matter_id,
      matter_number: e.matter?.matter_number,
      matter_title: e.matter?.title,
      description: e.description,
      raw_id: e.id,
      appearance_type: e.appearance_type,
      court_name: e.court_name,
      court_room: e.court_room,
      judge_name: e.judge_name,
      is_court_event: e.is_court_event || e.court_related || false,
      attendees: e.attendees || [],
      reminder_date: e.reminder_date,
      create_task: e.create_task,
      end_date: e.end_date,
      outlook_event_id: e.outlook_event_id,
      outlook_series_id: e.outlook_series_id,
      recurrence_rule: e.recurrence_rule,
      busy_status: e.busy_status,
      categories: e.categories,
      location: e.location,
      is_all_day: e.is_all_day,
      timezone: e.timezone,
      attachments: e.attachments,
      importance: e.importance
    });
  });

  return events;
};

exports.createEvent = async (userId, body) => {
  let eventDate = new Date(body.date || new Date());
  
  if (body.time) {
    const [hours, minutes] = body.time.split(':');
    eventDate.setHours(parseInt(hours, 10));
    eventDate.setMinutes(parseInt(minutes, 10));
  }

  const type = body.type || 'general';
  const courtRelatedTypes = ['court_date', 'hearing', 'trial', 'filing_deadline', 'motion', 'mediation', 'conference'];
  const isCourtRelated = courtRelatedTypes.includes(type) || body.is_court_event === true;

  const eventData = {
    title: body.title,
    event_date: eventDate,
    end_date: body.end_date ? new Date(body.end_date) : null,
    reminder_date: body.reminder_date ? new Date(body.reminder_date) : null,
    event_status: body.event_status || 'scheduled',
    court_related: isCourtRelated,
    matter_id: body.matter_id ? Number(body.matter_id) : null,
    activity_id: body.activity_id ? Number(body.activity_id) : null,
    type: type,
    description: body.description || null,
    created_by: userId,
    appearance_type: body.appearance_type || null,
    court_name: body.court_name || null,
    court_room: body.court_room || null,
    judge_name: body.judge_name || null,
    is_court_event: isCourtRelated,
    create_task: isCourtRelated && body.create_task === true,
    busy_status: body.busy_status || 'busy',
    recurrence_rule: body.recurrence_rule || null,
    categories: body.categories ? (typeof body.categories === 'string' ? JSON.parse(body.categories) : body.categories) : null,
    location: body.location || null,
    is_all_day: body.is_all_day === true || body.is_all_day === 'true',
    timezone: body.timezone || 'UTC',
    attachments: body.attachments ? (typeof body.attachments === 'string' ? JSON.parse(body.attachments) : body.attachments) : null,
    importance: body.importance || 'normal'
  };

  if (body.attendees && body.attendees.length > 0) {
    eventData.attendees = {
      create: body.attendees.map(a => ({
        user_id: a.user_id ? Number(a.user_id) : null,
        email: a.email || null,
        status: 'pending',
        is_optional: a.is_optional === true || a.is_optional === 'true'
      }))
    };
  }

  const event = await prisma.calendarEvent.create({
    data: eventData,
    include: { attendees: { include: { user: { select: { full_name: true, email: true } } } } }
  });

  // Task generation for court-related events (Hearing, Trial, Filing Deadline)
  if (isCourtRelated && body.create_task === true) {
    const tasksService = require('../tasks/tasks.service');
    // Fetch creator details
    const creatorUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, full_name: true, role: true }
    });
    const mockUserContext = creatorUser || { id: userId, full_name: 'System', role: 'admin' };

    // Fetch assigned lawyer for the matter
    let assignedLawyerId = userId;
    if (event.matter_id) {
      const matterObj = await prisma.matter.findUnique({
        where: { id: event.matter_id },
        select: { assigned_lawyer_id: true }
      });
      if (matterObj && matterObj.assigned_lawyer_id) {
        assignedLawyerId = matterObj.assigned_lawyer_id;
      }
    }

    let taskTitles = [];
    if (type === 'hearing') {
      taskTitles = ['Prepare appearance', 'Review documents'];
    } else if (type === 'trial') {
      taskTitles = ['Trial preparation', 'Evidence review'];
    } else if (type === 'filing_deadline') {
      taskTitles = ['Prepare filing', 'Submit filing'];
    }

    for (const tTitle of taskTitles) {
      await tasksService.create({
        title: `${tTitle}: ${event.title}`,
        description: `Auto-generated task from court event: ${event.title}`,
        status: 'open',
        priority: 'high',
        task_type: 'general',
        due_date: eventDate,
        matter_id: event.matter_id,
        assigned_user_id: assignedLawyerId
      }, mockUserContext);
    }
  }

  // Outlook Sync
  const outlookService = require('./outlook.service');
  await outlookService.createEvent(userId, event);

  if (event.matter_id && (event.type === 'hearing' || event.type === 'deadline' || event.type === 'filing_deadline')) {
    const matter = await prisma.matter.findUnique({
      where: { id: event.matter_id },
      select: { assigned_lawyer_id: true, matter_number: true }
    });
    if (matter?.assigned_lawyer_id) {
      await notificationsService.createNotification({
        user_id: matter.assigned_lawyer_id,
        title: `Critical Alert: ${event.type.charAt(0).toUpperCase() + event.type.slice(1)}`,
        message: `New ${event.type} "${event.title}" set for matter ${matter.matter_number}.`,
        type: 'deadline',
        reference_id: event.matter_id
      });
    }
  }

  if (event.attendees && event.attendees.length > 0) {
    for (const attendee of event.attendees) {
      if (attendee.user_id && attendee.user_id !== userId) {
        await notificationsService.createNotification({
          user_id: attendee.user_id,
          title: `Calendar Invitation: ${event.title}`,
          message: `You have been invited to an event scheduled for ${event.event_date.toLocaleDateString()}.`,
          type: 'system',
          reference_id: event.id
        });
      } else if (attendee.email) {
        // Prepare backend for future email invitation sending.
        // E.g., emailService.sendCalendarInvite(attendee.email, event);
        console.log(`[Calendar] Invitation pending for external attendee: ${attendee.email}. Email provider not configured.`);
      }
    }
  }

  return event;
};

exports.acknowledgeEvent = async (id) => {
  const eventId = parseInt(id, 10);
  const event = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: { event_status: 'completed' }
  });
  return event;
};

exports.syncMatterDates = async (matter, userId) => {
  const datesToSync = [
    { field: 'initial_filing_date', type: 'filing_deadline', title: `Filing Deadline: ${matter.title}` },
    { field: 'trial_date', type: 'trial', title: `Trial: ${matter.title}` },
    { field: 'next_hearing', type: 'hearing', title: `Hearing: ${matter.title}` }
  ];

  for (const dateInfo of datesToSync) {
    if (matter[dateInfo.field]) {
      const existing = await prisma.calendarEvent.findFirst({
        where: { matter_id: matter.id, type: dateInfo.type }
      });

      if (existing) {
        if (existing.event_date.getTime() !== new Date(matter[dateInfo.field]).getTime()) {
          await prisma.calendarEvent.update({
            where: { id: existing.id },
            data: { event_date: new Date(matter[dateInfo.field]) }
          });
        }
      } else {
        await exports.createEvent(userId, {
          title: dateInfo.title,
          date: matter[dateInfo.field],
          matter_id: matter.id,
          type: dateInfo.type,
          description: `Auto-synced from matter ${matter.matter_number}`,
          create_task: false
        });
      }
    }
  }
};

exports.updateEvent = async (userId, id, body) => {
  const eventId = parseInt(id, 10);
  
  const existing = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    include: { attendees: true }
  });
  if (!existing) throw new Error('Event not found');

  let eventDate = new Date(body.date || existing.event_date);
  if (body.time) {
    const [hours, minutes] = body.time.split(':');
    eventDate.setHours(parseInt(hours, 10));
    eventDate.setMinutes(parseInt(minutes, 10));
  }

  const type = body.type || existing.type;
  const courtRelatedTypes = ['court_date', 'hearing', 'trial', 'filing_deadline', 'motion', 'mediation', 'conference'];
  const isCourtRelated = courtRelatedTypes.includes(type) || body.is_court_event === true;

  const eventData = {
    title: body.title !== undefined ? body.title : existing.title,
    event_date: eventDate,
    end_date: body.end_date !== undefined ? (body.end_date ? new Date(body.end_date) : null) : existing.end_date,
    reminder_date: body.reminder_date !== undefined ? (body.reminder_date ? new Date(body.reminder_date) : null) : existing.reminder_date,
    event_status: body.event_status !== undefined ? body.event_status : existing.event_status,
    court_related: isCourtRelated,
    matter_id: body.matter_id !== undefined ? (body.matter_id ? Number(body.matter_id) : null) : existing.matter_id,
    activity_id: body.activity_id !== undefined ? (body.activity_id ? Number(body.activity_id) : null) : existing.activity_id,
    type: type,
    description: body.description !== undefined ? body.description : existing.description,
    appearance_type: body.appearance_type !== undefined ? body.appearance_type : existing.appearance_type,
    court_name: body.court_name !== undefined ? body.court_name : existing.court_name,
    court_room: body.court_room !== undefined ? body.court_room : existing.court_room,
    judge_name: body.judge_name !== undefined ? body.judge_name : existing.judge_name,
    is_court_event: isCourtRelated,
    create_task: body.create_task !== undefined ? body.create_task === true : existing.create_task,
    busy_status: body.busy_status !== undefined ? body.busy_status : existing.busy_status,
    recurrence_rule: body.recurrence_rule !== undefined ? body.recurrence_rule : existing.recurrence_rule,
    categories: body.categories !== undefined ? (body.categories ? (typeof body.categories === 'string' ? JSON.parse(body.categories) : body.categories) : null) : existing.categories,
    location: body.location !== undefined ? body.location : existing.location,
    is_all_day: body.is_all_day !== undefined ? (body.is_all_day === true || body.is_all_day === 'true') : existing.is_all_day,
    timezone: body.timezone !== undefined ? body.timezone : existing.timezone,
    attachments: body.attachments !== undefined ? (body.attachments ? (typeof body.attachments === 'string' ? JSON.parse(body.attachments) : body.attachments) : null) : existing.attachments,
    importance: body.importance !== undefined ? body.importance : existing.importance
  };

  if (body.attendees !== undefined) {
    await prisma.eventAttendee.deleteMany({ where: { event_id: eventId } });
    if (body.attendees && body.attendees.length > 0) {
      eventData.attendees = {
        create: body.attendees.map(a => ({
          user_id: a.user_id ? Number(a.user_id) : null,
          email: a.email || null,
          status: 'pending',
          is_optional: a.is_optional === true || a.is_optional === 'true'
        }))
      };
    }
  }

  const updatedEvent = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: eventData,
    include: { attendees: { include: { user: { select: { full_name: true, email: true } } } } }
  });

  const outlookService = require('./outlook.service');
  if (updatedEvent.outlook_event_id) {
    await outlookService.updateEvent(userId, updatedEvent);
  } else {
    await outlookService.createEvent(userId, updatedEvent);
  }

  return updatedEvent;
};

exports.deleteEvent = async (userId, id) => {
  const eventId = parseInt(id, 10);
  const existing = await prisma.calendarEvent.findUnique({
    where: { id: eventId }
  });
  if (!existing) throw new Error('Event not found');

  const outlookService = require('./outlook.service');
  if (existing.outlook_event_id) {
    await outlookService.deleteEvent(userId, existing.outlook_event_id);
  }

  await prisma.calendarEvent.delete({
    where: { id: eventId }
  });
};

exports.getAllCategories = async (query = {}) => {
  const includeInactive = query.include_inactive === 'true' || query.include_inactive === true;
  const where = includeInactive ? {} : { is_active: true };

  let categories = await prisma.calendarCategory.findMany({
    where,
    orderBy: [
      { sort_order: 'asc' },
      { name: 'asc' }
    ]
  });

  if (categories.length === 0 && !includeInactive) {
    const defaults = [
      { name: 'Hearing', color: '#ef4444', sort_order: 1 },
      { name: 'Meeting', color: '#10b981', sort_order: 2 },
      { name: 'Deadline', color: '#f59e0b', sort_order: 3 },
      { name: 'Consultation', color: '#38bdf8', sort_order: 4 },
      { name: 'Case Review', color: '#8b5cf6', sort_order: 5 },
      { name: 'Personal', color: '#ec4899', sort_order: 6 }
    ];
    await prisma.calendarCategory.createMany({
      data: defaults
    });
    categories = await prisma.calendarCategory.findMany({
      where,
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' }
      ]
    });
  }
  return categories;
};

exports.createCategory = async (data) => {
  if (!data.name?.trim()) throw new Error('Category name is required');
  if (!data.color?.trim()) throw new Error('Category color is required');
  
  return await prisma.calendarCategory.create({
    data: {
      name: data.name.trim(),
      color: data.color.trim(),
      is_active: data.is_active !== undefined ? !!data.is_active : true,
      sort_order: data.sort_order !== undefined ? parseInt(data.sort_order, 10) : 0
    }
  });
};

exports.updateCategory = async (id, data) => {
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.color !== undefined) updateData.color = data.color.trim();
  if (data.is_active !== undefined) updateData.is_active = !!data.is_active;
  if (data.sort_order !== undefined) updateData.sort_order = parseInt(data.sort_order, 10);

  return await prisma.calendarCategory.update({
    where: { id: parseInt(id, 10) },
    data: updateData
  });
};

exports.deleteCategory = async (id) => {
  return await prisma.calendarCategory.delete({
    where: { id: parseInt(id, 10) }
  });
};
