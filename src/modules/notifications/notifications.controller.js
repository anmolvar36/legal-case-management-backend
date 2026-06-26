const service = require('./notifications.service');
const { sendResponse } = require('../../utils/response');

exports.getNotifications = async (req, res, next) => {
  try {
    const data = await service.getNotifications(req.user.id);
    res.status(200).json(sendResponse(true, 'Notifications fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const data = await service.markAsRead(req.params.id, req.user.id);
    res.status(200).json(sendResponse(true, 'Notification marked as read', data));
  } catch (err) {
    next(err);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await service.markAllAsRead(req.user.id);
    res.status(200).json(sendResponse(true, 'All notifications marked as read'));
  } catch (err) {
    next(err);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const data = await service.getUnreadCount(req.user.id);
    res.status(200).json(sendResponse(true, 'Unread count fetched successfully', data));
  } catch (err) {
    next(err);
  }
};
exports.deleteAllNotifications = async (req, res, next) => {
  try {
    await service.deleteAllNotifications(req.user.id);
    res.status(200).json(sendResponse(true, 'All notifications cleared'));
  } catch (err) {
    next(err);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    await service.deleteNotification(req.params.id, req.user.id);
    res.status(200).json(sendResponse(true, 'Notification deleted'));
  } catch (err) {
    next(err);
  }
};
