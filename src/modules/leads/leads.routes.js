const express = require('express');
const router = express.Router();
const leadsController = require('./leads.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.post('/public/consultation', leadsController.createPublicConsultation);
router.post('/public/inquiry', leadsController.createPublicInquiry);

router.use(protect);

router.get('/', leadsController.getAll);
router.get('/:id', leadsController.getById);
router.post('/', leadsController.create);
router.post('/:id/convert', leadsController.convertToClient);
router.put('/:id', leadsController.update);
router.delete('/:id', leadsController.remove);


module.exports = router;
