const service = require('./drafts.service');
const { sendResponse } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const data = await service.getAll(req.query, req.user);
    res.status(200).json(sendResponse(true, 'Drafts fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id, req.user);
    res.status(200).json(sendResponse(true, 'Drafts fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await service.create(req.body, req.user);
    res.status(201).json(sendResponse(true, 'Drafts created successfully', data));
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await service.update(req.params.id, req.body, req.user);
    res.status(200).json(sendResponse(true, 'Drafts updated successfully', data));
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user);
    res.status(200).json(sendResponse(true, 'Drafts deleted successfully'));
  } catch (err) {
    next(err);
  }
};

const sign = async (req, res, next) => {
  try {
    const { signature_data, ip_address, device_info } = req.body;
    const result = await service.signDraft(
      req.params.id, 
      req.user.id, 
      signature_data, 
      ip_address, 
      device_info,
      req.user
    );
    res.status(200).json(sendResponse(true, 'Draft signed successfully', result));
  } catch (err) {
    next(err);
  }
};

const generatePdf = async (req, res, next) => {
  try {
    const buffer = await service.generatePdf(req.params.id, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="draft_${req.params.id}.pdf"`);
    res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
};

const sendForSignature = async (req, res, next) => {
  try {
    const { recipient_email } = req.body;
    const data = await service.sendForSignature(req.params.id, recipient_email, req.user);
    res.status(200).json(sendResponse(true, 'Draft sent for signature', data));
  } catch (err) {
    next(err);
  }
};

const getSignatureRequest = async (req, res, next) => {
  try {
    const data = await service.getSignatureRequest(req.params.token);
    res.status(200).json(sendResponse(true, 'Signature request fetched', data));
  } catch (err) {
    next(err);
  }
};

const completeSignature = async (req, res, next) => {
  try {
    const { signature_data, ip_address, device_info } = req.body;
    const data = await service.completeSignature(req.params.token, signature_data, ip_address, device_info);
    res.status(200).json(sendResponse(true, 'Signature completed', data));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  sign,
  generatePdf,
  sendForSignature,
  getSignatureRequest,
  completeSignature,
};