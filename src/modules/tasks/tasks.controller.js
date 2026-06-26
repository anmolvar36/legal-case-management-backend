const service = require('./tasks.service');
const { sendResponse } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const data = await service.getAll(req.query, req.user);
    res.status(200).json(sendResponse(true, 'Tasks fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id, req.user);
    res.status(200).json(sendResponse(true, 'Task fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await service.create(req.body, req.user);
    res.status(201).json(sendResponse(true, 'Task created successfully', data));
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await service.update(req.params.id, req.body, req.user);
    res.status(200).json(sendResponse(true, 'Task updated successfully', data));
  } catch (err) {
    next(err);
  }
};

const completeTask = async (req, res, next) => {
  try {
    const data = await service.completeTask(req.params.id, req.user);
    res.status(200).json(sendResponse(true, 'Task completed successfully', data));
  } catch (err) {
    next(err);
  }
};

const reopenTask = async (req, res, next) => {
  try {
    const data = await service.reopenTask(req.params.id, req.user);
    res.status(200).json(sendResponse(true, 'Task reopened successfully', data));
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user);
    res.status(200).json(sendResponse(true, 'Task deleted successfully'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  completeTask,
  reopenTask,
  remove
};
