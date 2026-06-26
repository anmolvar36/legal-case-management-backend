const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');

router.use(protect);

router.get('/', authorize('admin', 'lawyer'), usersController.getAll);
router.get('/:id', authorize('admin', 'lawyer'), usersController.getById);
router.post('/', authorize('admin'), usersController.create);
router.put('/:id', authorize('admin'), usersController.update);
router.patch('/:id/reset-password', authorize('admin'), usersController.resetPassword);
router.delete('/:id', authorize('admin'), usersController.remove);

module.exports = router;
