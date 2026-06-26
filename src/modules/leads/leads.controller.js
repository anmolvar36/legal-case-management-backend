const { sendResponse } = require('../../utils/response');
const leadsService = require('./leads.service');

const getAll = async (req, res, next) => {
  try {
    const data = await leadsService.getAll(req.query);
    res.status(200).json(sendResponse(true, 'Leads fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await leadsService.getById(req.params.id);
    res.status(200).json(sendResponse(true, 'Lead fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await leadsService.create(req.body);
    res.status(201).json(sendResponse(true, 'Lead created successfully', data));
  } catch (err) {
    next(err);
  }
};

const createPublicConsultation = async (req, res, next) => {
  try {
    const data = await leadsService.createFromPublicConsultation(req.body);
    res.status(201).json(sendResponse(true, 'Consultation request received', data));
  } catch (err) {
    next(err);
  }
};

const createPublicInquiry = async (req, res, next) => {
  try {
    const data = await leadsService.createFromPublicInquiry(req.body);
    res.status(201).json(sendResponse(true, 'Inquiry received', data));
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await leadsService.update(req.params.id, req.body);
    res.status(200).json(sendResponse(true, 'Lead updated successfully', data));
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await leadsService.remove(req.params.id);
    res.status(200).json(sendResponse(true, 'Lead deleted successfully'));
  } catch (err) {
    next(err);
  }
};

const convertToClient = async (req, res, next) => {
  try {
    const client = await leadsService.convertToClient(req.params.id, req.user.id);
    res.status(200).json(sendResponse(true, 'Lead converted to client successfully', client));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  createPublicConsultation,
  createPublicInquiry,
  update,
  remove,
  convertToClient,
};

