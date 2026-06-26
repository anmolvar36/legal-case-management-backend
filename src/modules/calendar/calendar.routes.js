const express = require('express');
const router = express.Router();
const calendarController = require('./calendar.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.get('/', protect, calendarController.getEvents);
router.post('/', protect, calendarController.addEvent);
router.put('/:id/acknowledge', protect, calendarController.acknowledgeEvent);

module.exports = router;
