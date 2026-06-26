const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find admin user
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true, email: true, full_name: true, role: true }
  });
  console.log('Admin user:', JSON.stringify(admin));

  // Show calendar_events schema by counting
  const total = await prisma.calendarEvent.count();
  const courtEvents = await prisma.calendarEvent.count({ where: { is_court_event: true } });
  const filingDeadlines = await prisma.calendarEvent.count({ where: { type: 'filing_deadline' } });
  const hearings = await prisma.calendarEvent.count({ where: { type: 'hearing' } });
  
  console.log('\nCalendar Event Counts:');
  console.log('  Total events:', total);
  console.log('  Court events (is_court_event=true):', courtEvents);
  console.log('  Filing deadlines:', filingDeadlines);
  console.log('  Hearings:', hearings);

  // List some court events
  const sample = await prisma.calendarEvent.findMany({
    take: 5,
    where: { is_court_event: true },
    select: {
      id: true,
      title: true,
      type: true,
      appearance_type: true,
      court_name: true,
      court_room: true,
      judge_name: true,
      is_court_event: true,
      reminder_sent_7d: true,
      reminder_sent_3d: true,
      reminder_sent_1d: true,
      reminder_sent_same_day: true,
      event_date: true
    }
  });
  console.log('\nSample Court Events:');
  console.log(JSON.stringify(sample, null, 2));

  // Check tasks auto-generated for court events
  const courtTasks = await prisma.task.findMany({
    where: {
      title: { startsWith: 'Prepare' },
      priority: 'high'
    },
    select: {
      id: true,
      title: true,
      priority: true,
      status: true,
      task_type: true,
      matter_id: true,
      due_date: true
    },
    take: 10
  });
  console.log('\nAuto-generated High Priority Court Tasks:');
  console.log(JSON.stringify(courtTasks, null, 2));

  // Notifications for court events
  const courtNotifications = await prisma.notification.findMany({
    where: {
      OR: [
        { type: 'court_appearance' },
        { type: 'filing_deadline' },
        { type: 'deadline' },
        { title: { contains: 'Court' } },
        { title: { contains: 'court' } }
      ]
    },
    take: 10,
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      title: true,
      message: true,
      type: true,
      created_at: true
    }
  });
  console.log('\nCourt-related Notifications:');
  console.log(JSON.stringify(courtNotifications, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
