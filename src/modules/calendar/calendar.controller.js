const calendarService = require('./calendar.service');

exports.getEvents = async (req, res, next) => {
  try {
    const data = await calendarService.getAllEvents();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

exports.addEvent = async (req, res, next) => {
  try {
    const data = await calendarService.createEvent(req.user.id, req.body);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

exports.acknowledgeEvent = async (req, res, next) => {
  try {
    const data = await calendarService.acknowledgeEvent(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const outlookService = require('./outlook.service');
const prisma = require('../../config/db');

exports.connectOutlook = (req, res, next) => {
  try {
    const authUrl = outlookService.getAuthUrl(req.user.id);
    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
};

exports.callbackOutlook = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).send('Missing code or state');
    }

    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    await outlookService.handleCallback(code, parseInt(userId, 10));

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/admin/settings?tab=Integrations`);
  } catch (error) {
    console.error('Error during Outlook OAuth callback:', error.message);
    res.status(500).send('Authentication failed: ' + error.message);
  }
};

exports.disconnectOutlook = async (req, res, next) => {
  try {
    await outlookService.disconnect(req.user.id);
    res.status(200).json({ success: true, message: 'Outlook Calendar disconnected successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getStatusOutlook = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { outlook_refresh_token: true }
    });
    const connected = !!user?.outlook_refresh_token;
    const configured = outlookService.isConfigured();
    res.status(200).json({ success: true, connected, configured });
  } catch (error) {
    next(error);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const data = await calendarService.updateEvent(req.user.id, req.params.id, req.body);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    await calendarService.deleteEvent(req.user.id, req.params.id);
    res.status(200).json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const data = await calendarService.getAllCategories(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const data = await calendarService.createCategory(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const data = await calendarService.updateCategory(req.params.id, req.body);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    await calendarService.deleteCategory(req.params.id);
    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};
