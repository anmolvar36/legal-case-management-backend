const express = require('express');
const router = express.Router();
const controller = require('./communications.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.get('/track/:id', controller.trackOpen);

router.use(protect);

router.get('/', controller.getAll);
router.get('/thread/:threadId', controller.getThread);
router.get('/:id', controller.getById);
router.post('/reply', controller.reply);
router.post('/', controller.create);
router.patch('/:id/read', controller.markRead);
router.patch('/matter/:matterId/read', controller.markMatterRead);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;