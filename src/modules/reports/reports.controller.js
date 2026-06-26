const reportsService = require('./reports.service');
const { generateReportPDF } = require('../../utils/pdfGenerator');

exports.generateReport = async (req, res, next) => {
  try {
    const report = await reportsService.generate(req.user.id, req.body);
    res.status(201).json({ data: report });
  } catch (error) {
    next(error);
  }
};

exports.listReports = async (req, res, next) => {
  try {
    const reports = await reportsService.list();
    res.status(200).json({ data: reports });
  } catch (error) {
    next(error);
  }
};

exports.getReport = async (req, res, next) => {
  try {
    const report = await reportsService.getById(Number(req.params.id));
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.status(200).json({ data: report });
  } catch (error) {
    next(error);
  }
};

exports.downloadReport = async (req, res, next) => {
  try {
    const report = await reportsService.getById(Number(req.params.id));
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    generateReportPDF(report, res);
  } catch (error) {
    next(error);
  }
};

exports.getMarketing = async (req, res, next) => {
  try {
    const data = await reportsService.getMarketingStats();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};
