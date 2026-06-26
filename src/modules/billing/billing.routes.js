const express = require('express');
const router = express.Router();
const controller = require('./billing.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.use(protect);

router.get('/', controller.getAll);

// Trust Account Routes
router.get('/trust-accounts', controller.getTrustAccounts);
router.post('/trust-accounts/deposit', controller.depositTrust);
router.post('/trust-accounts/apply', controller.applyTrustToInvoice);
router.get('/trust-accounts/:id/transactions', controller.getTrustTransactions);

// Invoice Routes
router.get('/:id/pdf', controller.downloadPdf);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.post('/:id/pay', controller.pay);
router.post('/:id/send', controller.sendInvoice);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;