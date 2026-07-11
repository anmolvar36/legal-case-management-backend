const activitiesService = require('./activities.service');

const getAll = async (req, res, next) => {
  try {
    const activities = await activitiesService.getAll(req.user);
    res.json(activities);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const activity = await activitiesService.getById(req.params.id, req.user);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.json(activity);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const activity = await activitiesService.create(req.body, req.user);
    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const activity = await activitiesService.update(req.params.id, req.body, req.user);
    res.json(activity);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await activitiesService.remove(req.params.id, req.user);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
