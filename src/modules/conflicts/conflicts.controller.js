const service = require('./conflicts.service');
const { sendResponse } = require('../../utils/response');

const check = async (req, res, next) => {
  try {
    const { prospective_client_name, opposing_party_name } = req.body;
    const userId = req.user.id;

    const result = await service.checkConflict({ 
      prospectiveClient: prospective_client_name, 
      opposingParty: opposing_party_name,
      userId 
    });

    res.status(200).json(sendResponse(true, result.message, result));
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const data = await service.getAll(req.query);
    res.status(200).json(sendResponse(true, 'Conflicts fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id);
    res.status(200).json(sendResponse(true, 'Conflicts fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await service.create(req.body);
    res.status(201).json(sendResponse(true, 'Conflicts created successfully', data));
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await service.update(req.params.id, req.body);
    res.status(200).json(sendResponse(true, 'Conflicts updated successfully', data));
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id);
    res.status(200).json(sendResponse(true, 'Conflicts deleted successfully'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  check,
  getAll,
  getById,
  create,
  update,
  remove,
};