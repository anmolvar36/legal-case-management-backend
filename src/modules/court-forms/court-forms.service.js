const prisma = require('../../config/db');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { spawn } = require('child_process');
const os = require('os');
const crypto = require('crypto');
const { PDFDocument, PDFTextField, PDFCheckBox, StandardFonts } = require('pdf-lib');

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
    include: { mappings: true },
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
exports.generatePdf = async (draftIdRaw) => {
  const draftId = Number.parseInt(draftIdRaw, 10);
  if (Number.isNaN(draftId)) {
    throw new Error('Invalid draft ID');
  }

  console.log('[PDF_GENERATION] Starting PDF generation for Draft ID:', draftId);
  const form = await prisma.generatedForm.findUnique({
    where: { id: draftId },
    include: {
      template: { include: { mappings: true } },
      matter: true,
    },
  });
  if (!form) {
    console.error('[PDF_GENERATION] Error: Form draft not found for ID', draftId);
    throw new Error('Form draft not found');
  }

  const formData = form.form_data;
  const template = form.template;
  if (!template.pdf_path) {
    throw new Error('Template PDF path is missing in database');
  }

  const templatesDirectory = path.resolve(process.cwd(), 'uploads', 'templates');
  const fallbackDirectory = path.resolve(process.cwd(), 'src', 'modules', 'court-forms', 'templates');
  const pdfAbsolutePath = path.resolve(process.cwd(), template.pdf_path);

  console.log(`[PDF_GENERATION]\nTemplates directory: ${templatesDirectory}\nPDF path from database: ${template.pdf_path}\nResolved PDF path: ${pdfAbsolutePath}`);

  const isInUploads = pdfAbsolutePath.startsWith(`${templatesDirectory}${path.sep}`) || pdfAbsolutePath === templatesDirectory;
  const isInFallback = pdfAbsolutePath.startsWith(`${fallbackDirectory}${path.sep}`) || pdfAbsolutePath === fallbackDirectory;

  if (!isInUploads && !isInFallback) {
    throw new Error('Unauthorized path traversal detected');
  }

  const masterPath = pdfAbsolutePath;

  console.log('[PDF_GENERATION] Loading PDF file from:', masterPath);
  if (!fsSync.existsSync(masterPath)) {
    throw new Error('Template PDF file not found on server filesystem');
  }

  const existingPdfBytes = await fs.readFile(masterPath);
  if (!existingPdfBytes.toString('binary').startsWith('%PDF-')) {
    throw new Error('Template file is not a valid PDF document (missing %PDF- header)');
  }

  const pdfDoc = await loadRepairablePdf(existingPdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  let pdfForm = null;
  try {
    pdfForm = pdfDoc.getForm();
  } catch (e) {
    console.warn('[PDF_GENERATION] Failed to fetch interactive PDF form object:', e.message);
  }

  if (!pdfForm || pdfForm.getFields().length === 0) {
    console.error('[PDF_GENERATION] Error: Document contains zero usable interactive fields.');
    throw new Error('This PDF template contains zero usable interactive fields (it may be XFA-only or non-interactive). Coordinate-based text overlay is required for this form format.');
  }

  try {
    console.log('[PDF_GENERATION] Attempting to remove XFA metadata...');
    pdfForm.deleteXFA();
  } catch (xfaError) {
    console.warn('[PDF_GENERATION] Warning: Failed to delete XFA metadata:', xfaError.message);
  }

  const fields = pdfForm.getFields();
  for (const field of fields) {
    const fieldName = field.getName();
    const dbFieldName = fieldName.length > 190 ? fieldName.substring(0, 190) : fieldName;
    const mapping = template.mappings.find((m) => m.pdf_field_name === dbFieldName);
    const systemKey = mapping ? mapping.system_field_path : null;

    let value = '';
    if (systemKey) {
      value = formData[systemKey] || '';
    }
    if (!value) {
      value = autoMapFieldName(fieldName);
      if (value) {
        value = formData[value] || '';
      }
    }
    if (!value) {
      const cleanName = getCleanFieldName(fieldName);
      value = formData[cleanName] || '';
    }
    if (!value) {
      value = formData[fieldName] || '';
    }

    try {
      if (field instanceof PDFTextField) {
        console.log(`[PDF_GENERATION] Filling text: ${fieldName} -> "${value}"`);
        field.setText(String(value));
      } else if (field instanceof PDFCheckBox) {
        const lowerVal = String(value).toLowerCase();
        const isChecked = value === true || lowerVal === 'true' || lowerVal === 'yes' || lowerVal === '1' || lowerVal === 'on';
        if (isChecked) {
          console.log(`[PDF_GENERATION] Checking checkbox: ${fieldName}`);
          field.check();
        } else {
          field.uncheck();
        }
      }
    } catch (fieldErr) {
      console.warn(`[PDF_GENERATION] Failed to fill field "${fieldName}":`, fieldErr.message);
    }
  }

  try {
    console.log('[PDF_GENERATION] Updating field appearances...');
    pdfForm.updateFieldAppearances(helveticaFont);
  } catch (appErr) {
    console.warn('[PDF_GENERATION] Failed to update field appearances:', appErr.message);
  }

  try {
    console.log('[PDF_GENERATION] Flattening PDF Form...');
    pdfForm.flatten();
  } catch (flattenErr) {
    console.warn('[PDF_GENERATION] Flattening failed (generating editable PDF fallback):', flattenErr.message);
  }

  const generatedDir = path.join(process.cwd(), 'uploads', 'generated');
  if (!fsSync.existsSync(generatedDir)) {
    await fs.mkdir(generatedDir, { recursive: true });
  }

  const sanitizedFormNumber = template.form_number.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase();
  const fileName = `${sanitizedFormNumber}_matter-${form.matter_id}_${Date.now()}.pdf`;
  const outputPath = path.join(generatedDir, fileName);

  const pdfBytes = await pdfDoc.save({
    useObjectStreams: false,
    addDefaultPage: false,
    objectsPerTick: 20
  });

  await fs.writeFile(outputPath, pdfBytes);
  console.log('[PDF_GENERATION] PDF file written successfully:', outputPath);

  await prisma.generatedForm.update({
    where: { id: draftId },
    data: { pdf_file_name: fileName, status: 'completed' },
  });

  return { fileName, filePath: outputPath, pdfBytes };
};

// ── MAPPINGS (Admin) ─────────────────────────────────────────
exports.saveMappings = async (templateId, mappings) => {
  await prisma.courtFormMapping.deleteMany({ where: { template_id: parseInt(templateId) } });
  const seenPdfFieldNames = new Set();
  const uniqueMappings = [];
  for (const m of mappings) {
    const dbFieldName = m.pdf_field_name.length > 190 ? m.pdf_field_name.substring(0, 190) : m.pdf_field_name;
    if (seenPdfFieldNames.has(dbFieldName)) continue;
    seenPdfFieldNames.add(dbFieldName);
    uniqueMappings.push({
      template_id: parseInt(templateId),
      pdf_field_name: dbFieldName,
      system_field_path: m.system_field_path || '',
    });
  }
  return prisma.courtFormMapping.createMany({
    data: uniqueMappings
  });
};

function autoMapFieldName(fieldName) {
  const lower = fieldName.toLowerCase();
  
  if (lower.includes('casenumber') || lower.includes('case_number') || (lower.includes('case') && lower.includes('no'))) return 'case_number';
  if (lower.includes('casetitle') || lower.includes('casename') || (lower.includes('case') && lower.includes('title')) || (lower.includes('case') && lower.includes('name'))) return 'case_title';
  if (lower.includes('judgename') || lower.includes('judge') || lower.includes('dept')) return 'judge_name';
  
  if (lower.includes('attypartyinfo') && lower.includes('name')) return 'attorney_name';
  if (lower.includes('attorneyname') || lower.includes('attyname') || lower.includes('lawyername')) return 'attorney_name';
  
  if (lower.includes('attypartyinfo') && lower.includes('email')) return 'attorney_email';
  if (lower.includes('attorneyemail') || lower.includes('attyemail') || lower.includes('lawyeremail')) return 'attorney_email';
  
  if (lower.includes('attyfirm') || lower.includes('firmname') || lower.includes('firm_name')) return 'firm_name';
  
  if (lower.includes('attypartyinfo') && (lower.includes('street') || lower.includes('city') || lower.includes('address') || lower.includes('state') || lower.includes('zip'))) return 'firm_address';
  if (lower.includes('firmaddress') || lower.includes('firm_address')) return 'firm_address';
  
  if (lower.includes('attypartyinfo') && (lower.includes('phone') || lower.includes('telephone') || lower.includes('telno'))) return 'firm_phone';
  if (lower.includes('firmphone') || lower.includes('firm_phone')) return 'firm_phone';
  
  if (lower.includes('plaintiff') || lower.includes('petitioner') || lower.includes('pltf')) return 'plaintiff';
  if (lower.includes('defendant') || lower.includes('respondent') || lower.includes('deft')) return 'defendant';
  
  if (lower.includes('clientname') || lower.includes('client_name')) return 'client_name';
  if (lower.includes('clientemail') || lower.includes('client_email')) return 'client_email';
  if (lower.includes('clientphone') || lower.includes('client_phone')) return 'client_phone';
  if (lower.includes('clientaddress') || lower.includes('client_address')) return 'client_address';
  
  if (lower.includes('courtname') || lower.includes('court_name') || lower.includes('superiorcourt')) return 'court_name';
  if (lower.includes('courtaddress') || lower.includes('court_address')) return 'court_address';
  
  if (lower.includes('filingdate') || lower.includes('filing_date')) return 'filing_date';
  if (lower.includes('hearingdate') || lower.includes('hearing_date')) return 'hearing_date';
  
  return '';
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

  let pdfFieldNames = [];
  let pdfDoc = null;

  try {
    console.log('[PDF_UPLOAD] Validating and parsing uploaded template...');
    pdfDoc = await loadRepairablePdf(file.buffer);
    
    let pdfForm = null;
    try {
      pdfForm = pdfDoc.getForm();
    } catch (formErr) {
      console.warn('[PDF_UPLOAD] Failed to get form objects:', formErr.message);
    }

    if (!pdfForm || pdfForm.getFields().length === 0) {
      console.error('[PDF_UPLOAD] Uploaded document has 0 interactive fields.');
      throw new Error('This PDF template contains zero usable interactive fields (it may be XFA-only or non-interactive). Coordinate-based text overlay is required for this form format.');
    }

    pdfFieldNames = pdfForm.getFields().map(f => f.getName());
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

  // Pre-seed empty mapping records for the parsed field names
  if (pdfFieldNames.length > 0) {
    const seenDbFieldNames = new Set();
    const mappingRecords = [];
    
    // Fetch all active custom field definitions at once
    const allFieldDefs = await prisma.customFieldDefinition.findMany({
      where: { is_active: true }
    });
    const fieldDefMap = new Map(allFieldDefs.map(d => [d.name, d]));
    
    const newFieldDefsToCreate = [];
    const fieldsToProcess = [];
    
    for (const fieldName of pdfFieldNames) {
      const dbFieldName = fieldName.length > 190 ? fieldName.substring(0, 190) : fieldName;
      if (seenDbFieldNames.has(dbFieldName)) continue;
      seenDbFieldNames.add(dbFieldName);

      let systemPath = autoMapFieldName(fieldName);
      if (!systemPath) {
        const cleanName = getCleanFieldName(fieldName);
        if (cleanName && cleanName.length > 1) {
          systemPath = cleanName;
          if (!fieldDefMap.has(cleanName)) {
            newFieldDefsToCreate.push({
              name: cleanName,
              type: fieldName.toLowerCase().includes('_cb') ? 'checkbox' : 'text',
              is_active: true
            });
            // Add placeholder to prevent duplicates in the same run
            fieldDefMap.set(cleanName, { name: cleanName });
          }
        }
      }
      
      fieldsToProcess.push({ dbFieldName, systemPath });
    }
    
    // Batch create new definitions
    if (newFieldDefsToCreate.length > 0) {
      const uniqueNewDefs = [];
      const seenNames = new Set();
      for (const def of newFieldDefsToCreate) {
        if (!seenNames.has(def.name)) {
          seenNames.add(def.name);
          uniqueNewDefs.push(def);
        }
      }
      await prisma.customFieldDefinition.createMany({
        data: uniqueNewDefs,
        skipDuplicates: true
      });
    }

    // Construct mapping records list
    for (const item of fieldsToProcess) {
      mappingRecords.push({
        template_id: template.id,
        pdf_field_name: item.dbFieldName,
        system_field_path: item.systemPath || ''
      });
    }

    // Batch insert mappings
    if (mappingRecords.length > 0) {
      await prisma.courtFormMapping.createMany({
        data: mappingRecords
      });
    }
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
