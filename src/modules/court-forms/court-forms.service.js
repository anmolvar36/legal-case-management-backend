const prisma = require('../../config/db');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { spawn } = require('child_process');
const os = require('os');
const crypto = require('crypto');
const { PDFDocument, PDFTextField, PDFCheckBox, StandardFonts } = require('pdf-lib');

const pdfAnalyzer = require('./services/pdfAnalyzer.service');
const pdfAcroForm = require('./services/pdfAcroForm.service');
const pdfCoordinate = require('./services/pdfCoordinate.service');
const pdfXfa = require('./services/pdfXfa.service');

// Prepend local portable qpdf to PATH on Windows if available
if (process.platform === 'win32') {
  const localQpdfBin = path.join(process.cwd(), 'scratch', 'qpdf', 'qpdf-12.3.2-msvc64', 'bin');
  if (fsSync.existsSync(localQpdfBin)) {
    process.env.PATH = `${localQpdfBin};${process.env.PATH}`;
  }
}

// ── QPDF REPAIR LAYER ────────────────────────────────────────


function runQpdf(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`[PDF_REPAIR] Spawning QPDF: "${inputPath}" -> "${outputPath}"`);
    const qpdf = spawn('qpdf', [
      '--decrypt',
      '--object-streams=disable',
      '--stream-data=preserve',
      inputPath,
      outputPath
    ]);

    let stderr = '';
    qpdf.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    qpdf.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error('QPDF executable is not installed or unavailable in PATH'));
      } else {
        reject(err);
      }
    });

    qpdf.on('close', (code) => {
      console.log(`[PDF_REPAIR] QPDF exited with code: ${code}`);
      if (code === 0 || (code === 3 && fsSync.existsSync(outputPath))) {
        resolve();
      } else if (code === 2) {
        reject(new Error(`QPDF failed with error code 2 (corrupt file): ${stderr}`));
      } else {
        reject(new Error(`QPDF failed with exit code ${code}: ${stderr}`));
      }
    });
  });
}

async function repairPdfBuffer(pdfBuffer) {
  const tempDir = path.join(os.tmpdir(), `court-forms-repair-${crypto.randomUUID()}`);
  await fs.mkdir(tempDir, { recursive: true });

  const inputPath = path.join(tempDir, `input-${crypto.randomUUID()}.pdf`);
  const outputPath = path.join(tempDir, `output-${crypto.randomUUID()}.pdf`);

  try {
    await fs.writeFile(inputPath, pdfBuffer);
    await runQpdf(inputPath, outputPath);

    if (!fsSync.existsSync(outputPath)) {
      throw new Error('QPDF finished execution but output file was not created');
    }

    const repairedBuffer = await fs.readFile(outputPath);
    if (!repairedBuffer.toString('binary').startsWith('%PDF-')) {
      throw new Error('Repaired file signature is invalid (does not start with %PDF-)');
    }

    return repairedBuffer;
  } finally {
    try {
      if (fsSync.existsSync(inputPath)) await fs.unlink(inputPath);
      if (fsSync.existsSync(outputPath)) await fs.unlink(outputPath);
      if (fsSync.existsSync(tempDir)) await fs.rmdir(tempDir);
    } catch (cleanupErr) {
      console.warn('[PDF_REPAIR] Failed to clean up temp files:', cleanupErr.message);
    }
  }
}

async function loadRepairablePdf(pdfBuffer) {
  const loadOptions = {
    ignoreEncryption: true,
    updateMetadata: false,
    throwOnInvalidObject: false,
  };

  let pdfDoc = null;
  let originallyFailed = false;
  let originalErrorMsg = '';

  try {
    console.log('[COURT_FORMS] Attempting to load original PDF buffer...');
    pdfDoc = await PDFDocument.load(pdfBuffer, loadOptions);
    
    let fieldsCount = 0;
    try {
      fieldsCount = pdfDoc.getForm().getFields().length;
    } catch (_) {}
    
    if (fieldsCount === 0) {
      console.log('[COURT_FORMS] Loaded PDF has 0 fields. Attempting QPDF repair to check if fields can be recovered...');
      originallyFailed = true;
      originalErrorMsg = 'Loaded PDF contains 0 fields';
    }
  } catch (originalError) {
    console.warn('[COURT_FORMS] Original PDF loading failed:', originalError.message);
    originallyFailed = true;
    originalErrorMsg = originalError.message;
  }

  if (originallyFailed) {
    try {
      const repairedBuffer = await repairPdfBuffer(pdfBuffer);
      console.log('[COURT_FORMS] Attempting to load repaired PDF buffer...');
      const repairedDoc = await PDFDocument.load(repairedBuffer, loadOptions);
      return repairedDoc;
    } catch (repairError) {
      console.error('[PDF_REPAIR] Repaired PDF loading also failed:', repairError.message);
      if (pdfDoc && !originalErrorMsg.includes('0 fields')) {
        // Return original if repair failed but original did load
        return pdfDoc;
      }
      throw new Error(
        `Failed to parse PDF document. Original Error: ${originalErrorMsg}. Repair Error: ${repairError.message}`
      );
    }
  }

  return pdfDoc;
}

// ── TEMPLATES ────────────────────────────────────────────────
exports.getTemplates = async (query = {}) => {
  const { search, practice_area } = query;
  const where = { is_active: true };
  if (practice_area) where.practice_area = practice_area;
  if (search) {
    where.OR = [
      { form_number: { contains: search } },
      { title: { contains: search } },
    ];
  }
  return prisma.courtFormTemplate.findMany({
    where,
    orderBy: { form_number: 'asc' },
  });
};

exports.getTemplateById = async (id) => {
  return prisma.courtFormTemplate.findUnique({
    where: { id: parseInt(id) },
    include: { mappings: true, field_mappings: true },
  });
};

// ── PREFILL DATA ASSEMBLY ────────────────────────────────────
exports.prefillForMatter = async (matterId) => {
  const matter = await prisma.matter.findUnique({
    where: { id: parseInt(matterId) },
    include: {
      client: true,
      assigned_lawyer: true,
      parties: true,
      calendar_events: {
        where: { event_status: { not: 'cancelled' } },
        orderBy: { event_date: 'asc' },
        take: 5,
      },
    },
  });

  if (!matter) throw new Error('Matter not found');

  const companyProfile = await prisma.companyProfile.findFirst();

  const nextHearing = matter.calendar_events.find(
    (e) => e.type === 'hearing' || e.type === 'court_date',
  );

  const customFieldValues = await prisma.matterCustomFieldValue.findMany({
    where: { matter_id: parseInt(matterId) },
    include: { field_definition: true }
  });

  const customFieldsData = {};
  customFieldValues.forEach(val => {
    if (val.field_definition) {
      customFieldsData[val.field_definition.name] = val.value || '';
    }
  });

  const clientAddr = [
    matter.client?.address_line_1,
    matter.client?.address_line_2,
    matter.client?.city,
    matter.client?.state,
    matter.client?.postal_code,
  ].filter(Boolean).join(', ');

  const firmAddr = [
    companyProfile?.address_line_1 || companyProfile?.address,
    companyProfile?.city,
    companyProfile?.state,
    companyProfile?.postal_code,
  ].filter(Boolean).join(', ');

  return {
    attorney_name: matter.assigned_lawyer?.full_name || '',
    attorney_email: matter.assigned_lawyer?.email || '',
    firm_name: companyProfile?.company_name || companyProfile?.name || '',
    firm_address: firmAddr,
    firm_phone: companyProfile?.phone || '',
    firm_email: companyProfile?.email || '',
    client_name: matter.client?.full_name || '',
    client_address: clientAddr,
    client_phone: matter.client?.phone || '',
    client_email: matter.client?.email || '',
    case_title: matter.title || '',
    case_number: matter.case_number || '',
    matter_number: matter.matter_number || '',
    plaintiff: matter.client?.full_name || '',
    defendant: matter.opposing_party_name || '',
    filing_date: matter.initial_filing_date
      ? matter.initial_filing_date.toISOString().split('T')[0]
      : '',
    court_name: matter.court_name || '',
    court_address: matter.court_address || '',
    judge_name: matter.judge_name || '',
    hearing_date: nextHearing
      ? nextHearing.event_date.toISOString().split('T')[0]
      : (matter.next_hearing ? new Date(matter.next_hearing).toISOString().split('T')[0] : ''),
    hearing_location: nextHearing?.location || matter.court_name || '',
    ...customFieldsData
  };
};

// ── DRAFTS ───────────────────────────────────────────────────
exports.createDraft = async (data, userId) => {
  const { template_id, matter_id, form_data } = data;
  return prisma.generatedForm.create({
    data: {
      template_id: parseInt(template_id),
      matter_id: parseInt(matter_id),
      form_data: form_data || {},
      status: 'draft',
      created_by: userId,
    },
    include: { template: true, matter: { select: { id: true, title: true, case_number: true } } },
  });
};

exports.updateDraft = async (id, data, userId) => {
  const form = await prisma.generatedForm.findUnique({ where: { id: parseInt(id) } });
  if (!form) throw new Error('Form draft not found');
  return prisma.generatedForm.update({
    where: { id: parseInt(id) },
    data: {
      form_data: data.form_data !== undefined ? data.form_data : form.form_data,
      status: data.status || form.status,
    },
    include: { template: true, matter: { select: { id: true, title: true, case_number: true } } },
  });
};

exports.deleteDraft = async (id) => {
  const form = await prisma.generatedForm.findUnique({ where: { id: parseInt(id) } });
  if (!form) throw new Error('Form draft not found');
  return prisma.generatedForm.delete({ where: { id: parseInt(id) } });
};

exports.getDraftsByMatter = async (matterId) => {
  return prisma.generatedForm.findMany({
    where: { matter_id: parseInt(matterId) },
    include: {
      template: { select: { form_number: true, title: true } },
      creator: { select: { full_name: true } },
    },
    orderBy: { updated_at: 'desc' },
  });
};

exports.getAllDrafts = async (query = {}) => {
  const { matter_id, status } = query;
  const where = {};
  if (matter_id) where.matter_id = parseInt(matter_id);
  if (status) where.status = status;
  return prisma.generatedForm.findMany({
    where,
    include: {
      template: { select: { form_number: true, title: true } },
      matter: { select: { id: true, title: true, case_number: true } },
      creator: { select: { full_name: true } },
    },
    orderBy: { updated_at: 'desc' },
  });
};

// ── PDF GENERATION ───────────────────────────────────────────
exports.generatePdf = async (draftIdRaw, overrides = {}) => {
  const draftId = Number.parseInt(draftIdRaw, 10);
  if (Number.isNaN(draftId)) {
    throw new Error('Invalid draft ID');
  }

  console.log('[PDF_GENERATION] Starting PDF generation for Draft ID:', draftId);
  const form = await prisma.generatedForm.findUnique({
    where: { id: draftId },
    include: {
      template: { include: { mappings: true, field_mappings: true } },
      matter: true,
    },
  });
  if (!form) {
    console.error('[PDF_GENERATION] Error: Form draft not found for ID', draftId);
    throw new Error('Form draft not found');
  }

  const formData = { ...(form.form_data || {}), ...(overrides.form_data || overrides.formValues || {}) };
  const template = form.template;
  if (!template.pdf_path) {
    throw new Error('Template PDF path is missing in database');
  }

  const templatesDirectory = path.resolve(process.cwd(), 'uploads', 'templates');
  const fallbackDirectory = path.resolve(process.cwd(), 'src', 'modules', 'court-forms', 'templates');
  const normalizedPdfPath = template.pdf_path.replace(/\\/g, '/');
  let masterPath = path.resolve(process.cwd(), normalizedPdfPath);

  if (!fsSync.existsSync(masterPath)) {
    const filenameOnly = path.basename(normalizedPdfPath);
    const formNoClean = template.form_number.replace(/[^a-zA-Z0-9_-]/g, '');
    const formSpecificName = `${formNoClean}.pdf`;

    const inUploads = path.join(templatesDirectory, filenameOnly);
    const inUploadsByFormNo = path.join(templatesDirectory, formSpecificName);
    const inFallback = path.join(fallbackDirectory, filenameOnly);
    const inFallbackByFormNo = path.join(fallbackDirectory, formSpecificName);

    if (fsSync.existsSync(inUploads)) {
      masterPath = inUploads;
    } else if (fsSync.existsSync(inUploadsByFormNo)) {
      masterPath = inUploadsByFormNo;
    } else if (fsSync.existsSync(inFallback)) {
      masterPath = inFallback;
    } else if (fsSync.existsSync(inFallbackByFormNo)) {
      masterPath = inFallbackByFormNo;
    }
  }

  const isInUploads = masterPath.startsWith(`${templatesDirectory}${path.sep}`) || masterPath === templatesDirectory;
  const isInFallback = masterPath.startsWith(`${fallbackDirectory}${path.sep}`) || masterPath === fallbackDirectory;

  if (!isInUploads && !isInFallback) {
    throw new Error('Unauthorized path traversal detected');
  }

  console.log('[PDF_GENERATION] Loading PDF file from:', masterPath);
  if (!fsSync.existsSync(masterPath)) {
    throw new Error(`Template PDF file not found on server filesystem (${template.pdf_path})`);
  }

  let existingPdfBytes = await fs.readFile(masterPath);
  if (!existingPdfBytes.toString('binary').startsWith('%PDF-')) {
    throw new Error('Template file is not a valid PDF document (missing %PDF- header)');
  }

  // Attempt to decrypt and repair master PDF template using QPDF
  try {
    const decryptedBuffer = await repairPdfBuffer(existingPdfBytes);
    existingPdfBytes = decryptedBuffer;
    console.log('[PDF_GENERATION] Successfully decrypted master PDF template via QPDF');
  } catch (repairErr) {
    console.warn('[PDF_GENERATION] QPDF decryption skipped/unavailable:', repairErr.message);
  }

  // 1. Analyze PDF Type
  const analysis = await pdfAnalyzer.analyzePdf(existingPdfBytes);
  console.log(`[PDF_GENERATION] Analyzed PDF template type: ${analysis.type}`);

  // On-demand auto extraction if metadata cache is missing for this template version
  if (!template.mappings || template.mappings.length === 0) {
    try {
      await extractAndCacheTemplateMetadata(template.id, existingPdfBytes);
      const reloadedTemplate = await prisma.courtFormTemplate.findUnique({
        where: { id: template.id },
        include: { mappings: true, field_mappings: true }
      });
      if (reloadedTemplate && reloadedTemplate.mappings) {
        template.mappings = reloadedTemplate.mappings;
        template.field_mappings = reloadedTemplate.field_mappings;
      }
    } catch (cacheErr) {
      console.warn('[PDF_GENERATION] On-demand metadata extraction notice:', cacheErr.message);
    }
  }

  const DEFAULT_JUDICIAL_COUNCIL_MAPPINGS = [
    { page_number: 0, system_field_path: 'attorney_name', x_position: 45, y_position: 742, font_size: 9 },
    { page_number: 0, system_field_path: 'firm_name', x_position: 45, y_position: 730, font_size: 9 },
    { page_number: 0, system_field_path: 'firm_address', x_position: 45, y_position: 718, font_size: 9 },
    { page_number: 0, system_field_path: 'firm_phone', x_position: 110, y_position: 694, font_size: 9 },
    { page_number: 0, system_field_path: 'attorney_email', x_position: 110, y_position: 672, font_size: 9 },
    { page_number: 0, system_field_path: 'client_name', x_position: 130, y_position: 660, font_size: 9 },
    { page_number: 0, system_field_path: 'Atty Bar No', x_position: 335, y_position: 742, font_size: 9 },
    { page_number: 0, system_field_path: 'court_name', x_position: 210, y_position: 635, font_size: 9 },
    { page_number: 0, system_field_path: 'court_address', x_position: 130, y_position: 622, font_size: 9 },
    { page_number: 0, system_field_path: 'plaintiff', x_position: 140, y_position: 570, font_size: 9 },
    { page_number: 0, system_field_path: 'defendant', x_position: 140, y_position: 548, font_size: 9 },
    { page_number: 0, system_field_path: 'case_number', x_position: 425, y_position: 572, font_size: 10 },
  ];

  console.log(`[PDF_GENERATION] Filling AcroForm fields for PDF template type: ${analysis.type}`);
  const fieldValuesMap = {};
  for (const mapping of template.mappings || []) {
    if (mapping.pdf_field_name && mapping.system_field_path) {
      fieldValuesMap[mapping.pdf_field_name] = formData[mapping.system_field_path] || '';
    }
  }

  // 1. Populate XFA XML dataset stream (for Adobe Acrobat XFA dataset rendering)
  let xfaFilledBytes = existingPdfBytes;
  try {
    xfaFilledBytes = await pdfXfa.fillXfaDataset(existingPdfBytes, formData);
  } catch (xfaErr) {
    console.warn('[PDF_GENERATION] XFA dataset fill skipped:', xfaErr.message);
  }

  // 2. Populate AcroForm fields & set NeedsAppearances true (for Chrome/AcroForm rendering)
  let populatedAcroBytes = xfaFilledBytes;
  try {
    populatedAcroBytes = await pdfAcroForm.fillFields(xfaFilledBytes, fieldValuesMap, formData);
  } catch (acroErr) {
    console.warn('[PDF_GENERATION] AcroForm fill skipped:', acroErr.message);
  }

  // 3. Apply visual text overlay onto page canvas to guarantee immediate visibility in browser PDF viewers.
  // We only apply coordinate overlays if custom mappings are explicitly defined in the database
  // or if the template has no native AcroForm/XFA fields.
  const hasAcroFields = analysis.type === 'AcroForm' || analysis.type === 'XFA';
  const coordMappings = hasAcroFields
    ? []
    : (template.field_mappings && template.field_mappings.length > 0 ? template.field_mappings : DEFAULT_JUDICIAL_COUNCIL_MAPPINGS);

  console.log(`[PDF_GENERATION] Applying visual text overlay for ${coordMappings.length} fields`);
  try {
    pdfBytes = await pdfCoordinate.fillCoordinates(populatedAcroBytes, coordMappings, formData);
  } catch (coordErr) {
    console.warn('[PDF_GENERATION] Coordinate overlay skipped:', coordErr.message);
    pdfBytes = populatedAcroBytes;
  }

  const generatedDir = path.join(process.cwd(), 'uploads', 'generated');
  if (!fsSync.existsSync(generatedDir)) {
    await fs.mkdir(generatedDir, { recursive: true });
  }

  const sanitizedFormNumber = template.form_number.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase();
  const fileName = `${sanitizedFormNumber}_matter-${form.matter_id}_${Date.now()}.pdf`;
  const outputPath = path.join(generatedDir, fileName);

  await fs.writeFile(outputPath, pdfBytes);
  console.log('[PDF_GENERATION] PDF file written successfully:', outputPath);

  // Update draft form status
  await prisma.generatedForm.update({
    where: { id: draftId },
    data: { pdf_file_name: fileName, status: 'completed' },
  });

  const relativeOutputPath = path.join('uploads', 'generated', fileName);

  // Save generated document into Matter Documents
  try {
    const newDoc = await prisma.document.create({
      data: {
        file_name: fileName,
        original_name: `${template.form_number}_${template.title}.pdf`,
        mime_type: 'application/pdf',
        file_path: relativeOutputPath,
        file_size: pdfBytes.length,
        matter_id: form.matter_id,
        uploaded_by_user_id: form.created_by,
        folder_path: 'Court Forms'
      }
    });

    if (newDoc?.id) {
      await prisma.activity.create({
        data: {
          matter_id: form.matter_id,
          entity_type: 'document',
          entity_id: newDoc.id,
          action: 'generated',
          description: `Court form generated: ${fileName}`,
          actor_user_id: form.created_by,
        }
      });
    }
  } catch (dbErr) {
    console.error('[PDF_GENERATION] Failed to create document / activity entry:', dbErr.message);
  }

  console.log(`[PDF_GENERATION_RUNTIME] PDF Generation complete for Draft ID ${draftId}.`);
  console.log(`[PDF_GENERATION_RUNTIME] Output File Path: "${outputPath}"`);
  console.log(`[PDF_GENERATION_RUNTIME] Final PDF Byte Length: ${pdfBytes.length} bytes`);

  return { fileName, filePath: outputPath, pdfBytes };
};

// ── MAPPINGS (Admin) ─────────────────────────────────────────
exports.saveMappings = async (templateId, mappings) => {
  const tId = parseInt(templateId, 10);
  
  await prisma.courtFormFieldMapping.deleteMany({ where: { template_id: tId } });
  await prisma.courtFormMapping.deleteMany({ where: { template_id: tId } });

  const uniqueCoordinates = [];
  const uniqueMappingsLegacy = [];

  for (const m of mappings) {
    let coords = null;
    try {
      coords = JSON.parse(m.pdf_field_name);
    } catch (_) {}

    if (coords && typeof coords.page === 'number') {
      uniqueCoordinates.push({
        template_id: tId,
        field_name: coords.lbl || m.system_field_path || 'Unnamed Field',
        page_number: parseInt(coords.page, 10),
        x_position: parseFloat(coords.x) || 0,
        y_position: parseFloat(coords.y) || 0,
        font_size: parseFloat(coords.fs) || 10,
        system_field_path: m.system_field_path || '',
      });

      uniqueMappingsLegacy.push({
        template_id: tId,
        pdf_field_name: m.pdf_field_name,
        system_field_path: m.system_field_path || '',
      });
    } else {
      uniqueMappingsLegacy.push({
        template_id: tId,
        pdf_field_name: m.pdf_field_name,
        system_field_path: m.system_field_path || '',
      });
    }
  }

  if (uniqueCoordinates.length > 0) {
    await prisma.courtFormFieldMapping.createMany({
      data: uniqueCoordinates
    });
  }

  if (uniqueMappingsLegacy.length > 0) {
    await prisma.courtFormMapping.createMany({
      data: uniqueMappingsLegacy
    });
  }
};

function autoMapFieldName(fieldName) {
  if (!fieldName) return '';
  const normalized = fieldName
    .replace(/\[\d+\]/g, '')
    .replace(/[_.\-\/]/g, ' ')
    .toLowerCase()
    .trim();

  // 1. Case Number variations
  if (
    normalized.includes('casenumber') ||
    normalized.includes('case number') ||
    normalized.includes('case no') ||
    normalized.includes('caseno') ||
    normalized.includes('csn') ||
    (normalized.includes('case') && (normalized.includes('num') || normalized.includes('no')))
  ) {
    return 'case_number';
  }

  // 2. Case Title / Name variations
  if (
    normalized.includes('casetitle') ||
    normalized.includes('case title') ||
    normalized.includes('casename') ||
    normalized.includes('case name') ||
    (normalized.includes('case') && normalized.includes('title'))
  ) {
    return 'case_title';
  }

  // 3. State Bar Number variations
  if (
    normalized.includes('bar no') ||
    normalized.includes('barno') ||
    normalized.includes('attybarno') ||
    normalized.includes('state bar') ||
    normalized.includes('bar_number') ||
    normalized.includes('barnumber')
  ) {
    return 'Atty Bar No';
  }

  // 4. Combined Attorney Box (for forms like SUBP-010 that don't have separate Name/Address fields)
  if (
    normalized.includes('textfield1') ||
    normalized.includes('attynameandaddress') ||
    (normalized.includes('attypartyinfo') && (normalized.includes('street') || normalized.includes('box')))
  ) {
    return 'attorney_block';
  }

  // 5. Attorney Name variations
  if (
    normalized.includes('attname') ||
    normalized.includes('attorney name') ||
    normalized.includes('attyname') ||
    normalized.includes('lawyer name') ||
    normalized.includes('partywithoutattorney') ||
    (normalized.includes('atty') && normalized.includes('name') && !normalized.includes('attyfor'))
  ) {
    return 'attorney_name';
  }

  // 6. Attorney Email variations
  if (
    normalized.includes('attorney email') ||
    normalized.includes('attyemail') ||
    normalized.includes('lawyeremail') ||
    (normalized.includes('email') && (normalized.includes('atty') || normalized.includes('attorney')))
  ) {
    return 'attorney_email';
  }

  // 7. Firm Name variations
  if (
    normalized.includes('attyfirm') ||
    normalized.includes('firmname') ||
    normalized.includes('firm name') ||
    normalized.includes('lawfirm')
  ) {
    return 'firm_name';
  }

  // 8. Firm / Attorney Address variations
  if (
    normalized.includes('firm address') ||
    normalized.includes('firmaddress') ||
    (normalized.includes('attypartyinfo') && (normalized.includes('street') || normalized.includes('address') || normalized.includes('addr')))
  ) {
    return 'firm_address';
  }

  // 9. Phone / Telephone Number variations
  if (
    normalized.includes('firm phone') ||
    normalized.includes('firmphone') ||
    normalized.includes('telephone') ||
    normalized.includes('phone') ||
    normalized.includes('telno')
  ) {
    return 'firm_phone';
  }

  // 10. Fax Number variations
  if (normalized.includes('fax')) {
    return 'firm_fax';
  }

  // 11. Attorney For / Client Name
  if (
    normalized.includes('attyfor') ||
    normalized.includes('attorney for') ||
    normalized.includes('atty for')
  ) {
    return 'client_name';
  }

  // 12. Plaintiff / Petitioner / Party 1 variations
  if (
    normalized.includes('party1') ||
    normalized.includes('party 1') ||
    normalized.includes('plaintiff') ||
    normalized.includes('petitioner') ||
    normalized.includes('pltf')
  ) {
    return 'plaintiff';
  }

  // 13. Defendant / Respondent / Party 2 variations
  if (
    normalized.includes('party2') ||
    normalized.includes('party 2') ||
    normalized.includes('defendant') ||
    normalized.includes('respondent') ||
    normalized.includes('deft')
  ) {
    return 'defendant';
  }

  // 14. Client Name variations
  if (
    normalized.includes('clientname') ||
    normalized.includes('client name') ||
    normalized.includes('applicant')
  ) {
    return 'client_name';
  }

  // 15. Client Email variations
  if (normalized.includes('client email') || normalized.includes('clientemail')) {
    return 'client_email';
  }

  // 16. Client Phone variations
  if (normalized.includes('client phone') || normalized.includes('clientphone')) {
    return 'client_phone';
  }

  // 17. Client Address variations
  if (normalized.includes('client address') || normalized.includes('clientaddress')) {
    return 'client_address';
  }

  // 18. Court Name variations
  if (
    normalized.includes('crtcounty') ||
    normalized.includes('court county') ||
    normalized.includes('court name') ||
    normalized.includes('courtname') ||
    normalized.includes('superior court') ||
    normalized.includes('crtbranch')
  ) {
    return 'court_name';
  }

  // 19. Court Address variations
  if (
    normalized.includes('crtstreet') ||
    normalized.includes('crtmailingadd') ||
    normalized.includes('crtcityzip') ||
    normalized.includes('court address') ||
    normalized.includes('courtaddress')
  ) {
    return 'court_address';
  }

  // 20. Judge / Dept variations
  if (
    normalized.includes('judge') ||
    normalized.includes('judgename') ||
    normalized.includes('judge name') ||
    normalized.includes('dept')
  ) {
    return 'judge_name';
  }

  // 21. Filing & Hearing Date variations
  if (normalized.includes('filingdate') || normalized.includes('filing date')) return 'filing_date';
  if (normalized.includes('hearingdate') || normalized.includes('hearing date')) return 'hearing_date';

  return '';
}

async function extractAndCacheTemplateMetadata(templateId, pdfBuffer) {
  const tId = parseInt(templateId, 10);
  if (isNaN(tId)) return;

  console.log(`[PDF_AUTO_ALIGN] Extracting and caching field metadata for Template ID ${tId}...`);
  try {
    const pdfDoc = await loadRepairablePdf(pdfBuffer);
    const pages = pdfDoc.getPages();
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    if (!fields || fields.length === 0) {
      console.log(`[PDF_AUTO_ALIGN] Template ID ${tId} contains 0 interactive fields (marked as non-fillable PDF).`);
      return;
    }

    const fieldMappingsToCreate = [];
    const coordMappingsToCreate = [];

    fields.forEach(f => {
      const fieldName = f.getName();
      const widgets = f.acroField.getWidgets();
      const autoMappedPath = autoMapFieldName(fieldName);

      if (autoMappedPath) {
        fieldMappingsToCreate.push({
          template_id: tId,
          pdf_field_name: fieldName,
          system_field_path: autoMappedPath
        });
      }

      if (widgets.length > 0) {
        const widget = widgets[0];
        const rect = widget.getRectangle();
        let pageIndex = 0;

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const annots = page.node.Annots();
          if (annots) {
            for (let j = 0; j < annots.size(); j++) {
              const annotRef = annots.get(j);
              const resolved = pdfDoc.context.lookup(annotRef);
              if (resolved === widget || resolved === widget.dict || (widget.ref && annotRef.num === widget.ref.num && annotRef.gen === widget.ref.gen)) {
                pageIndex = i;
                break;
              }
            }
          }
          if (pageIndex !== 0) break;
        }

        coordMappingsToCreate.push({
          template_id: tId,
          field_name: fieldName,
          page_number: pageIndex,
          x_position: parseFloat(rect.x.toFixed(2)),
          y_position: parseFloat(rect.y.toFixed(2)),
          font_size: 10,
          system_field_path: autoMappedPath || ''
        });
      }
    });

    // Clear old metadata for this template version and save fresh cached metadata
    await prisma.$transaction([
      prisma.courtFormMapping.deleteMany({ where: { template_id: tId } }),
      prisma.courtFormFieldMapping.deleteMany({ where: { template_id: tId } }),
    ]);

    if (fieldMappingsToCreate.length > 0) {
      const uniqueFieldMappings = [];
      const seen = new Set();
      fieldMappingsToCreate.forEach(m => {
        if (!seen.has(m.pdf_field_name)) {
          seen.add(m.pdf_field_name);
          uniqueFieldMappings.push(m);
        }
      });
      await prisma.courtFormMapping.createMany({ data: uniqueFieldMappings });
    }

    if (coordMappingsToCreate.length > 0) {
      await prisma.courtFormFieldMapping.createMany({ data: coordMappingsToCreate });
    }

    console.log(`[PDF_AUTO_ALIGN] Successfully cached ${fieldMappingsToCreate.length} field mappings and ${coordMappingsToCreate.length} field coordinates for Template ID ${tId}!`);
  } catch (err) {
    console.warn(`[PDF_AUTO_ALIGN] Notice extracting template metadata for Template ID ${tId}:`, err.message);
  }
}

function getCleanFieldName(pdfFieldName) {
  const parts = pdfFieldName.split('.');
  const lastPart = parts[parts.length - 1];
  let clean = lastPart.replace(/\[\d+\]/g, '');
  clean = clean.replace(/_(ft|cb|rt|ft_|\.b)$/g, '');
  clean = clean.replace(/([A-Z])/g, ' $1').trim();
  
  if (clean.toLowerCase().includes('galname')) return 'GAL Name';
  if (clean.toLowerCase().includes('gdn')) return 'Guardian Name';
  if (clean.toLowerCase().includes('minorname')) return 'Minor Name';
  if (clean.toLowerCase().includes('minordob')) return 'Minor DOB';
  return clean;
}

exports.uploadTemplate = async (metaData, file) => {
  const { form_number, title, practice_area } = metaData;
  if (!form_number || !title) throw new Error('Form number and title are required');
  if (!file) throw new Error('PDF file is required');

  // Enforce size limit (25 MB) and MIME/signature constraints
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('PDF template file size exceeds the 25 MB limit');
  }
  if (file.mimetype !== 'application/pdf') {
    throw new Error('Only PDF templates are accepted');
  }
  if (!file.buffer.toString('binary').startsWith('%PDF-')) {
    throw new Error('Uploaded file is not a valid PDF document (missing %PDF- header)');
  }

  const templatesDir = path.join(process.cwd(), 'uploads', 'templates');
  if (!fsSync.existsSync(templatesDir)) {
    await fs.mkdir(templatesDir, { recursive: true });
  }

  const destinationFileName = `${form_number.trim().toUpperCase()}_${Date.now()}.pdf`;
  const relativePdfPath = path.join('uploads', 'templates', destinationFileName);
  const absolutePdfPath = path.join(process.cwd(), relativePdfPath);

  let pdfDoc = null;

  try {
    console.log('[PDF_UPLOAD] Validating and parsing uploaded template...');
    pdfDoc = await loadRepairablePdf(file.buffer);
  } catch (err) {
    console.error('[PDF_UPLOAD] Validation failed:', err.message);
    throw err;
  }

  // Save the normalized, clean version of PDF using pdf-lib
  try {
    const normalizedBytes = await pdfDoc.save({
      useObjectStreams: false,
      addDefaultPage: false,
      updateFieldAppearances: false
    });
    await fs.writeFile(absolutePdfPath, normalizedBytes);
    console.log('[PDF_UPLOAD] Normalized template written successfully to:', absolutePdfPath);
  } catch (saveErr) {
    console.error('[PDF_UPLOAD] Failed to write normalized template:', saveErr.message);
    if (fsSync.existsSync(absolutePdfPath)) {
      await fs.unlink(absolutePdfPath);
    }
    throw new Error('Failed to save repaired/normalized PDF template: ' + saveErr.message);
  }

  // Overwrite existing templates with same form number
  const normFormNum = form_number.trim().toUpperCase();
  const existingForm = await prisma.courtFormTemplate.findUnique({
    where: { form_number: normFormNum }
  });
  if (existingForm) {
    const oldPdfPath = path.join(process.cwd(), existingForm.pdf_path);
    if (fsSync.existsSync(oldPdfPath)) {
      try { await fs.unlink(oldPdfPath); } catch (e) { console.error('[PDF_UPLOAD] Failed to delete old pdf:', e.message); }
    }
    await prisma.courtFormTemplate.delete({
      where: { id: existingForm.id }
    });
  }

  // Save template record in database
  const template = await prisma.courtFormTemplate.create({
    data: {
      form_number: normFormNum,
      title: title.trim(),
      practice_area: practice_area ? practice_area.trim() : null,
      pdf_path: relativePdfPath,
    }
  });

  // Extract and cache field metadata for the newly uploaded template version
  try {
    await extractAndCacheTemplateMetadata(template.id, file.buffer);
  } catch (extractErr) {
    console.warn('[PDF_UPLOAD] Notice during auto metadata extraction:', extractErr.message);
  }

  return this.getTemplateById(template.id);
};

exports.deleteTemplate = async (id) => {
  const templateId = parseInt(id);
  const template = await prisma.courtFormTemplate.findUnique({
    where: { id: templateId }
  });
  if (!template) throw new Error('Template not found');

  if (template.pdf_path) {
    const oldPdfPath = path.join(process.cwd(), template.pdf_path);
    if (fsSync.existsSync(oldPdfPath)) {
      try { await fs.unlink(oldPdfPath); } catch (e) { console.error('[COURT_FORMS] Failed to delete pdf:', e.message); }
    }
  }

  await prisma.courtFormTemplate.delete({
    where: { id: templateId }
  });
};

// ── MIGRATION / CLEANUP LOGIC ────────────────────────────────
async function cleanupInvalidMappings() {
  try {
    console.log('[COURT_FORMS_MIGRATION] Running automated cleanup of invalid/corrupt mappings...');
    const allMappings = await prisma.courtFormMapping.findMany();
    let deleteCount = 0;
    
    for (const m of allMappings) {
      const hasCorrupt = /[\u0000-\u001F\u007F-\u009F]/.test(m.pdf_field_name) ||
                         m.pdf_field_name.includes('·') ||
                         m.pdf_field_name.includes('Ý') ||
                         m.pdf_field_name.includes('æ') ||
                         m.pdf_field_name.includes('Ë') ||
                         m.pdf_field_name.includes('ß');

      if (hasCorrupt) {
        await prisma.courtFormMapping.delete({ where: { id: m.id } });
        deleteCount++;
      }
    }
    if (deleteCount > 0) {
      console.log(`[COURT_FORMS_MIGRATION] Cleared ${deleteCount} corrupted mappings.`);
    }
  } catch (err) {
    console.error('[COURT_FORMS_MIGRATION] Migration cleanup failed:', err.message);
  }
}

// Trigger automatically on load
cleanupInvalidMappings();
