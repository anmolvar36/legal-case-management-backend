const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const controller = require('./documents.controller');
const { protect } = require('../../middlewares/auth.middleware');

const uploadsDir = path.resolve(process.cwd(), 'uploads', 'documents');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeOriginal = (file.originalname || 'document')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeOriginal}`);
  },
});
const upload = multer({ 
  storage,
  limits: {
    fileSize: 30 * 1024 * 1024 // 30MB limit
  }
});

router.use(protect);

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.get('/:id/download', controller.download);
router.post('/', upload.single('file'), controller.create);
router.post('/bulk', upload.array('files'), controller.createBulk);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;