const express = require('express');
const router = express.Router();
const controller = require('./court-forms.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.use(protect);

// Template Library
router.get('/templates', controller.getTemplates);
router.get('/templates/:id', controller.getTemplateById);
router.post('/templates/:id/mappings', controller.saveMappings);

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
