const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const notificationsService = require('../notifications/notifications.service');

exports.getAllEvents = async () => {
  const events = [];

  // 1. Invoice due
  const invoices = await prisma.invoice.findMany({
    where: { due_date: { not: null } },
    select: { id: true, invoice_number: true, amount: true, due_date: true, status: true, description: true }
  });

  invoices.forEach(i => {
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
    select: { id: true, title: true, created_at: true, matter_number: true, description: true }
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
      matter: { select: { matter_number: true, title: true } }
    }
  });

  custom.forEach(e => {
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
      is_court_event: e.is_court_event || e.court_related || false
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

  const event = await prisma.calendarEvent.create({
    data: {
      title: body.title,
      event_date: eventDate,
      end_date: body.end_date ? new Date(body.end_date) : null,
      reminder_date: body.reminder_date ? new Date(body.reminder_date) : null,
      event_status: body.event_status || 'scheduled',
      court_related: isCourtRelated,
      matter_id: body.matter_id ? Number(body.matter_id) : null,
      type: type,
      description: body.description || null,
      created_by: userId,
      appearance_type: body.appearance_type || null,
      court_name: body.court_name || null,
      court_room: body.court_room || null,
      judge_name: body.judge_name || null,
      is_court_event: isCourtRelated
    }
  });

  // Task generation for court-related events (Hearing, Trial, Filing Deadline)
  if (isCourtRelated) {
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

  // Titan Sync (Async & Non-blocking)
  const titanCalendarService = require('../settings/titan-calendar.service');
  titanCalendarService.syncEvent(event);

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
          create_task: true
        });
      }
    }
  }
};
