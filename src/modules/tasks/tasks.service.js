const prisma = require('../../config/db');
const notificationsService = require('../notifications/notifications.service');

const taskScope = (user) => {
  if (!user || user.role === 'admin') return {};
  if (user.role === 'lawyer') {
    return {
      OR: [
        { assigned_user_id: user.id },
        { created_by_user_id: user.id },
        { matter: { assigned_lawyer_id: user.id } }
      ]
    };
  }
  // Clients shouldn't see internal tasks usually, but if needed:
  return { id: -1 };
};

const getAll = async (query, user) => {
  const { matter_id, activity_id, status, priority, assigned_to, task_type, overdue } = query;

  const where = { ...taskScope(user) };

  if (matter_id) where.matter_id = parseInt(matter_id);
  if (activity_id) where.activity_id = parseInt(activity_id);
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (task_type) where.task_type = task_type;
  if (assigned_to) {
    where.assigned_user_id = assigned_to === 'me' ? user.id : parseInt(assigned_to);
  }
  if (overdue === 'true') {
    where.due_date = { lt: new Date() };
    where.status = 'open';
  }

  return await prisma.task.findMany({
    where,
    include: {
      assigned_user: { select: { id: true, full_name: true, role: true } },
      created_by: { select: { id: true, full_name: true } },
      matter: { select: { id: true, matter_number: true, title: true } }
    },
    orderBy: [
      { status: 'asc' }, // Open first
      { due_date: 'asc' }
    ]
  });
};

const getById = async (id, user) => {
  const task = await prisma.task.findFirst({
    where: { id: parseInt(id), ...taskScope(user) },
    include: {
      assigned_user: { select: { id: true, full_name: true, role: true } },
      matter: { select: { id: true, title: true } }
    }
  });
  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }
  return task;
};

const create = async (data, user) => {
  // Enforce types
  const payload = {
    title: data.title,
    description: data.description || null,
    priority: data.priority || 'medium',
    status: data.status || 'open',
    task_type: data.task_type || 'general',
    assigned_user_id: data.assigned_user_id ? parseInt(data.assigned_user_id) : null,
    matter_id: data.matter_id ? parseInt(data.matter_id) : null,
    activity_id: data.activity_id ? parseInt(data.activity_id) : null,
    due_date: data.due_date ? new Date(data.due_date) : null,
    reminder_date: data.reminder_date ? new Date(data.reminder_date) : null,
    created_by_user_id: user.id
  };

  const task = await prisma.task.create({ data: payload });

  // Log activity
  if (task.matter_id) {
    await prisma.activity.create({
      data: {
        matter_id: task.matter_id,
        entity_type: 'task',
        entity_id: task.id,
        action: 'created',
        description: `Task "${task.title}" created by ${user.full_name}`,
        actor_user_id: user.id
      }
    });
  }

  // Notify assignee
  if (task.assigned_user_id && task.assigned_user_id !== user.id) {
    await notificationsService.createNotification({
      user_id: task.assigned_user_id,
      title: 'Task Assigned',
      message: `You have been assigned a new task: ${task.title}`,
      type: 'system',
      reference_id: task.matter_id || task.activity_id || task.id
    });
  }

  return task;
};

const update = async (id, data, user) => {
  const task = await getById(id, user);

  const payload = {
    title: data.title !== undefined ? data.title : task.title,
    description: data.description !== undefined ? data.description : task.description,
    priority: data.priority !== undefined ? data.priority : task.priority,
    status: data.status !== undefined ? data.status : task.status,
    task_type: data.task_type !== undefined ? data.task_type : task.task_type,
    assigned_user_id: data.assigned_user_id !== undefined ? (data.assigned_user_id ? parseInt(data.assigned_user_id) : null) : task.assigned_user_id,
    matter_id: data.matter_id !== undefined ? (data.matter_id ? parseInt(data.matter_id) : null) : task.matter_id,
    activity_id: data.activity_id !== undefined ? (data.activity_id ? parseInt(data.activity_id) : null) : task.activity_id,
    due_date: data.due_date !== undefined ? (data.due_date ? new Date(data.due_date) : null) : task.due_date,
    reminder_date: data.reminder_date !== undefined ? (data.reminder_date ? new Date(data.reminder_date) : null) : task.reminder_date,
  };

  const updatedTask = await prisma.task.update({
    where: { id: parseInt(id) },
    data: payload
  });

  // Notify if re-assigned
  if (data.assigned_user_id && parseInt(data.assigned_user_id) !== task.assigned_user_id && parseInt(data.assigned_user_id) !== user.id) {
    await notificationsService.createNotification({
      user_id: parseInt(data.assigned_user_id),
      title: 'Task Assigned',
      message: `You have been assigned a task: ${updatedTask.title}`,
      type: 'system',
      reference_id: updatedTask.matter_id || updatedTask.activity_id || updatedTask.id
    });
  }

  return updatedTask;
};

const completeTask = async (id, user) => {
  const task = await getById(id, user);
  if (task.status === 'completed') return task;

  const completed = await prisma.task.update({
    where: { id: task.id },
    data: {
      status: 'completed',
      completed_at: new Date()
    }
  });

  if (task.matter_id) {
    await prisma.activity.create({
      data: {
        matter_id: task.matter_id,
        entity_type: 'task',
        entity_id: task.id,
        action: 'completed',
        description: `Task "${task.title}" completed by ${user.full_name}`,
        actor_user_id: user.id
      }
    });
  }

  if (task.created_by_user_id && task.created_by_user_id !== user.id) {
    await notificationsService.createNotification({
      user_id: task.created_by_user_id,
      title: 'Task Completed',
      message: `Task completed: ${task.title}`,
      type: 'system',
      reference_id: task.matter_id || task.activity_id || task.id
    });
  }

  return completed;
};

const reopenTask = async (id, user) => {
  const task = await getById(id, user);
  
  return await prisma.task.update({
    where: { id: task.id },
    data: {
      status: 'open',
      completed_at: null
    }
  });
};

const remove = async (id, user) => {
  const task = await getById(id, user);
  return await prisma.task.delete({ where: { id: task.id } });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  completeTask,
  reopenTask,
  remove
};
