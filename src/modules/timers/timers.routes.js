const express = require('express');
const router = express.Router();
const timersController = require('./timers.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.use(protect);

router.get('/active', timersController.getActive);
router.get('/', timersController.list);
router.post('/start', timersController.start);
router.post('/:id/stop', timersController.stop);

module.exports = router;
