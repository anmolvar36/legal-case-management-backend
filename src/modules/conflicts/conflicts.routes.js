const express = require('express');
const router = express.Router();
const controller = require('./conflicts.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.use(protect);

router.get('/', controller.getAll);
router.post('/check', controller.check);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;