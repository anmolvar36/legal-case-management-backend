const prisma = require('../../config/db');

/**
 * Mocks the Titan Calendar Sync integration.
 * In a real-world scenario, this would use Titan's CalDAV or REST API.
 */
class TitanCalendarService {
  async getSettings() {
    const email = await prisma.setting.findUnique({ where: { key: 'titan_email' } });
    const password = await prisma.setting.findUnique({ where: { key: 'titan_app_password' } });
    const enabled = await prisma.setting.findUnique({ where: { key: 'titan_sync_enabled' } });

    return {
      email: email?.value,
      password: password?.value,
      enabled: enabled?.value === 'true'
    };
  }

  async syncEvent(calendarEvent) {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled || !settings.email || !settings.password) {
        return; // Sync disabled or missing credentials
      }

      // ---------------------------------------------------------
      // ASYNC NON-BLOCKING EXECUTION
      // ---------------------------------------------------------
      // We purposefully don't await this long operation to prevent 
      // blocking the local database creation / event loop.
      setImmediate(async () => {
        try {
          console.log(`[Titan Sync] Syncing event ${calendarEvent.id} to Titan for ${settings.email}`);
          
          // MOCK TITAN API CALL:
          // const response = await axios.post('https://api.titan.email/calendar/v1/events', ...);
          
          // Simulate latency
          await new Promise(resolve => setTimeout(resolve, 500));

          const mockTitanEventId = `titan_evt_${calendarEvent.id}_${Date.now()}`;

          // Update local record with Titan ID
          await prisma.calendarEvent.update({
            where: { id: calendarEvent.id },
            data: { titan_event_id: mockTitanEventId }
          });

          console.log(`[Titan Sync] Successfully synced event ${calendarEvent.id} -> ${mockTitanEventId}`);
        } catch (syncError) {
          console.error(`[Titan Sync Error] Failed to sync event ${calendarEvent.id}:`, syncError.message);
          // Graceful handling: log error but do not crash system
        }
      });
      
    } catch (err) {
      console.error(`[Titan Sync Pre-Flight Error]`, err.message);
    }
  }

  async deleteEvent(titanEventId) {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled || !settings.email || !settings.password || !titanEventId) {
        return;
      }

      setImmediate(async () => {
        try {
          console.log(`[Titan Sync] Deleting event ${titanEventId} from Titan`);
          // MOCK API CALL to delete event
          await new Promise(resolve => setTimeout(resolve, 300));
          console.log(`[Titan Sync] Deleted event ${titanEventId}`);
        } catch (delError) {
          console.error(`[Titan Sync Error] Failed to delete event ${titanEventId}:`, delError.message);
        }
      });
    } catch (err) {
      console.error(`[Titan Sync Pre-Flight Error]`, err.message);
    }
  }
}

module.exports = new TitanCalendarService();
