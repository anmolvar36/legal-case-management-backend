const prisma = require('../../config/db');

exports.getAll = async (query = {}) => {
  const where = {};
  if (query.active === 'true') {
    where.is_active = true;
  }
  return await prisma.documentCategory.findMany({
    where,
    orderBy: { name: 'asc' }
  });
};

exports.create = async (data) => {
  return await prisma.documentCategory.create({
    data: {
      name: data.name,
      is_active: data.is_active !== undefined ? data.is_active : true,
    }
  });
};

exports.update = async (id, data) => {
  return await prisma.documentCategory.update({
    where: { id: parseInt(id, 10) },
    data: {
      name: data.name,
      is_active: data.is_active,
    }
  });
};

exports.remove = async (id) => {
  return await prisma.documentCategory.delete({
    where: { id: parseInt(id, 10) }
  });
};
