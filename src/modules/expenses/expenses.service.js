const prisma = require('../../config/db');

const getAll = async (query, user) => {
  const { matter_id, category, page = 1, limit = 500 } = query;
  const take = parseInt(limit, 10);
  const skip = (parseInt(page, 10) - 1) * take;

  const where = {};
  if (matter_id) where.matter_id = parseInt(matter_id, 10);
  if (category && category !== 'All') where.category = category;

  if (user?.role === 'lawyer') {
    where.OR = [
      { created_by_id: user.id },
      { matter: { assigned_lawyer_id: user.id } }
    ];
  } else if (user?.role === 'client') {
    where.matter = {
      OR: [
        { client: { user_id: user.id } },
        { parties: { some: { user_id: user.id } } }
      ]
    };
  }

  const expenses = await prisma.expense.findMany({
    where,
    skip,
    take,
    include: {
      matter: {
        select: {
          id: true,
          matter_number: true,
          title: true,
          client: { select: { id: true, full_name: true } }
        }
      },
      created_by: {
        select: { id: true, full_name: true }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  return expenses;
};

const create = async (data, user) => {
  const { vendor, matter_id, category, amount, date, status, description } = data;

  if (!vendor || !vendor.trim()) {
    const err = new Error('Vendor / Payee name is required');
    err.statusCode = 400;
    throw err;
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    const err = new Error('Valid expense amount is required');
    err.statusCode = 400;
    throw err;
  }

  const payload = {
    vendor: vendor.trim(),
    category: category || 'General',
    amount: parsedAmount,
    date: date ? new Date(date) : new Date(),
    status: status || 'approved',
    description: description ? description.trim() : null,
    created_by_id: user?.id || null,
  };

  if (matter_id) {
    payload.matter_id = parseInt(matter_id, 10);
  }

  const expense = await prisma.expense.create({
    data: payload,
    include: {
      matter: {
        select: {
          id: true,
          matter_number: true,
          title: true,
          client: { select: { id: true, full_name: true } }
        }
      },
      created_by: {
        select: { id: true, full_name: true }
      }
    }
  });

  return expense;
};

const deleteExpense = async (id, user) => {
  const expId = parseInt(id, 10);
  const existing = await prisma.expense.findUnique({ where: { id: expId } });
  if (!existing) {
    const err = new Error('Expense record not found');
    err.statusCode = 404;
    throw err;
  }

  await prisma.expense.delete({ where: { id: expId } });
  return { message: 'Expense deleted successfully' };
};

module.exports = {
  getAll,
  create,
  deleteExpense,
};
