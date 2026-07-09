const prisma = require('../../config/db');

const getAll = async (query, user) => {
  const { category, page = 1, limit = 50 } = query;
  const take = parseInt(limit);
  const skip = (parseInt(page) - 1) * take;

  const where = {};
  if (category) where.category = category;
  if (user?.role !== 'admin') where.is_active = true;

  return await prisma.template.findMany({
    where,
    skip,
    take,
    include: {
      created_by: { select: { id: true, full_name: true } }
    },
    orderBy: { created_at: 'desc' },
  });
};

const getById = async (id, user) => {
  const template = await prisma.template.findUnique({
    where: { id: parseInt(id) },
    include: {
      created_by: { select: { id: true, full_name: true } }
    }
  });
  if (!template) {
    const err = new Error('Template not found');
    err.statusCode = 404;
    throw err;
  }
  return template;
};

const create = async (data, user) => {
  if (user?.role === 'client') {
    const err = new Error('Client cannot create templates');
    err.statusCode = 403;
    throw err;
  }
  data.created_by_user_id = user.id;
  return await prisma.template.create({ data });
};

const update = async (id, data, user) => {
  if (user?.role === 'client') {
    const err = new Error('Client cannot update templates');
    err.statusCode = 403;
    throw err;
  }
  return await prisma.template.update({
    where: { id: parseInt(id) },
    data,
  });
};

const remove = async (id, user) => {
  if (user?.role === 'client') {
    const err = new Error('Client cannot delete templates');
    err.statusCode = 403;
    throw err;
  }
  return await prisma.template.delete({ where: { id: parseInt(id) } });
};

const cloneToMatter = async (templateId, matterId, user) => {
  if (user?.role === 'client') {
    const err = new Error('Client cannot clone templates');
    err.statusCode = 403;
    throw err;
  }

  return await prisma.$transaction(async (tx) => {
    const template = await tx.template.findUnique({
      where: { id: parseInt(templateId) }
    });

    if (!template) {
      const err = new Error('Template not found');
      err.statusCode = 404;
      throw err;
    }

    const matter = await tx.matter.findUnique({
      where: { id: parseInt(matterId) },
      include: {
        client: true,
        assigned_lawyer: true
      }
    });

    if (!matter) {
      const err = new Error('Matter not found');
      err.statusCode = 404;
      throw err;
    }

    let content = template.content || '';
    
    content = content.replace(/{{client_name}}/g, matter.client?.full_name || '');
    content = content.replace(/{{matter_title}}/g, matter.title || '');
    content = content.replace(/{{case_number}}/g, matter.matter_number || '');
    content = content.replace(/{{matter_number}}/g, matter.matter_number || '');
    content = content.replace(/{{lawyer_name}}/g, matter.assigned_lawyer?.full_name || '');
    content = content.replace(/{{date}}/g, new Date().toLocaleDateString());
    content = content.replace(/{{current_date}}/g, new Date().toLocaleDateString());

    const company = await tx.companyProfile.findFirst() || {};
    content = content.replace(/{{firm_name}}/g, company.company_name || '');
    content = content.replace(/{{firm_address}}/g, company.address || '');
    content = content.replace(/{{firm_phone}}/g, company.phone || '');
    content = content.replace(/{{firm_email}}/g, company.email || '');
    content = content.replace(/{{firm_logo}}/g, company.logo_url ? `<img src="${company.logo_url}" alt="Firm Logo" style="max-width:200px;" />` : '');

    const draft = await tx.draft.create({
      data: {
        matter_id: matter.id,
        title: template.title,
        content: content,
        category: template.category,
        created_by_user_id: user.id,
        last_updated_by_user_id: user.id,
        status: 'draft'
      }
    });

    return draft;
  });
};

const duplicate = async (id, user) => {
  if (user?.role === 'client') {
    const err = new Error('Client cannot duplicate templates');
    err.statusCode = 403;
    throw err;
  }
  const original = await getById(id, user);
  if (!original) {
    const err = new Error('Template not found');
    err.statusCode = 404;
    throw err;
  }

  return await prisma.template.create({
    data: {
      title: `${original.title} (Copy)`,
      content: original.content,
      category: original.category,
      practice_area: original.practice_area,
      matter_type: original.matter_type,
      description: original.description,
      is_active: original.is_active,
      created_by_user_id: user.id
    }
  });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  cloneToMatter,
  duplicate
};
