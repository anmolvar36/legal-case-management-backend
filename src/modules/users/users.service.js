const prisma = require('../../config/db');
const notificationsService = require('../notifications/notifications.service');
const bcrypt = require('bcryptjs');

const getAll = async (query) => {
  const users = await prisma.user.findMany({
    include: {
      roles: true,
      lawyer: true,
      _count: {
        select: { assigned_matters: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return users.map(u => {
    const userRoles = u.roles?.length > 0 ? u.roles.map(r => r.role) : [u.role];
    const { password_hash, roles, lawyer, ...rest } = u;
    return { ...rest, roles: userRoles, practice_focus: lawyer?.practice_focus || null };
  });
};

const getById = async (id) => {
  const u = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    include: {
      roles: true,
      lawyer: true,
    },
  });

  if (!u) return null;
  const userRoles = u.roles?.length > 0 ? u.roles.map(r => r.role) : [u.role];
  const { password_hash, roles, lawyer, ...rest } = u;
  return { ...rest, roles: userRoles, practice_focus: lawyer?.practice_focus || null };
};

const create = async (data) => {
  const salt = await bcrypt.genSalt(10);
  data.password_hash = await bcrypt.hash(data.password, salt);
  delete data.password;
  
  const { roles, practice_focus, ...userData } = data;
  if (roles && roles.length > 0) {
    userData.role = roles[0]; // Fallback for legacy column
  }
  
  const user = await prisma.user.create({ data: userData });

  if (roles && roles.length > 0) {
    await prisma.userRole.createMany({
      data: roles.map(r => ({ user_id: user.id, role: r }))
    });
  } else if (user.role) {
    await prisma.userRole.create({
      data: { user_id: user.id, role: user.role }
    });
  }

  // Create Lawyer profile if roles includes lawyer
  const resolvedRoles = roles || (user.role ? [user.role] : []);
  if (resolvedRoles.includes('lawyer')) {
    await prisma.lawyer.create({
      data: {
        user_id: user.id,
        display_name: user.full_name,
        practice_focus: practice_focus || null,
      }
    });
  }

  const createdUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { roles: true, lawyer: true }
  });

  if (!createdUser) return null;
  const userRoles = createdUser.roles?.length > 0 ? createdUser.roles.map(r => r.role) : [createdUser.role];
  const { password_hash, roles: _, lawyer, ...rest } = createdUser;

  if (userRoles.includes('client')) {
    const admins = await prisma.user.findMany({
      where: { roles: { some: { role: 'admin' } } },
      select: { id: true }
    });

    for (const admin of admins) {
      await notificationsService.createNotification({
        user_id: admin.id,
        title: 'New Client Registered',
        message: `${rest.full_name} has registered and is awaiting onboarding.`,
        type: 'client',
        reference_id: rest.id
      });
    }
  }

  return { ...rest, roles: userRoles, practice_focus: lawyer?.practice_focus || null };
};

const update = async (id, data) => {
  if (data.password) {
    const salt = await bcrypt.genSalt(10);
    data.password_hash = await bcrypt.hash(data.password, salt);
    delete data.password;
  }
  
  const { roles, practice_focus, ...userData } = data;
  if (roles && roles.length > 0) {
    userData.role = roles[0];
  }
  
  await prisma.user.update({
    where: { id: parseInt(id) },
    data: userData,
  });

  if (roles) {
    await prisma.userRole.deleteMany({
      where: { user_id: parseInt(id) }
    });
    if (roles.length > 0) {
      await prisma.userRole.createMany({
        data: roles.map(r => ({ user_id: parseInt(id), role: r }))
      });
    }
  }

  // Upsert Lawyer profile if roles includes lawyer
  const resolvedRoles = roles || [];
  if (resolvedRoles.includes('lawyer')) {
    await prisma.lawyer.upsert({
      where: { user_id: parseInt(id) },
      update: {
        display_name: userData.full_name || "",
        practice_focus: practice_focus || null,
      },
      create: {
        user_id: parseInt(id),
        display_name: userData.full_name || "",
        practice_focus: practice_focus || null,
      }
    });
  }

  const updatedUser = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    include: { roles: true, lawyer: true }
  });

  if (!updatedUser) return null;
  const userRoles = updatedUser.roles?.length > 0 ? updatedUser.roles.map(r => r.role) : [updatedUser.role];
  const { password_hash, roles: _, lawyer, ...rest } = updatedUser;
  return { ...rest, roles: userRoles, practice_focus: lawyer?.practice_focus || null };
};

const resetPassword = async (id, newPassword) => {
  if (!newPassword || newPassword.length < 4) {
    const error = new Error('Password must be at least 4 characters');
    error.statusCode = 400;
    throw error;
  }
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(newPassword, salt);
  await prisma.user.update({
    where: { id: parseInt(id) },
    data: {
      password_hash,
      must_reset_password: false,
    },
  });
  return { success: true };
};

const remove = async (id) => {
  // Instead of a hard delete which violates foreign key constraints (e.g. with matters, invoices, etc.),
  // we perform a soft delete by deactivating the user. This preserves database integrity
  // while "removing" the user from the active platform.
  return await prisma.user.update({
    where: { id: parseInt(id) },
    data: { is_active: false },
  });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  resetPassword,
  remove,
};
