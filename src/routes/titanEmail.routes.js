const express = require('express');
const router = express.Router();
const titanEmailController = require('../controllers/titanEmail.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.post('/sync', titanEmailController.syncAccount);
router.get('/accounts', titanEmailController.getEmailAccounts);
router.post('/accounts', titanEmailController.addEmailAccount);
router.delete('/accounts/:id', titanEmailController.deleteEmailAccount);
router.get('/folder-counts', titanEmailController.getFolderCounts);
router.get('/custom-folders', titanEmailController.getCustomFolders);
router.get('/messages', titanEmailController.getMessages);
router.get('/messages/:id/thread', titanEmailController.getThread);
router.post('/send', titanEmailController.sendEmail);
router.post('/draft', titanEmailController.saveDraft);
router.post('/bulk', titanEmailController.bulkAction);
router.put('/messages/:id/state', titanEmailController.updateMessageState);
router.put('/messages/:id/move', titanEmailController.moveMessage);
router.put('/messages/:id/restore', titanEmailController.restoreMessage);
router.delete('/messages/:id', titanEmailController.deleteMessage);

module.exports = router;
