const prisma = require('../../config/db');
const bcrypt = require('bcryptjs');

const getAll = async (query, user) => {
  const { page = 1, limit = 10 } = query;
  const take = parseInt(limit);
  const skip = (parseInt(page) - 1) * take;

  const where = {};
  if (user?.role === 'lawyer') {
    where.matters = {
      some: { assigned_lawyer_id: user.id },
    };
  }
  if (user?.role === 'client') {
    where.user_id = user.id;
  }
  return await prisma.client.findMany({
    where,
    skip,
    take,
    include: {
      _count: {
        select: { matters: true }
      }
    },
    orderBy: { created_at: 'desc' },
  });
};

const getById = async (id, user) => {
  const client = await prisma.client.findUnique({ 
    where: { id: parseInt(id) },
    include: {
      matters: true,
      user: {
        select: { id: true, email: true, role: true, is_active: true }
      }
    }
  });
  if (!client) return null;
  if (user?.role === 'client' && client.user_id !== user.id) {
    const err = new Error('Not authorized to access this client profile');
    err.statusCode = 403;
    throw err;
  }
  if (user?.role === 'lawyer') {
    const hasAssigned = (client.matters || []).some((m) => m.assigned_lawyer_id === user.id);
    if (!hasAssigned) {
      const err = new Error('Not authorized to access this client');
      err.statusCode = 403;
      throw err;
    }
  }
  return client;
};

const create = async (data, user) => {
  if (user?.role !== 'admin') {
    const err = new Error('Only admin can create clients');
    err.statusCode = 403;
    throw err;
  }

  const { email, full_name, password, party_type, party_role, organization_name, contact_first_name, contact_last_name, business_address, home_address } = data;

  // 1. Check if user already exists
  let targetUser = await prisma.user.findUnique({ where: { email } });

  if (!targetUser) {
    // 2. Create new user with provided password or default '1234'
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password || '1234', salt);

    targetUser = await prisma.user.create({
      data: {
        email,
        full_name,
        password_hash,
        role: 'client',
        must_reset_password: true,
      }
    });
  }

  // 3. Create client linked to user
  return await prisma.client.create({
    data: {
      ...data,
      user_id: targetUser.id,
      password: undefined, // ensure password isn't saved in client table
    },
    include: {
      user: {
        select: { id: true, email: true, role: true }
      }
    }
  });
};

const update = async (id, data, user) => {
  const existing = await prisma.client.findUnique({
    where: { id: parseInt(id, 10) },
    include: { matters: true },
  });
  if (!existing) {
    const err = new Error('Client not found');
    err.statusCode = 404;
    throw err;
  }
  if (user?.role === 'lawyer') {
    const hasAssigned = (existing.matters || []).some((m) => m.assigned_lawyer_id === user.id);
    if (!hasAssigned) {
      const err = new Error('Not authorized to update this client');
      err.statusCode = 403;
      throw err;
    }
    delete data.is_portal_enabled;
    delete data.user_id;
  }
  if (user?.role === 'client') {
    if (existing.user_id !== user.id) {
      const err = new Error('Not authorized to update this client profile');
      err.statusCode = 403;
      throw err;
    }
    delete data.is_portal_enabled;
    delete data.user_id;
  }
  return await prisma.client.update({
    where: { id: parseInt(id) },
    data: {
      ...data,
      password: undefined,
    },
  });
};

const remove = async (id, user) => {
  if (user?.role !== 'admin') {
    const err = new Error('Only admin can delete clients');
    err.statusCode = 403;
    throw err;
  }
  return await prisma.client.delete({ where: { id: parseInt(id) } });
};


module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};