const courtFormsService = require('./court-forms.service');
const path = require('path');
const fs = require('fs');

// GET /api/court-forms/templates
exports.getTemplates = async (req, res) => {
  try {
    const templates = await courtFormsService.getTemplates(req.query);
    res.json({ data: templates });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/court-forms/templates/:id
exports.getTemplateById = async (req, res) => {
  try {
    const template = await courtFormsService.getTemplateById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ data: template });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/court-forms/prefill?matter_id=X
exports.prefill = async (req, res) => {
  try {
    const { matter_id } = req.query;
    if (!matter_id) return res.status(400).json({ error: 'matter_id is required' });
    const data = await courtFormsService.prefillForMatter(matter_id);
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/court-forms/drafts
exports.getAllDrafts = async (req, res) => {
  try {
    const drafts = await courtFormsService.getAllDrafts(req.query);
    res.json({ data: drafts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/court-forms/drafts
exports.createDraft = async (req, res) => {
  try {
    const draft = await courtFormsService.createDraft(req.body, req.user.id);
    res.status(201).json({ data: draft });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/court-forms/drafts/:id
exports.updateDraft = async (req, res) => {
  try {
    const draft = await courtFormsService.updateDraft(req.params.id, req.body, req.user.id);
    res.json({ data: draft });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// DELETE /api/court-forms/drafts/:id
exports.deleteDraft = async (req, res) => {
  try {
    await courtFormsService.deleteDraft(req.params.id);
    res.json({ message: 'Draft deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/court-forms/generate/:id — Fill and download the PDF
exports.generatePdf = async (req, res) => {
  try {
    const { fileName, pdfBytes } = await courtFormsService.generatePdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.end(Buffer.from(pdfBytes));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Serve generated PDFs for viewing
// GET /api/court-forms/generated/:filename
exports.serveGenerated = async (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'uploads', 'generated', req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/court-forms/templates/:id/mappings — Save admin field mappings
exports.saveMappings = async (req, res) => {
  try {
    await courtFormsService.saveMappings(req.params.id, req.body.mappings);
    res.json({ message: 'Mappings saved successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/court-forms/templates/upload
exports.uploadTemplate = async (req, res) => {
  try {
    const template = await courtFormsService.uploadTemplate(req.body, req.file);
    res.status(201).json({ data: template });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// DELETE /api/court-forms/templates/:id
exports.deleteTemplate = async (req, res) => {
  try {
    await courtFormsService.deleteTemplate(req.params.id);
    res.json({ message: 'Template deleted successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
