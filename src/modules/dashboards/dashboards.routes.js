const express = require('express');
const router = express.Router();
const controller = require('./dashboards.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');

router.get('/admin', protect, authorize('admin'), controller.getAdminDashboard);
router.get('/lawyer', protect, authorize('lawyer'), controller.getLawyerDashboard);
router.get('/client', protect, authorize('client'), controller.getClientDashboard);

router.get('/stats', protect, controller.getStats);

module.exports = router;
