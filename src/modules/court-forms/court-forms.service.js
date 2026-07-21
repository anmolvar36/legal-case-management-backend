const prisma = require('../../config/db');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const https = require('https');
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
//     console.log(`[PDF_REPAIR] Spawning QPDF: "${inputPath}" -> "${outputPath}"`);
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
//       console.log(`[PDF_REPAIR] QPDF exited with code: ${code}`);
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
//     console.log('[COURT_FORMS] Attempting to load original PDF buffer...');
    pdfDoc = await PDFDocument.load(pdfBuffer, loadOptions);
    
    let fieldsCount = 0;
    try {
      fieldsCount = pdfDoc.getForm().getFields().length;
    } catch (_) {}
    
    if (fieldsCount === 0) {
//       console.log('[COURT_FORMS] Loaded PDF has 0 fields. Attempting QPDF repair to check if fields can be recovered...');
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
//       console.log('[COURT_FORMS] Attempting to load repaired PDF buffer...');
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
    attorney_name: 'Victoria Tulsidas, Esq.',
    'Atty Bar No': '365147',
    attorney_email: 'vtulsidas@victoriatulsidaslaw.com',
    firm_name: 'Victoria Tulsidas Law, A Professional Legal Corporation',
    firm_address: '750 San Vincente Blvd, Suite 800 West',
    firm_city: 'West Hollywood',
    firm_state: 'CA',
    firm_zip: '90069',
    firm_phone: '(310) 504-2359',
    firm_email: 'vtulsidas@victoriatulsidaslaw.com',
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

//   console.log('[PDF_GENERATION] Starting PDF generation for Draft ID:', draftId);
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

function downloadFileHelper(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fsSync.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFileHelper(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', (err) => {
      fsSync.unlink(dest, () => reject(err));
    });
  });
}

//   console.log('[PDF_GENERATION] Loading PDF file from:', masterPath);
  if (!fsSync.existsSync(masterPath)) {
    const formNo = template.form_number || '';
    const cleanFormNo = formNo.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanFormNo) {
      const officialUrl = `https://www.courts.ca.gov/documents/${cleanFormNo}.pdf`;
//       console.log(`[PDF_GENERATION] Master PDF missing at ${masterPath}. Attempting dynamic download from ${officialUrl}...`);
      try {
        const parentDir = path.dirname(masterPath);
        if (!fsSync.existsSync(parentDir)) {
          await fs.mkdir(parentDir, { recursive: true });
        }
        await downloadFileHelper(officialUrl, masterPath);
//         console.log(`[PDF_GENERATION] Successfully downloaded official template for ${formNo} to ${masterPath}`);
      } catch (dlErr) {
        console.error(`[PDF_GENERATION] Dynamic template download failed:`, dlErr.message);
      }
    }
  }

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
//     console.log('[PDF_GENERATION] Successfully decrypted master PDF template via QPDF');
  } catch (repairErr) {
    console.warn('[PDF_GENERATION] QPDF decryption skipped/unavailable:', repairErr.message);
  }

  // 1. Analyze PDF Type
  const analysis = await pdfAnalyzer.analyzePdf(existingPdfBytes);
//   console.log(`[PDF_GENERATION] Analyzed PDF template type: ${analysis.type}`);

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

//   console.log(`[PDF_GENERATION] Filling AcroForm fields for PDF template type: ${analysis.type}`);
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

  // 3. Apply visual text overlay onto page canvas ONLY if genuine coordinate mappings exist.
  // Using hardcoded default coordinates on AcroForms causes overlapping "double text".
  let coordMappings = [];
  if (template.field_mappings && template.field_mappings.length > 0 && template.field_mappings[0].x_position !== undefined) {
    coordMappings = template.field_mappings;
  }

  if (coordMappings.length > 0) {
//     console.log(`[PDF_GENERATION] Applying visual text overlay for ${coordMappings.length} fields`);
    try {
      pdfBytes = await pdfCoordinate.fillCoordinates(populatedAcroBytes, coordMappings, formData);
    } catch (coordErr) {
      console.warn('[PDF_GENERATION] Coordinate overlay skipped:', coordErr.message);
      pdfBytes = populatedAcroBytes;
    }
  } else {
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
//   console.log('[PDF_GENERATION] PDF file written successfully:', outputPath);

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

//   console.log(`[PDF_GENERATION_RUNTIME] PDF Generation complete for Draft ID ${draftId}.`);
//   console.log(`[PDF_GENERATION_RUNTIME] Output File Path: "${outputPath}"`);
//   console.log(`[PDF_GENERATION_RUNTIME] Final PDF Byte Length: ${pdfBytes.length} bytes`);

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
  const lower = fieldName.toLowerCase();
  
  if (lower.includes('casenumber') || lower.includes('case_number') || (lower.includes('case') && lower.includes('no'))) return 'case_number';
  if (lower.includes('casetitle') || lower.includes('casename') || (lower.includes('case') && lower.includes('title')) || (lower.includes('case') && lower.includes('name'))) return 'case_title';
  if (lower.includes('judgename') || lower.includes('judge') || lower.includes('dept')) return 'judge_name';
  
  if (lower.includes('attypartyinfo') && lower.includes('name')) return 'attorney_name';
  if (lower.includes('attorneyname') || lower.includes('attyname') || lower.includes('lawyername')) return 'attorney_name';
  
  if (lower.includes('attypartyinfo') && lower.includes('email')) return 'attorney_email';
  if (lower.includes('attorneyemail') || lower.includes('attyemail') || lower.includes('lawyeremail')) return 'attorney_email';
  
  if (lower.includes('attyfirm') || lower.includes('firmname') || lower.includes('firm_name')) return 'firm_name';
  
  if (lower.includes('attypartyinfo') && lower.includes('zip')) return 'firm_zip';
  if (lower.includes('attypartyinfo') && lower.includes('city')) return 'firm_city';
  if (lower.includes('attypartyinfo') && lower.includes('state')) return 'firm_state';
  if (lower.includes('attypartyinfo') && (lower.includes('street') || lower.includes('address'))) return 'firm_address';
  if (lower.includes('firmaddress') || lower.includes('firm_address')) return 'firm_address';
  if (lower.includes('firmzip') || lower.includes('firm_zip') || lower.includes('zipcode')) return 'firm_zip';
  
  if (lower.includes('attypartyinfo') && (lower.includes('phone') || lower.includes('telephone') || lower.includes('telno'))) return 'firm_phone';
  if (lower.includes('firmphone') || lower.includes('firm_phone') || lower.includes('telephone')) return 'firm_phone';
  
  if (lower.includes('statebarnumber') || lower.includes('barnumber') || lower.includes('bar no') || lower.includes('barno') || lower.includes('statebar')) return 'Atty Bar No';
  if (lower.includes('attorneyfor') || lower.includes('attyfor') || lower.includes('attorney for')) return 'client_name';
  
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

  let pdfDoc = null;

  try {
//     console.log('[PDF_UPLOAD] Validating and parsing uploaded template...');
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
//     console.log('[PDF_UPLOAD] Normalized template written successfully to:', absolutePdfPath);
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

  try {
    // Attempt Auto-Mapping based on field names
    const acroForm = pdfDoc.catalog.get(pdfDoc.context.obj('AcroForm'));
    if (acroForm) {
      const fields = pdfDoc.getForm().getFields();
      const mappingsToCreate = [];
      for (const field of fields) {
        const fieldName = field.getName();
        const systemField = autoMapFieldName(fieldName);
        if (systemField) {
          mappingsToCreate.push({
            template_id: template.id,
            pdf_field_name: fieldName,
            system_field_path: systemField
          });
        }
      }
      if (mappingsToCreate.length > 0) {
        await prisma.courtFormMapping.createMany({ data: mappingsToCreate });
      }
    }
  } catch (autoMapErr) {
    console.warn('[PDF_UPLOAD] Auto-mapping skipped:', autoMapErr.message);
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
