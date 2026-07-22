const prisma = require('../../config/db');

exports.getAll = async (query = {}) => {
  const where = {};
  if (query.active === 'true') {
    where.is_active = true;
  }
  const fields = await prisma.customFieldDefinition.findMany({
    where,
    orderBy: { created_at: 'asc' }
  });

  const originalFields = ['Settlement Goal', 'Settlement Goall', 'Statute of Limitations', 'Court Jurisdiction'];
  return fields.filter(f => originalFields.includes(f.name));
};

exports.create = async (data) => {
  return await prisma.customFieldDefinition.create({
    data: {
      name: data.name,
      type: data.type,
      options: data.options || null,
      is_active: data.is_active !== undefined ? data.is_active : true,
    }
  });
};

exports.update = async (id, data) => {
  return await prisma.customFieldDefinition.update({
    where: { id: parseInt(id, 10) },
    data: {
      name: data.name,
      type: data.type,
      options: data.options,
      is_active: data.is_active,
    }
  });
};

exports.remove = async (id) => {
  return await prisma.customFieldDefinition.delete({
    where: { id: parseInt(id, 10) }
  });
};
