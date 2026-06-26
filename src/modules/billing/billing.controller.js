const service = require('./billing.service');
const { sendResponse } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const data = await service.getAll(req.query, req.user);
    res.status(200).json(sendResponse(true, 'Billing fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id, req.user);
    res.status(200).json(sendResponse(true, 'Billing fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const downloadPdf = async (req, res, next) => {
  try {
    const { buffer, filename } = await service.getInvoicePdf(req.params.id, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('X-Filename', filename);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await service.create(req.body, req.user);
    res.status(201).json(sendResponse(true, 'Billing created successfully', data));
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await service.update(req.params.id, req.body, req.user);
    res.status(200).json(sendResponse(true, 'Billing updated successfully', data));
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user);
    res.status(200).json(sendResponse(true, 'Billing deleted successfully'));
  } catch (err) {
    next(err);
  }
};

const pay = async (req, res, next) => {
  try {
    const data = await service.pay(req.params.id, req.body || {}, req.user);
    res.status(200).json(sendResponse(true, 'Payment recorded successfully', data));
  } catch (err) {
    next(err);
  }
};

const getTrustAccounts = async (req, res, next) => {
  try {
    const data = await service.getTrustAccounts(req.user);
    res.status(200).json(sendResponse(true, 'Trust accounts fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const getTrustTransactions = async (req, res, next) => {
  try {
    const data = await service.getTrustTransactions(req.params.id, req.user);
    res.status(200).json(sendResponse(true, 'Trust transactions fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const depositTrust = async (req, res, next) => {
  try {
    const data = await service.depositTrust(req.body, req.user);
    res.status(201).json(sendResponse(true, 'Trust deposit recorded successfully', data));
  } catch (err) {
    next(err);
  }
};

const applyTrustToInvoice = async (req, res, next) => {
  try {
    const data = await service.applyTrustToInvoice(req.body, req.user);
    res.status(200).json(sendResponse(true, 'Trust funds applied successfully', data));
  } catch (err) {
    next(err);
  }
};

const sendInvoice = async (req, res, next) => {
  try {
    const data = await service.sendInvoice(req.params.id, req.user);
    res.status(200).json(sendResponse(true, 'Invoice sent successfully', data));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  downloadPdf,
  create,
  update,
  remove,
  pay,
  getTrustAccounts,
  getTrustTransactions,
  depositTrust,
  applyTrustToInvoice,
  sendInvoice,
};