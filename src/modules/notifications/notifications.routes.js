const express = require('express');
const router = express.Router();
const controller = require('./notifications.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.use(protect);

router.get('/', controller.getNotifications);
router.get('/unread-count', controller.getUnreadCount);
router.patch('/read-all', controller.markAllAsRead);
router.patch('/:id/read', controller.markAsRead);
router.delete('/', controller.deleteAllNotifications);
router.delete('/:id', controller.deleteNotification);

module.exports = router;
