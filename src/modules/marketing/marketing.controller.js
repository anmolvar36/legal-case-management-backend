const service = require('./marketing.service');
const { sendResponse } = require('../../utils/response');

const getOverview = async (req, res, next) => {
  try {
    const data = await service.getOverview();
    res.status(200).json(sendResponse(true, 'Marketing overview fetched', data));
  } catch (err) {
    next(err);
  }
};

const getSources = async (req, res, next) => {
  try {
    const data = await service.getSources();
    res.status(200).json(sendResponse(true, 'Marketing sources fetched', data));
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const data = await service.getAll(req.query);
    res.status(200).json(sendResponse(true, 'Marketing fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id);
    res.status(200).json(sendResponse(true, 'Marketing fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await service.create(req.body);
    res.status(201).json(sendResponse(true, 'Marketing created successfully', data));
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await service.update(req.params.id, req.body);
    res.status(200).json(sendResponse(true, 'Marketing updated successfully', data));
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id);
    res.status(200).json(sendResponse(true, 'Marketing deleted successfully'));
  } catch (err) {
    next(err);
  }
};

const getSocialLinks = async (req, res, next) => {
  try {
    const data = await service.getSocialLinks();
    res.status(200).json(sendResponse(true, 'Social links fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const updateSocialLinks = async (req, res, next) => {
  try {
    const data = await service.updateSocialLinks(req.body);
    res.status(200).json(sendResponse(true, 'Social links updated successfully', data));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverview,
  getSources,
  getAll,
  getById,
  create,
  update,
  remove,
  getSocialLinks,
  updateSocialLinks,
};