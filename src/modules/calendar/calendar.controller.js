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
