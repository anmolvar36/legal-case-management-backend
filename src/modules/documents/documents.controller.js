const service = require('./documents.service');
const { sendResponse } = require('../../utils/response');
const fs = require('fs');
const path = require('path');

const getAll = async (req, res, next) => {
  try {
    const data = await service.getAll(req.query, req.user);
    res.status(200).json(sendResponse(true, 'Documents fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id, req.user);
    res.status(200).json(sendResponse(true, 'Documents fetched successfully', data));
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (req.file) {
      payload.file_name = req.file.filename;
      payload.original_name = payload.original_name || req.file.originalname;
      payload.mime_type = req.file.mimetype || 'application/octet-stream';
      payload.file_path = req.file.path;
      payload.file_size = req.file.size;
    } else if (!payload.file_base64) {
      return res.status(400).json(sendResponse(false, 'File attachment is required.'));
    }
    const data = await service.create(payload, req.user);
    res.status(201).json(sendResponse(true, 'Documents created successfully', data));
  } catch (err) {
    next(err);
  }
};

const createBulk = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(sendResponse(false, 'No files uploaded.'));
    }

    let metadataList = [];
    try {
      if (req.body.metadata) {
        metadataList = JSON.parse(req.body.metadata);
      }
    } catch (e) {
      return res.status(400).json(sendResponse(false, 'Invalid metadata JSON.'));
    }

    const data = await service.createBulk(req.files, metadataList, req.user);
    res.status(201).json(sendResponse(true, 'Documents created successfully', data));
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await service.update(req.params.id, req.body, req.user);
    res.status(200).json(sendResponse(true, 'Documents updated successfully', data));
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user);
    res.status(200).json(sendResponse(true, 'Documents deleted successfully'));
  } catch (err) {
    next(err);
  }
};

const download = async (req, res, next) => {
  try {
    const doc = await service.getDownloadPayload(req.params.id, req.user);
    if (!doc) {
      return res.status(404).json(sendResponse(false, 'Document not found'));
    }

    let filePath = doc.file_path;

    // Robust path resolution: if stored path doesn't exist (e.g. project moved),
    // try to find it in the current uploads/documents directory using the filename.
    if (!filePath || !fs.existsSync(filePath)) {
      const fileName = doc.file_name || (filePath ? path.basename(filePath) : null);
      if (fileName) {
        const fallbackPath = path.join(process.cwd(), 'uploads', 'documents', fileName);
        if (fs.existsSync(fallbackPath)) {
          filePath = fallbackPath;
        }
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json(sendResponse(false, 'Document file not found on server'));
    }

    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_name}"`);
    res.setHeader('X-Filename', doc.original_name || `document-${doc.id}`);
    return res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  download,
  create,
  createBulk,
  update,
  remove,
};