const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');

router.use(protect);
router.use(authorize('admin'));

router.post('/generate', reportsController.generateReport);
router.get('/', reportsController.listReports);
router.get('/marketing', reportsController.getMarketing);
router.get('/:id', reportsController.getReport);
router.get('/:id/download', reportsController.downloadReport);

module.exports = router;
