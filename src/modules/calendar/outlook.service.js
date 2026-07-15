const axios = require('axios');
const prisma = require('../../config/db');

const MS_CLIENT_ID = process.env.MS_CLIENT_ID || 'dummy-client-id';
const MS_CLIENT_SECRET = process.env.MS_CLIENT_SECRET || 'dummy-client-secret';
const MS_REDIRECT_URI = process.env.MS_REDIRECT_URI || 'http://localhost:5000/api/calendar/outlook/callback';
const SCOPES = 'offline_access User.Read Calendars.ReadWrite';

class OutlookService {
  isConfigured() {
    return MS_CLIENT_ID !== 'dummy-client-id' && MS_CLIENT_SECRET !== 'dummy-client-secret' && MS_CLIENT_ID !== '' && MS_CLIENT_SECRET !== '';
  }

  getAuthUrl(userId) {
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${MS_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(MS_REDIRECT_URI)}&response_mode=query&scope=${encodeURIComponent(SCOPES)}&state=${state}`;
  }

  async handleCallback(code, userId) {
    try {
      const params = new URLSearchParams();
      params.append('client_id', MS_CLIENT_ID);
      params.append('client_secret', MS_CLIENT_SECRET);
      params.append('code', code);
      params.append('redirect_uri', MS_REDIRECT_URI);
      params.append('grant_type', 'authorization_code');
      params.append('scope', SCOPES);

      const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token, refresh_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      await prisma.user.update({
        where: { id: userId },
        data: {
          outlook_token: access_token,
          outlook_refresh_token: refresh_token,
          outlook_token_expires: expiresAt
        }
      });

      console.log(`[Outlook Auth] User ${userId} successfully connected to Microsoft Calendar.`);
      return true;
    } catch (err) {
      console.error(`[Outlook Auth Error] Failed user callback:`, err.response?.data || err.message);
      throw new Error('Failed to authenticate with Microsoft Graph API');
    }
  }

  async disconnect(userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        outlook_token: null,
        outlook_refresh_token: null,
        outlook_token_expires: null
      }
    });
    console.log(`[Outlook Auth] User ${userId} disconnected from Outlook Calendar.`);
  }

  async getAccessToken(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { outlook_token: true, outlook_refresh_token: true, outlook_token_expires: true }
    });

    if (!user || !user.outlook_refresh_token) {
      return null;
    }

    // Refresh if expired or close to expiration (within 60 seconds)
    if (!user.outlook_token || !user.outlook_token_expires || new Date(user.outlook_token_expires).getTime() - Date.now() < 60000) {
      try {
        console.log(`[Outlook Auth] Refreshing access token for user ${userId}...`);
        const params = new URLSearchParams();
        params.append('client_id', MS_CLIENT_ID);
        params.append('client_secret', MS_CLIENT_SECRET);
        params.append('refresh_token', user.outlook_refresh_token);
        params.append('grant_type', 'refresh_token');
        params.append('scope', SCOPES);

        const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token, refresh_token, expires_in } = response.data;
        const expiresAt = new Date(Date.now() + expires_in * 1000);

        await prisma.user.update({
          where: { id: userId },
          data: {
            outlook_token: access_token,
            outlook_refresh_token: refresh_token || user.outlook_refresh_token, // Refresh token might not be returned
            outlook_token_expires: expiresAt
          }
        });

        return access_token;
      } catch (err) {
        console.error(`[Outlook Token Refresh Error] User ${userId}:`, err.response?.data || err.message);
        // Clear tokens if token is invalid/revoked
        if (err.response?.status === 400) {
          await this.disconnect(userId);
        }
        return null;
      }
    }

    return user.outlook_token;
  }

  mapToGraphEvent(event) {
    const startIso = event.event_date.toISOString();
    // Default duration: 1 hour if end_date not specified
    const endIso = event.end_date ? event.end_date.toISOString() : new Date(event.event_date.getTime() + 60 * 60 * 1000).toISOString();

    const attendees = [];
    if (event.attendees && event.attendees.length > 0) {
      event.attendees.forEach(att => {
        const email = att.email || att.user?.email;
        if (email) {
          attendees.push({
            emailAddress: {
              address: email,
              name: att.user?.full_name || ''
            },
            type: att.is_optional ? 'optional' : 'required'
          });
        }
      });
    }

    const payload = {
      subject: event.title,
      body: {
        contentType: 'html',
        content: event.description || ''
      },
      start: {
        dateTime: startIso,
        timeZone: event.timezone || 'UTC'
      },
      end: {
        dateTime: endIso,
        timeZone: event.timezone || 'UTC'
      },
      location: {
        displayName: event.location || ''
      },
      attendees,
      isAllDay: event.is_all_day || false,
      showAs: event.busy_status || 'busy',
      importance: event.importance || 'normal'
    };

    if (event.is_online_meeting) {
      payload.isOnlineMeeting = true;
      payload.onlineMeetingProvider = 'teamsForBusiness';
    }

    // Reminder
    if (event.reminder_date) {
      const diffMs = event.event_date.getTime() - new Date(event.reminder_date).getTime();
      const diffMins = Math.max(0, Math.floor(diffMs / (60 * 1000)));
      payload.isReminderOn = true;
      payload.reminderMinutesBeforeStart = diffMins;
    } else {
      payload.isReminderOn = false;
    }

    // Recurrence
    if (event.recurrence_rule) {
      try {
        const rule = JSON.parse(event.recurrence_rule);
        if (rule && rule.pattern) {
          payload.recurrence = rule;
        }
      } catch (e) {
        console.error('Error parsing recurrence rule:', e.message);
      }
    }

    return payload;
  }

  async createEvent(userId, event) {
    const token = await this.getAccessToken(userId);
    if (!token) return null;

    try {
      console.log(`[Outlook Sync] Creating event ${event.id} in Outlook...`);
      const payload = this.mapToGraphEvent(event);

      const response = await axios.post('https://graph.microsoft.com/v1.0/me/events', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const outlookEventId = response.data.id;
      const outlookSeriesId = response.data.seriesMasterId || null;

      await prisma.calendarEvent.update({
        where: { id: event.id },
        data: {
          outlook_event_id: outlookEventId,
          outlook_series_id: outlookSeriesId
        }
      });

      console.log(`[Outlook Sync] Successfully created event ${event.id} -> Outlook ID: ${outlookEventId}`);
      return outlookEventId;
    } catch (err) {
      console.error(`[Outlook Sync Error] Create failed:`, err.response?.data || err.message);
      return null;
    }
  }

  async updateEvent(userId, event) {
    if (!event.outlook_event_id) return null;
    const token = await this.getAccessToken(userId);
    if (!token) return null;

    try {
      console.log(`[Outlook Sync] Updating event ${event.id} in Outlook (ID: ${event.outlook_event_id})...`);
      const payload = this.mapToGraphEvent(event);

      // If it is a series modification or recurring master update
      const response = await axios.patch(`https://graph.microsoft.com/v1.0/me/events/${event.outlook_event_id}`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`[Outlook Sync] Successfully updated event ${event.id} in Outlook.`);
      return response.data.id;
    } catch (err) {
      console.error(`[Outlook Sync Error] Update failed:`, err.response?.data || err.message);
      return null;
    }
  }

  async deleteEvent(userId, outlookEventId) {
    if (!outlookEventId) return;
    const token = await this.getAccessToken(userId);
    if (!token) return;

    try {
      console.log(`[Outlook Sync] Deleting event from Outlook (ID: ${outlookEventId})...`);
      await axios.delete(`https://graph.microsoft.com/v1.0/me/events/${outlookEventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`[Outlook Sync] Successfully deleted event from Outlook.`);
    } catch (err) {
      // If event doesn't exist on Outlook anymore, ignore
      if (err.response?.status === 404) {
        console.log(`[Outlook Sync] Event already deleted on Outlook.`);
        return;
      }
      console.error(`[Outlook Sync Error] Delete failed:`, err.response?.data || err.message);
    }
  }

  // Poll Graph API for changes since last sync window
  async pullChanges(userId) {
    const token = await this.getAccessToken(userId);
    if (!token) return;

    try {
      console.log(`[Outlook Sync] Pulling calendar changes from Outlook for User ${userId}...`);
      
      const now = new Date();
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const future = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days future

      const startIso = past.toISOString();
      const endIso = future.toISOString();

      // Fetch events from Outlook calendar within window
      const response = await axios.get(`https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startIso}&endDateTime=${endIso}&$top=200`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const outlookEvents = response.data.value || [];
      console.log(`[Outlook Sync] Found ${outlookEvents.length} events in Outlook for User ${userId}. Reconciling...`);

      for (const oEv of outlookEvents) {
        // Skip events created by our app that are already tagged
        const localMatch = await prisma.calendarEvent.findFirst({
          where: {
            OR: [
              { outlook_event_id: oEv.id },
              { title: oEv.subject, event_date: new Date(oEv.start.dateTime) }
            ]
          }
        });

        const eventData = {
          title: oEv.subject || 'Outlook Event',
          event_date: new Date(oEv.start.dateTime),
          end_date: oEv.end?.dateTime ? new Date(oEv.end.dateTime) : null,
          description: oEv.body?.content || null,
          location: oEv.location?.displayName || null,
          outlook_event_id: oEv.id,
          outlook_series_id: oEv.seriesMasterId || null,
          is_all_day: oEv.isAllDay || false,
          busy_status: oEv.showAs || 'busy',
          type: 'general',
          created_by: userId
        };

        if (localMatch) {
          // If we matched by title/date but don't have outlook_event_id, update it
          if (!localMatch.outlook_event_id) {
            await prisma.calendarEvent.update({
              where: { id: localMatch.id },
              data: { outlook_event_id: oEv.id, outlook_series_id: oEv.seriesMasterId }
            });
          } else {
            // Update local event if Outlook is newer
            // (Note: To avoid loops, we can compare last modified dates, or just update if description/location has changed)
            const oLastMod = new Date(oEv.lastModifiedDateTime || now);
            const localLastMod = new Date(localMatch.created_at); // fallback
            if (oLastMod.getTime() > localLastMod.getTime() + 10000) {
              await prisma.calendarEvent.update({
                where: { id: localMatch.id },
                data: {
                  title: eventData.title,
                  event_date: eventData.event_date,
                  end_date: eventData.end_date,
                  description: eventData.description,
                  location: eventData.location,
                  is_all_day: eventData.is_all_day,
                  busy_status: eventData.busy_status
                }
              });
            }
          }
        } else {
          // Create new local event
          const created = await prisma.calendarEvent.create({
            data: eventData
          });

          // Insert attendees
          if (oEv.attendees && oEv.attendees.length > 0) {
            for (const att of oEv.attendees) {
              const email = att.emailAddress?.address;
              if (email) {
                // Find user locally
                const matchingUser = await prisma.user.findUnique({ where: { email } });
                await prisma.eventAttendee.create({
                  data: {
                    event_id: created.id,
                    user_id: matchingUser ? matchingUser.id : null,
                    email: matchingUser ? null : email,
                    status: att.status?.response || 'pending',
                    is_optional: att.type === 'optional'
                  }
                });
              }
            }
          }
          console.log(`[Outlook Sync] Synthesized local event: ${created.title} from Outlook.`);
        }
      }
    } catch (err) {
      console.error(`[Outlook Sync Error] Pull failed for user ${userId}:`, err.response?.data || err.message);
    }
  }
}

module.exports = new OutlookService();
