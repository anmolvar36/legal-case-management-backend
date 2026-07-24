const express = require('express');
const router = express.Router();
const expensesController = require('./expenses.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.use(protect);

router.get('/', expensesController.getAll);
router.post('/', expensesController.create);
router.delete('/:id', expensesController.deleteExpense);

module.exports = router;
