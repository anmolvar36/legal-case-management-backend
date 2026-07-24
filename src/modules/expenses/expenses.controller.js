const expensesService = require('./expenses.service');

const getAll = async (req, res, next) => {
  try {
    const expenses = await expensesService.getAll(req.query, req.user);
    res.json({ success: true, data: expenses });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const expense = await expensesService.create(req.body, req.user);
    res.status(201).json({ success: true, data: expense, message: 'Expense recorded successfully' });
  } catch (err) {
    next(err);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const result = await expensesService.deleteExpense(req.params.id, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  create,
  deleteExpense,
};
