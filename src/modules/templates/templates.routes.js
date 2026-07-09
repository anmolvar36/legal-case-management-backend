const express = require('express');
const router = express.Router();
const controller = require('./templates.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.use(protect);

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.post('/clone', controller.cloneToMatter);
router.post('/:id/duplicate', controller.duplicate);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
