const service = require('./dashboards.service');
const { sendResponse } = require('../../utils/response');

const getAdminDashboard = async (req, res, next) => {
  try {
    const data = await service.getAdminDashboard();
    res.status(200).json(sendResponse(true, 'Admin dashboard fetched', data));
  } catch (err) {
    next(err);
  }
};

const getLawyerDashboard = async (req, res, next) => {
  try {
    const data = await service.getLawyerStats(req.user.id);
    res.status(200).json(sendResponse(true, 'Lawyer dashboard fetched', data));
  } catch (err) {
    next(err);
  }
};

const getClientDashboard = async (req, res, next) => {
  try {
    const data = await service.getClientStats(req.user.id);
    res.status(200).json(sendResponse(true, 'Client dashboard fetched', data));
  } catch (err) {
    next(err);
  }
};

/** @deprecated Prefer GET /dashboard/admin|lawyer|client */
const getStats = async (req, res, next) => {
  try {
    let data;
    const { role, id } = req.user;

    if (role === 'admin') {
      data = await service.getAdminDashboard();
    } else if (role === 'lawyer') {
      data = await service.getLawyerStats(id);
    } else if (role === 'client') {
      data = await service.getClientStats(id);
    }

    res.status(200).json(sendResponse(true, 'Dashboard stats fetched', data));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminDashboard,
  getLawyerDashboard,
  getClientDashboard,
  getStats,
};
