const prisma = require('../../config/db');

/**
 * Fetch latest notifications for a user.
 * @param {number} userId - The ID of the authenticated user.
 * @param {number} limit - Number of notifications to fetch.
 */
exports.getNotifications = async (userId, limit = 20) => {
  return await prisma.notification.findMany({
    where: { user_id: userId },
    take: limit,
    orderBy: { created_at: 'desc' },
  });
};

/**
 * Mark a specific notification as read.
 */
exports.markAsRead = async (notificationId, userId) => {
  return await prisma.notification.update({
    where: { 
      id: parseInt(notificationId),
      user_id: userId 
    },
    data: { is_read: true },
  });
};

/**
 * Mark all notifications for a user as read.
 */
exports.markAllAsRead = async (userId) => {
  return await prisma.notification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true },
  });
};

/**
 * Get unread notification count.
 */
exports.getUnreadCount = async (userId) => {
  const count = await prisma.notification.count({
    where: { user_id: userId, is_read: false },
  });
  return { unread_count: count };
};

/**
 * Delete all notifications for a user.
 */
exports.deleteAllNotifications = async (userId) => {
  return await prisma.notification.deleteMany({
    where: { user_id: userId },
  });
};

/**
 * Delete a specific notification.
 */
exports.deleteNotification = async (notificationId, userId) => {
  return await prisma.notification.delete({
    where: { 
      id: parseInt(notificationId),
      user_id: userId 
    },
  });
};

/**
 * Internal helper to create notifications from system events.
 */
exports.createNotification = async (data) => {
  try {
    return await prisma.notification.create({ data });
  } catch (err) {
    console.error('Failed to create notification:', err);
    return null;
  }
};
