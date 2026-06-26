const express = require('express');
const router = express.Router();
const controller = require('./tasks.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.use(protect);

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id/complete', controller.completeTask);
router.patch('/:id/reopen', controller.reopenTask);
router.delete('/:id', controller.remove);

module.exports = router;
