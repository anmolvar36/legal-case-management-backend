const prisma = require('../../config/db');

exports.getAll = async (query) => {
  const { matter_id } = query;
  const where = {};
  if (matter_id) where.matter_id = parseInt(matter_id, 10);
  
  return await prisma.folder.findMany({
    where,
    orderBy: { created_at: 'asc' }
  });
};

exports.create = async (data) => {
  const { name, matterId } = data;
  return await prisma.folder.create({
    data: {
      name,
      matter_id: matterId ? parseInt(matterId, 10) : null
    }
  });
};
