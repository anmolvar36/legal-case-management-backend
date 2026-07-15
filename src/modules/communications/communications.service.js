const prisma = require('../../config/db');
const notificationsService = require('../notifications/notifications.service');

const communicationScope = (user) => {
  if (!user || user.role === 'admin') return {};
  if (user.role === 'lawyer') {
    return { 
      matter: { assigned_lawyer_id: user.id } 
    };
  }
  if (user.role === 'client') {
    return {
      matter: {
        OR: [
          { client: { user_id: user.id } },
          { parties: { some: { user_id: user.id } } }
        ]
      },
      visibility: { in: ['client_visible', 'client_shared'] },
    };
  }
  return { id: -1 }; // Should not happen with proper auth
};

const getAll = async (query, user) => {
  const { matter_id, activity_id, visibility, communication_type, page = 1, limit = 100 } = query;
  const take = parseInt(limit);
  const skip = (parseInt(page) - 1) * take;

  const where = { ...communicationScope(user), parent_id: null };
  if (matter_id) where.matter_id = parseInt(matter_id);
  if (activity_id) where.activity_id = parseInt(activity_id);
  if (visibility) where.visibility = visibility;
  if (communication_type) where.communication_type = communication_type;

  return await prisma.communication.findMany({
    where,
    skip,
    take,
    include: {
      sender: { select: { id: true, full_name: true, role: true } },
      matter: { select: { id: true, matter_number: true, title: true } },
      _count: { select: { replies: true } }
    },
    orderBy: { created_at: 'desc' },
  });
};

const getThread = async (threadId, user) => {
  const parent = await getById(threadId, user);
  if (!parent) throw new Error('Thread not found');

  const replies = await prisma.communication.findMany({
    where: { parent_id: parent.id, ...communicationScope(user) },
    include: {
      sender: { select: { id: true, full_name: true, role: true } }
    },
    orderBy: { created_at: 'asc' }
  });

  return { ...parent, replies };
};

const replyToThread = async (data, user) => {
  const { parent_id, message_body } = data;
  if (!parent_id || !message_body) throw new Error('parent_id and message_body are required');

  const parent = await getById(parent_id, user);
  if (!parent) throw new Error('Parent thread not found');

  // Inherit matter and visibility from parent thread
  const replyData = {
    matter_id: parent.matter_id,
    parent_id: parent.id,
    message_body,
    visibility: parent.visibility,
    communication_type: parent.communication_type,
    sender_user_id: user.id,
    sender_role: user.role
  };

  const reply = await prisma.communication.create({ data: replyData });

  // Update parent thread's updated_at so it bubbles up
  await prisma.communication.update({
    where: { id: parent.id },
    data: { updated_at: new Date() }
  });

  // Notify recipient
  const matter = await prisma.matter.findUnique({
    where: { id: parent.matter_id }
  });

  if (user?.role === 'client') {
    const recipientId = matter.assigned_lawyer_id;
    if (recipientId && recipientId !== user.id) {
      await notificationsService.createNotification({
        user_id: recipientId,
        title: 'New Reply Received',
        message: `${user.full_name} replied to a message in matter ${matter.matter_number}.`,
        type: 'system',
        reference_id: parent.matter_id
      });
    }
  } else {
    // If lawyer/admin replies, and the thread is client_visible, notify all clients
    if (parent.visibility === 'client_visible' || parent.visibility === 'client_shared') {
      const clients = await prisma.client.findMany({
        where: {
          OR: [
            { id: matter.client_id },
            { matter_parties: { some: { id: parent.matter_id } } }
          ],
          user_id: { not: null }
        },
        select: { user_id: true }
      });
      for (const c of clients) {
        if (c.user_id && c.user_id !== user.id) {
          await notificationsService.createNotification({
            user_id: c.user_id,
            title: 'New Reply Received',
            message: `${user.full_name} replied to a message in matter ${matter.matter_number}.`,
            type: 'system',
            reference_id: parent.matter_id
          });
        }
      }
    }
  }

  return reply;
};

const getById = async (id, user) => {
  const comm = await prisma.communication.findUnique({
    where: { id: parseInt(id) },
    include: {
      sender: { select: { id: true, full_name: true, role: true } },
      matter: { select: { id: true, title: true } }
    }
  });
  if (!comm) return null;
  if (comm.matter_id && user?.role === 'lawyer') {
    const ok = await prisma.matter.count({ where: { id: comm.matter_id, assigned_lawyer_id: user.id } });
    if (!ok) {
      const err = new Error('Not authorized to access this communication');
      err.statusCode = 403;
      throw err;
    }
  }
  if (comm.matter_id && user?.role === 'client') {
    const ok = await prisma.matter.count({
      where: {
        id: comm.matter_id,
        OR: [
          { client: { user_id: user.id } },
          { parties: { some: { user_id: user.id } } }
        ]
      }
    });
    if (!ok || (comm.visibility !== 'client_visible' && comm.visibility !== 'client_shared')) {
      const err = new Error('Not authorized to access this communication');
      err.statusCode = 403;
      throw err;
    }
  }
  return comm;
};

const create = async (data, user) => {
  if (data.matter_id && user?.role === 'lawyer') {
    const allowed = await prisma.matter.count({
      where: { id: parseInt(data.matter_id), assigned_lawyer_id: user.id },
    });
    if (!allowed) {
      const err = new Error('Not authorized to create communication for this matter');
      err.statusCode = 403;
      throw err;
    }
  }
  if (data.matter_id && user?.role === 'client') {
    const allowed = await prisma.matter.count({
      where: {
        id: parseInt(data.matter_id),
        OR: [
          { client: { user_id: user.id } },
          { parties: { some: { user_id: user.id } } }
        ]
      },
    });
    if (!allowed) {
      const err = new Error('Not authorized to message on this matter');
      err.statusCode = 403;
      throw err;
    }
    // Clients always create client_visible portal messages by default if not specified
    if (!data.visibility) data.visibility = 'client_visible';
    if (!data.communication_type) data.communication_type = 'portal_message';
  }

  // Ensure consistent types
  if (data.matter_id) data.matter_id = parseInt(data.matter_id);
  if (data.activity_id) data.activity_id = parseInt(data.activity_id);
  
  // Set sender from session
  data.sender_user_id = user.id;
  data.sender_role = user.role;

  const request_read_receipt = data.request_read_receipt === true || data.request_read_receipt === 'true';
  const track_opens = data.track_opens === true || data.track_opens === 'true';
  data.request_read_receipt = request_read_receipt;
  data.track_opens = track_opens;

  if (Array.isArray(data.to)) data.to = data.to.join(', ') || null;
  if (Array.isArray(data.cc)) data.cc = data.cc.join(', ') || null;
  if (Array.isArray(data.bcc)) data.bcc = data.bcc.join(', ') || null;

  let message = await prisma.communication.create({ data });

  if (message.track_opens) {
    const trackingUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/communications/track/${message.id}`;
    const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" />`;
    message = await prisma.communication.update({
      where: { id: message.id },
      data: {
        message_body: `${message.message_body}\n${trackingPixel}`
      }
    });
  }
  
  // Log activity with descriptive text
  const typeLabel = (message.communication_type || 'communication').replace(/_/g, ' ');
  await prisma.activity.create({
    data: {
      matter_id: message.matter_id,
      entity_type: 'communication',
      entity_id: message.id,
      action: 'created',
      description: `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} logged by ${user.full_name} (${user.role})`,
      actor_user_id: user.id
    }
  });

  // Notify recipient
  let matter = null;
  if (message.matter_id) {
    matter = await prisma.matter.findUnique({
      where: { id: message.matter_id }
    });
  }

  if (matter && user?.role === 'client') {
    const recipientId = matter.assigned_lawyer_id;
    if (recipientId) {
      await notificationsService.createNotification({
        user_id: recipientId,
        title: 'New Message Received',
        message: `${user.full_name} sent you a message regarding matter ${matter.matter_number}.`,
        type: 'system',
        reference_id: message.matter_id
      });
    }
  } else if (matter) {
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { id: matter.client_id },
          { matter_parties: { some: { id: message.matter_id } } }
        ],
        user_id: { not: null }
      },
      select: { user_id: true }
    });
    for (const c of clients) {
      if (c.user_id && c.user_id !== user.id) {
        await notificationsService.createNotification({
          user_id: c.user_id,
          title: 'New Message Received',
          message: `${user.full_name} sent you a message regarding matter ${matter.matter_number}.`,
          type: 'system',
          reference_id: message.matter_id
        });
      }
    }
  }

  return message;
};

const update = async (id, data, user) => {
  const existing = await prisma.communication.findUnique({ where: { id: parseInt(id, 10) } });
  if (!existing) {
    const err = new Error('Communication not found');
    err.statusCode = 404;
    throw err;
  }
  if (user?.role === 'lawyer') {
    const allowed = await prisma.matter.count({
      where: { id: existing.matter_id, assigned_lawyer_id: user.id },
    });
    if (!allowed) {
      const err = new Error('Not authorized to update this communication');
      err.statusCode = 403;
      throw err;
    }
  }
  if (user?.role === 'client') {
    const err = new Error('Client cannot update communications');
    err.statusCode = 403;
    throw err;
  }
  return await prisma.communication.update({
    where: { id: parseInt(id) },
    data,
  });
};

const remove = async (id, user) => {
  if (user?.role !== 'admin') {
    const err = new Error('Only admin can delete communications');
    err.statusCode = 403;
    throw err;
  }
  return await prisma.communication.delete({ where: { id: parseInt(id) } });
};

const markRead = async (id, user) => {
  const comm = await getById(id, user);
  if (!comm) throw new Error('Communication not found');
  
  return await prisma.communication.update({
    where: { id: comm.id },
    data: { 
      is_read: true,
      read_at: new Date()
    }
  });
};

const markMatterRead = async (matterId, user) => {
  const mid = parseInt(matterId);
  const where = {
    matter_id: mid,
    is_read: false,
    ...communicationScope(user)
  };

  // Optimization: If Admin/Lawyer, they are marking messages from CLIENTS as read.
  // If Client, they are marking messages from STAFF as read.
  if (user.role === 'client') {
    where.sender_role = { not: 'client' };
  } else {
    where.sender_role = 'client';
  }

  const unreadCount = await prisma.communication.count({ where });
  console.log("Marking as read for matter:", mid);
  console.log("Unread before:", unreadCount);

  return await prisma.communication.updateMany({
    where,
    data: {
      is_read: true,
      read_at: new Date()
    }
  });
};


const registerOpen = async (id) => {
  const comm = await prisma.communication.findUnique({ where: { id } });
  if (comm && comm.track_opens) {
    await prisma.communication.update({
      where: { id },
      data: {
        opened: true,
        opened_time: comm.opened_time || new Date(),
        open_count: { increment: 1 }
      }
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  markRead,
  markMatterRead,
  getThread,
  replyToThread,
  registerOpen,
};