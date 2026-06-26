const service = require('./practiceAreas.service');
const { sendResponse } = require('../../utils/response');

exports.getAll = async (req, res, next) => {
  try {
    const data = await service.getAll(req.query);
    res.json(sendResponse(true, 'Practice Areas fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await service.create(req.body);
    res.status(201).json(sendResponse(true, 'Practice Area created successfully', data));
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await service.update(req.params.id, req.body);
    res.json(sendResponse(true, 'Practice Area updated successfully', data));
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id);
    res.json(sendResponse(true, 'Practice Area deleted successfully'));
  } catch (err) {
    next(err);
  }
};
