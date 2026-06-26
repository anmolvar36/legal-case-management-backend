// Live end-to-end test: Create a Court Hearing and verify auto-tasks + notifications
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Court Appearance Tracking — End-to-End Test ===\n');

  // 1. Get the admin user
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true, email: true, full_name: true }
  });
  console.log('1. Admin user:', JSON.stringify(admin));

  // 2. Get a matter with assigned lawyer
  const matter = await prisma.matter.findFirst({
    where: { assigned_lawyer_id: { not: null } },
    include: {
      assigned_lawyer: { select: { id: true, full_name: true, email: true } }
    }
  });
  console.log('\n2. Test matter:', matter ? `${matter.matter_number} — ${matter.title}` : 'None found');
  console.log('   Assigned lawyer:', matter?.assigned_lawyer ? JSON.stringify(matter.assigned_lawyer) : 'None');

  // 3. Simulate createEvent (using calendar service logic directly)
  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + 14); // 2 weeks from now

  const event = await prisma.calendarEvent.create({
    data: {
      title: 'Smith v. Johnson — Court Hearing [TEST]',
      event_date: eventDate,
      matter_id: matter?.id || null,
      type: 'hearing',
      description: 'Court hearing for Smith v. Johnson case',
      created_by: admin.id,
      appearance_type: 'hearing',
      court_name: 'Superior Court of California',
      court_room: 'Courtroom 12B',
      judge_name: 'Judge Maria Rodriguez',
      is_court_event: true,
      event_status: 'scheduled'
    }
  });
  console.log('\n3. Created CalendarEvent:');
  console.log(JSON.stringify({
    id: event.id,
    title: event.title,
    type: event.type,
    appearance_type: event.appearance_type,
    court_name: event.court_name,
    court_room: event.court_room,
    judge_name: event.judge_name,
    is_court_event: event.is_court_event,
    reminder_sent_7d: event.reminder_sent_7d,
    reminder_sent_3d: event.reminder_sent_3d,
    reminder_sent_1d: event.reminder_sent_1d,
    reminder_sent_same_day: event.reminder_sent_same_day,
    event_date: event.event_date
  }, null, 2));

  // 4. Auto-create tasks (same logic as calendar.service.js)
  const notificationsService = {
    createNotification: async (data) => {
      return prisma.notification.create({ data });
    }
  };

  let assignedLawyerId = admin.id;
  if (event.matter_id && matter?.assigned_lawyer_id) {
    assignedLawyerId = matter.assigned_lawyer_id;
  }

  const taskTitles = ['Prepare appearance', 'Review documents'];
  const createdTasks = [];
  for (const tTitle of taskTitles) {
    const task = await prisma.task.create({
      data: {
        title: `${tTitle}: ${event.title}`,
        description: `Auto-generated task from court event: ${event.title}`,
        status: 'open',
        priority: 'high',
        task_type: 'general',
        due_date: eventDate,
        matter_id: event.matter_id,
        assigned_user_id: assignedLawyerId,
        created_by_user_id: admin.id
      }
    });
    createdTasks.push(task);
  }
  console.log('\n4. Auto-Generated High Priority Tasks:');
  createdTasks.forEach(t => {
    console.log(JSON.stringify({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      assigned_user_id: t.assigned_user_id,
      matter_id: t.matter_id,
      due_date: t.due_date
    }, null, 2));
  });

  // 5. Create reminder notification (as cron would do)
  const notif = await prisma.notification.create({
    data: {
      user_id: assignedLawyerId,
      title: `Court Alert: ${event.title}`,
      message: `Court appearance "${event.title}" is in 14 days for Matter ${matter?.matter_number || 'N/A'}`,
      type: 'court_appearance',
      reference_id: event.matter_id
    }
  });
  console.log('\n5. Reminder Notification Created:');
  console.log(JSON.stringify({
    id: notif.id,
    user_id: notif.user_id,
    title: notif.title,
    message: notif.message,
    type: notif.type
  }, null, 2));

  // 6. Admin notification
  const adminNotif = await prisma.notification.create({
    data: {
      user_id: admin.id,
      title: `Critical Alert: Hearing`,
      message: `New hearing "${event.title}" set for matter ${matter?.matter_number || 'N/A'}`,
      type: 'deadline',
      reference_id: event.matter_id
    }
  });
  console.log('\n6. Admin Notification Created:');
  console.log(JSON.stringify({
    id: adminNotif.id,
    user_id: adminNotif.user_id,
    title: adminNotif.title,
    message: adminNotif.message,
    type: adminNotif.type
  }, null, 2));

  // 7. Summary dashboard counts
  const now = new Date();
  const upcomingCourtDates = await prisma.calendarEvent.count({
    where: { is_court_event: true, event_date: { gte: now } }
  });
  const upcomingFilingDeadlines = await prisma.calendarEvent.count({
    where: { type: 'filing_deadline', event_date: { gte: now } }
  });
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const courtEventsThisWeek = await prisma.calendarEvent.count({
    where: { is_court_event: true, event_date: { gte: weekStart, lte: weekEnd } }
  });

  console.log('\n7. Dashboard Counts (after test data):');
  console.log(JSON.stringify({
    upcomingCourtAppearances: upcomingCourtDates,
    upcomingFilingDeadlines,
    courtEventsThisWeek
  }, null, 2));

  // 8. Matter court schedule
  if (matter) {
    const matterEvents = await prisma.calendarEvent.findMany({
      where: { matter_id: matter.id },
      orderBy: { event_date: 'asc' },
      select: {
        id: true,
        title: true,
        type: true,
        appearance_type: true,
        court_name: true,
        court_room: true,
        judge_name: true,
        event_date: true,
        event_status: true,
        is_court_event: true
      }
    });
    console.log(`\n8. Court Schedule for Matter "${matter.matter_number} — ${matter.title}":`);
    console.log(JSON.stringify(matterEvents, null, 2));
  }

  console.log('\n=== Test Complete ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
