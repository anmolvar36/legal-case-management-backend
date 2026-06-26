const express = require('express');
const router = express.Router();
const controller = require('./marketing.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');

router.use(protect);

router.get('/overview', authorize('admin'), controller.getOverview);
router.get('/sources', authorize('admin'), controller.getSources);

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;