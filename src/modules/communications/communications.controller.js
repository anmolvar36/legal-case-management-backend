const service = require('./communications.service');
const { sendResponse } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const data = await service.getAll(req.query, req.user);
    res.status(200).json(sendResponse(true, 'Communications fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id, req.user);
    res.status(200).json(sendResponse(true, 'Communications fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await service.create(req.body, req.user);
    res.status(201).json(sendResponse(true, 'Communications created successfully', data));
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await service.update(req.params.id, req.body, req.user);
    res.status(200).json(sendResponse(true, 'Communications updated successfully', data));
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user);
    res.status(200).json(sendResponse(true, 'Communications deleted successfully'));
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    const data = await service.markRead(req.params.id, req.user);
    res.status(200).json(sendResponse(true, 'Communication marked as read', data));
  } catch (err) {
    next(err);
  }
};

const markMatterRead = async (req, res, next) => {
  try {
    const data = await service.markMatterRead(req.params.matterId, req.user);
    res.status(200).json(sendResponse(true, 'Matter communications marked as read', data));
  } catch (err) {
    next(err);
  }
};

const getThread = async (req, res, next) => {
  try {
    const data = await service.getThread(req.params.threadId, req.user);
    res.status(200).json(sendResponse(true, 'Thread fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const reply = async (req, res, next) => {
  try {
    const data = await service.replyToThread(req.body, req.user);
    res.status(201).json(sendResponse(true, 'Reply added successfully', data));
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
  markRead,
  markMatterRead,
  getThread,
  reply,
  trackOpen: async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!isNaN(id)) {
        await service.registerOpen(id);
      }
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      });
      res.end(pixel);
    } catch (err) {
      console.error('Tracking pixel error:', err);
      // Fallback: return pixel anyway so image does not appear broken
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length,
      });
      res.end(pixel);
    }
  },
};