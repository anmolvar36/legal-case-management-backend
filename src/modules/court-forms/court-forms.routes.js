const express = require('express');
const router = express.Router();
const controller = require('./court-forms.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.use(protect);

const multer = require('multer');
const path = require('path');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype !== 'application/pdf' || ext !== '.pdf') {
      return cb(new Error('Only PDF templates are allowed'), false);
    }
    cb(null, true);
  },
});

const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Template Library
router.get('/templates', controller.getTemplates);
router.post('/templates/upload', handleUpload, controller.uploadTemplate);
router.get('/templates/:id', controller.getTemplateById);
router.get('/templates/:id/download', controller.downloadTemplateOriginal);
router.post('/templates/:id/mappings', controller.saveMappings);
router.delete('/templates/:id', controller.deleteTemplate);

// Prefill system data for a matter
router.get('/prefill', controller.prefill);

// Draft CRUD
router.get('/drafts', controller.getAllDrafts);
router.post('/drafts', controller.createDraft);
router.put('/drafts/:id', controller.updateDraft);
router.delete('/drafts/:id', controller.deleteDraft);

// PDF generation (download)
router.post('/generate/:id', controller.generatePdf);

// Serve completed PDF files
router.get('/generated/:filename', controller.serveGenerated);

module.exports = router;
