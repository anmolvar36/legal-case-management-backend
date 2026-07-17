const express = require('express');
const router = express.Router();
const titanEmailController = require('../controllers/titanEmail.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.post('/sync', titanEmailController.syncAccount);
router.get('/messages', titanEmailController.getMessages);
router.post('/send', titanEmailController.sendEmail);
router.post('/draft', titanEmailController.saveDraft);
router.put('/messages/:id/state', titanEmailController.updateMessageState);
router.put('/messages/:id/move', titanEmailController.moveMessage);
router.delete('/messages/:id', titanEmailController.deleteMessage);

module.exports = router;
