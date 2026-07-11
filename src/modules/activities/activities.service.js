const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAll = async (user) => {
  return await prisma.genericActivity.findMany({
    orderBy: { updated_at: 'desc' }
  });
};

const getById = async (id, user) => {
  return await prisma.genericActivity.findUnique({
    where: { id: parseInt(id) }
  });
};

const create = async (data, user) => {
  const { title, type, description, status } = data;
  return await prisma.genericActivity.create({
    data: {
      title,
      type,
      description,
      status: status || 'Open',
      created_by: user.id
    }
  });
};

const update = async (id, data, user) => {
  const { title, type, description, status } = data;
  return await prisma.genericActivity.update({
    where: { id: parseInt(id) },
    data: {
      title,
      type,
      description,
      status
    }
  });
};

const remove = async (id, user) => {
  return await prisma.genericActivity.delete({
    where: { id: parseInt(id) }
  });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
