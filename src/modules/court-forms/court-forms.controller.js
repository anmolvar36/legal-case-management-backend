const courtFormsService = require('./court-forms.service');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// GET /api/court-forms/templates
exports.getTemplates = async (req, res) => {
  try {
    const templates = await courtFormsService.getTemplates(req.query);
    res.json({ data: templates });
  } catch (e) {
    console.error('[COURT_FORMS] Error getting templates:', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/court-forms/templates/:id
exports.getTemplateById = async (req, res) => {
  try {
    const template = await courtFormsService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ data: template });
  } catch (e) {
    console.error('[COURT_FORMS] Error getting template by ID:', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/court-forms/prefill?matter_id=X
exports.prefill = async (req, res) => {
  try {
    const { matter_id } = req.query;
    if (!matter_id) {
      return res.status(400).json({ error: 'matter_id is required' });
    }
    const data = await courtFormsService.prefillForMatter(matter_id);
    res.json({ data });
  } catch (e) {
    console.error('[COURT_FORMS] Error prefilling matter:', e.message);
    if (e.message.includes('not found')) {
      return res.status(404).json({ error: e.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/court-forms/drafts
exports.getAllDrafts = async (req, res) => {
  try {
    const drafts = await courtFormsService.getAllDrafts(req.query);
    res.json({ data: drafts });
  } catch (e) {
    console.error('[COURT_FORMS] Error getting drafts:', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/court-forms/drafts
exports.createDraft = async (req, res) => {
  try {
    const draft = await courtFormsService.createDraft(req.body, req.user.id);
    res.status(201).json({ data: draft });
  } catch (e) {
    console.error('[COURT_FORMS] Error creating draft:', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/court-forms/drafts/:id
exports.updateDraft = async (req, res) => {
  try {
    const draft = await courtFormsService.updateDraft(req.params.id, req.body, req.user.id);
    res.json({ data: draft });
  } catch (e) {
    console.error('[COURT_FORMS] Error updating draft:', e.message);
    if (e.message.includes('not found')) {
      return res.status(404).json({ error: e.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/court-forms/drafts/:id
exports.deleteDraft = async (req, res) => {
  try {
    await courtFormsService.deleteDraft(req.params.id);
    res.json({ message: 'Draft deleted' });
  } catch (e) {
    console.error('[COURT_FORMS] Error deleting draft:', e.message);
    if (e.message.includes('not found') || e.message.includes('Record to delete does not exist')) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/court-forms/generate/:id — Fill and download the PDF
exports.generatePdf = async (req, res) => {
  try {
    const draftId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(draftId)) {
      return res.status(400).json({ error: 'Invalid draft ID' });
    }
    const { fileName, filePath, pdfBytes } = await courtFormsService.generatePdf(req.params.id, req.body);
    const buffer = Buffer.from(pdfBytes);
    let sha256 = '';
    try {
      if (crypto && typeof crypto.createHash === 'function') {
        sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      }
    } catch (hashErr) {
      console.warn('[CONTROLLER_STREAM_LOG] Hash calculation skipped:', hashErr.message);
    }

//     console.log(`[CONTROLLER_STREAM_LOG] Absolute Disk Path: "${filePath}"`);
//     console.log(`[CONTROLLER_STREAM_LOG] Stream Filename: "${fileName}"`);
//     console.log(`[CONTROLLER_STREAM_LOG] Buffer Byte Length: ${buffer.length} bytes`);
//     if (sha256) console.log(`[CONTROLLER_STREAM_LOG] SHA256 Hash: ${sha256}`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    if (sha256) res.setHeader('X-PDF-SHA256', sha256);
    res.setHeader('X-PDF-Byte-Length', String(buffer.length));
    res.end(buffer);
  } catch (e) {
    console.error('[PDF_GENERATION] Error generating PDF:', e.message);
    if (e.message.includes('not found')) {
      return res.status(404).json({ error: e.message });
    }
    if (e.message.includes('XFA-only') || e.message.includes('zero usable fields')) {
      return res.status(400).json({ error: e.message });
    }
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
};

// Serve generated PDFs for viewing
// GET /api/court-forms/generated/:filename
exports.serveGenerated = async (req, res) => {
  try {
    const filename = req.params.filename;
    const safeFilename = path.basename(filename);
    if (safeFilename !== filename) {
      console.warn(`[COURT_FORMS] [SECURITY] Path traversal attempt blocked: "${filename}"`);
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const generatedDir = path.join(process.cwd(), 'uploads', 'generated');
    const filePath = path.join(generatedDir, safeFilename);

    const resolvedPath = path.resolve(filePath);
    const resolvedGeneratedDir = path.resolve(generatedDir);
    if (!resolvedPath.startsWith(resolvedGeneratedDir)) {
      console.warn(`[COURT_FORMS] [SECURITY] Path traversal directory mismatch blocked: "${resolvedPath}"`);
      return res.status(400).json({ error: 'Invalid filename' });
    }

    if (!fs.existsSync(filePath)) {
      console.warn(`[COURT_FORMS] File not found: "${filePath}"`);
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath);
  } catch (e) {
    console.error('[COURT_FORMS] Error serving generated file:', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/court-forms/templates/:id/mappings — Save admin field mappings
exports.saveMappings = async (req, res) => {
  try {
    await courtFormsService.saveMappings(req.params.id, req.body.mappings);
    res.json({ message: 'Mappings saved successfully' });
  } catch (e) {
    console.error('[COURT_FORMS] Error saving mappings:', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/court-forms/templates/upload
exports.uploadTemplate = async (req, res) => {
  try {
    const template = await courtFormsService.uploadTemplate(req.body, req.file);
    res.status(201).json({ data: template });
  } catch (e) {
    console.error('[PDF_UPLOAD] Error uploading template:', e.message);
    if (e.message.includes('required') || e.message.includes('Invalid') || e.message.includes('zero usable fields') || e.message.includes('XFA-only')) {
      return res.status(400).json({ error: e.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/court-forms/templates/:id
exports.deleteTemplate = async (req, res) => {
  try {
    await courtFormsService.deleteTemplate(req.params.id);
    res.json({ message: 'Template deleted successfully' });
  } catch (e) {
    console.error('[COURT_FORMS] Error deleting template:', e.message);
    if (e.message.includes('not found')) {
      return res.status(404).json({ error: e.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/court-forms/templates/:id/download — Download the original template file
exports.downloadTemplateOriginal = async (req, res) => {
  try {
    const template = await courtFormsService.getTemplateById(req.params.id);
    if (!template || !template.pdf_path) {
      return res.status(404).json({ error: 'Template or PDF file not found' });
    }

    const normalizedPdfPath = template.pdf_path.replace(/\\/g, '/');
    const cleanPdfPath = path.normalize(normalizedPdfPath).replace(/^(\.\.(\/|\\))+/, '');
    const absolutePath = path.resolve(process.cwd(), cleanPdfPath);
    
    // Path traversal check
    const templatesDir = path.resolve(process.cwd(), 'uploads', 'templates');
    const fallbackDir = path.resolve(process.cwd(), 'src', 'modules', 'court-forms', 'templates');
    
    const isInUploads = absolutePath.startsWith(`${templatesDir}${path.sep}`);
    const isInFallback = absolutePath.startsWith(`${fallbackDir}${path.sep}`);
    
    if (!isInUploads && !isInFallback) {
      return res.status(403).json({ error: 'Unauthorized path traversal blocked' });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Template PDF file not found on server' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(absolutePath)}"`);
    res.sendFile(absolutePath);
  } catch (e) {
    console.error('[COURT_FORMS] Error serving template file:', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};
