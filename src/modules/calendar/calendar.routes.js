const express = require('express');
const router = express.Router();
const calendarController = require('./calendar.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.get('/', protect, calendarController.getEvents);
router.post('/', protect, calendarController.addEvent);
router.put('/:id/acknowledge', protect, calendarController.acknowledgeEvent);

router.get('/categories', protect, calendarController.getCategories);
router.post('/categories', protect, calendarController.createCategory);
router.put('/categories/:id', protect, calendarController.updateCategory);
router.delete('/categories/:id', protect, calendarController.deleteCategory);

router.get('/outlook/connect', protect, calendarController.connectOutlook);
router.get('/outlook/callback', calendarController.callbackOutlook);
router.post('/outlook/disconnect', protect, calendarController.disconnectOutlook);
router.get('/outlook/status', protect, calendarController.getStatusOutlook);

router.put('/:id', protect, calendarController.updateEvent);
router.delete('/:id', protect, calendarController.deleteEvent);

module.exports = router;
