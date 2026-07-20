const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const notificationsService = require('../notifications/notifications.service');

// Run every hour
cron.schedule('0 * * * *', async () => {
  await exports.checkReminders();
});

// Run every 5 minutes to pull outlook changes
cron.schedule('*/5 * * * *', async () => {
  await exports.syncOutlookCalendar();
});

exports.syncOutlookCalendar = async () => {
  try {
//     console.log('[Calendar Cron] Running Outlook Calendar synchronization...');
    const outlookService = require('./outlook.service');
    
    const connectedUsers = await prisma.user.findMany({
      where: {
        outlook_refresh_token: { not: null }
      },
      select: { id: true }
    });

//     console.log(`[Calendar Cron] Found ${connectedUsers.length} users with active Outlook integration.`);
    for (const user of connectedUsers) {
      await outlookService.pullChanges(user.id);
    }
  } catch (error) {
    console.error('[Calendar Cron Error] Outlook sync failed:', error.message);
  }
};

exports.checkReminders = async () => {
  try {
//     console.log('[Calendar Cron] Running court event reminder check...');
    const now = new Date();

    // Fetch all admins
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'admin' },
          { roles: { some: { role: 'admin' } } }
        ]
      },
      select: { id: true }
    });
    const adminIds = admins.map(a => a.id);

    // Find upcoming court related events that haven't been completed/cancelled
    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: {
        is_court_event: true,
        event_status: { notIn: ['completed', 'cancelled'] },
        event_date: { gte: now }
      },
      include: {
        matter: { select: { assigned_lawyer_id: true, matter_number: true } }
      }
    });

    for (const event of upcomingEvents) {
      const diffMs = event.event_date.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      let triggerReminder = false;
      let reminderTypeLabel = '';
      let updateField = '';

      if (diffDays <= 7 && diffDays > 3 && !event.reminder_sent_7d) {
        triggerReminder = true;
        reminderTypeLabel = '7 days';
        updateField = 'reminder_sent_7d';
      } else if (diffDays <= 3 && diffDays > 1 && !event.reminder_sent_3d) {
        triggerReminder = true;
        reminderTypeLabel = '3 days';
        updateField = 'reminder_sent_3d';
      } else if (diffDays <= 1 && diffDays > 0.04 && !event.reminder_sent_1d) {
        triggerReminder = true;
        reminderTypeLabel = '1 day';
        updateField = 'reminder_sent_1d';
      } else if (diffDays <= 0.04 && diffDays >= -0.04 && !event.reminder_sent_same_day) {
        // Less than ~1 hour before or same day
        triggerReminder = true;
        reminderTypeLabel = 'Same day';
        updateField = 'reminder_sent_same_day';
      }

      if (triggerReminder) {
        // Define targets
        const targets = new Set(adminIds);
        if (event.matter?.assigned_lawyer_id) {
          targets.add(event.matter.assigned_lawyer_id);
        }

        const matterSuffix = event.matter?.matter_number ? ` for Matter ${event.matter.matter_number}` : '';
        const notifType = event.type === 'filing_deadline' ? 'filing_deadline' : 'court_appearance';
        
        let message = '';
        if (notifType === 'filing_deadline') {
          message = `Filing deadline "${event.title}" is due in ${reminderTypeLabel}${matterSuffix}`;
        } else {
          message = `Court appearance "${event.title}" is in ${reminderTypeLabel}${matterSuffix}`;
        }

        for (const userId of targets) {
          await notificationsService.createNotification({
            user_id: userId,
            title: `Court Alert: ${event.title}`,
            message,
            type: notifType,
            reference_id: event.matter_id
          });
        }

        await prisma.calendarEvent.update({
          where: { id: event.id },
          data: { [updateField]: true }
        });
      }
    }
  } catch (error) {
    console.error('[Calendar Cron] Error running check:', error.message);
  }
};
