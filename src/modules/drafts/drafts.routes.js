const express = require('express');
const router = express.Router();
const controller = require('./drafts.controller');
const { protect } = require('../../middlewares/auth.middleware');

// Public routes for E-Sign
router.get('/signature-request/:token', controller.getSignatureRequest);
router.post('/signature-request/:token/sign', controller.completeSignature);

router.use(protect);

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.get('/:id/pdf', controller.generatePdf);
router.post('/:id/send-signature', controller.sendForSignature);
router.post('/', controller.create);
router.post('/:id/sign', controller.sign);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;