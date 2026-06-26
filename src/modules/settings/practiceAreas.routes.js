const express = require('express');
const router = express.Router();
const controller = require('./practiceAreas.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');

router.use(protect);
router.get('/', controller.getAll);

// Admin only routes
router.use(authorize('admin'));
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
