const prisma = require('../../config/db');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

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
// Collects all known system data for a Matter to prefill form fields
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

  // Fetch custom field values for this matter
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

  // Build client full address from structured fields
  const clientAddr = [
    matter.client?.address_line_1,
    matter.client?.address_line_2,
    matter.client?.city,
    matter.client?.state,
    matter.client?.postal_code,
  ].filter(Boolean).join(', ');

  // Build firm address from company profile
  const firmAddr = [
    companyProfile?.address_line_1 || companyProfile?.address,
    companyProfile?.city,
    companyProfile?.state,
    companyProfile?.postal_code,
  ].filter(Boolean).join(', ');

  return {
    // Attorney / Firm
    attorney_name: matter.assigned_lawyer?.full_name || '',
    attorney_email: matter.assigned_lawyer?.email || '',
    firm_name: companyProfile?.company_name || companyProfile?.name || '',
    firm_address: firmAddr,
    firm_phone: companyProfile?.phone || '',
    firm_email: companyProfile?.email || '',
    // Client / Plaintiff
    client_name: matter.client?.full_name || '',
    client_address: clientAddr,
    client_phone: matter.client?.phone || '',
    client_email: matter.client?.email || '',
    // Matter
    case_title: matter.title || '',
    case_number: matter.case_number || '',
    matter_number: matter.matter_number || '',
    plaintiff: matter.client?.full_name || '',
    defendant: matter.opposing_party_name || '',
    filing_date: matter.initial_filing_date
      ? matter.initial_filing_date.toISOString().split('T')[0]
      : '',
    // Court
    court_name: matter.court_name || '',
    court_address: matter.court_address || '',
    judge_name: matter.judge_name || '',
    // Hearing
    hearing_date: nextHearing
      ? nextHearing.event_date.toISOString().split('T')[0]
      : (matter.next_hearing ? new Date(matter.next_hearing).toISOString().split('T')[0] : ''),
    hearing_location: nextHearing?.location || matter.court_name || '',
    // Custom Fields
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

// ── PDF GENERATION ────────────────────────────────────────────
exports.generatePdf = async (draftId) => {
  const form = await prisma.generatedForm.findUnique({
    where: { id: parseInt(draftId) },
    include: {
      template: { include: { mappings: true } },
      matter: true,
    },
  });
  if (!form) throw new Error('Form draft not found');

  const formData = form.form_data;
  const template = form.template;

  // Load master PDF template if it exists on disk, otherwise create a basic PDF
  const uploadDir = path.join(process.cwd(), 'uploads', 'templates');
  const generatedDir = path.join(process.cwd(), 'uploads', 'generated');
  if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

  let pdfDoc;
  let masterPath = template.pdf_path
    ? path.join(process.cwd(), template.pdf_path)
    : null;

  if (masterPath) {
    try {
      const existingPdfBytes = fs.readFileSync(masterPath);
      pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
      
      let pdfForm = null;
      try {
        pdfForm = pdfDoc.getForm();
      } catch (e) {
        console.warn('PDF does not contain interactive form fields');
      }

      const { PDFTextField, PDFCheckBox, StandardFonts } = require('pdf-lib');
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      if (pdfForm) {
        const fields = pdfForm.getFields();
        for (const field of fields) {
          const fieldName = field.getName();
          const mapping = template.mappings.find((m) => m.pdf_field_name === fieldName);
          const systemKey = mapping ? mapping.system_field_path : fieldName;
          const value = formData[systemKey] || formData[fieldName] || '';

          try {
            if (field instanceof PDFTextField) {
              try {
                field.setText(String(value));
              } catch (err) {
                console.warn(`Bypassed field.setText crash for ${fieldName}:`, err.message);
                try {
                  field.acroField.setValue(String(value));
                } catch (_) {}
              }
            } else if (field instanceof PDFCheckBox) {
              if (value && (value === true || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'yes')) {
                field.check();
              } else {
                field.uncheck();
              }
            }
          } catch (err) {
            console.warn(`Failed to set field ${fieldName}:`, err.message);
          }
        }
        try {
          pdfForm.flatten();
        } catch (err) {
          console.warn('Failed to flatten PDF form:', err.message);
        }
      }
    } catch (crashError) {
      console.error('Bypassed top-level PDFDict crash. Triggering graceful flat PDF fallback:', crashError.message);
      masterPath = null; // Forces execution to fall back to the safe document builder block below
    }
  }

  if (!masterPath) {
    // No master PDF uploaded yet — create a clean informational PDF
    pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const { height } = page.getSize();
    const { StandardFonts } = require('pdf-lib');
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText(`${template.form_number} — ${template.title}`, {
      x: 50, y: height - 60, size: 16, font: boldFont,
    });
    page.drawText('CALIFORNIA JUDICIAL COUNCIL FORM', {
      x: 50, y: height - 80, size: 10, font,
    });

    // Draw a divider line
    page.drawLine({ start: { x: 50, y: height - 95 }, end: { x: 562, y: height - 95 }, thickness: 1 });

    let y = height - 120;
    const sections = [
      { label: 'Case Title', key: 'case_title' },
      { label: 'Case Number', key: 'case_number' },
      { label: 'Court', key: 'court_name' },
      { label: 'Judge', key: 'judge_name' },
      { label: 'Attorney', key: 'attorney_name' },
      { label: 'Firm', key: 'firm_name' },
      { label: 'Plaintiff / Client', key: 'client_name' },
      { label: 'Defendant', key: 'defendant' },
      { label: 'Filing Date', key: 'filing_date' },
      { label: 'Hearing Date', key: 'hearing_date' },
    ];

    for (const section of sections) {
      const val = formData[section.key] || '';
      page.drawText(`${section.label}:`, { x: 50, y, size: 10, font: boldFont });
      page.drawText(val, { x: 200, y, size: 10, font });
      y -= 22;
      if (y < 80) break;
    }

    // Add remaining custom fields
    const knownKeys = new Set(sections.map(s => s.key));
    for (const [key, value] of Object.entries(formData)) {
      if (knownKeys.has(key) || !value) continue;
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      page.drawText(`${label}:`, { x: 50, y, size: 10, font: boldFont });
      page.drawText(String(value), { x: 200, y, size: 10, font });
      y -= 22;
      if (y < 80) break;
    }

    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 50, y: 40, size: 8, font,
    });
  }

  const fileName = `${template.form_number}_matter-${form.matter_id}_${Date.now()}.pdf`;
  const outputPath = path.join(generatedDir, fileName);
  const pdfBytes = await pdfDoc.save({ updateFieldAppearances: false });
  fs.writeFileSync(outputPath, pdfBytes);

  // Update draft record
  await prisma.generatedForm.update({
    where: { id: parseInt(draftId) },
    data: { pdf_file_name: fileName, status: 'completed' },
  });

  return { fileName, filePath: outputPath, pdfBytes };
};

// ── MAPPINGS (Admin) ─────────────────────────────────────────
exports.saveMappings = async (templateId, mappings) => {
  // Delete existing and re-insert in one go
  await prisma.courtFormMapping.deleteMany({ where: { template_id: parseInt(templateId) } });
  if (!mappings || mappings.length === 0) return [];
  return prisma.courtFormMapping.createMany({
    data: mappings.map((m) => ({
      template_id: parseInt(templateId),
      pdf_field_name: m.pdf_field_name,
      system_field_path: m.system_field_path || '',
    })),
  });
};

exports.uploadTemplate = async (metaData, file) => {
  const { form_number, title, practice_area } = metaData;
  if (!form_number || !title) throw new Error('Form number and title are required');
  if (!file) throw new Error('PDF file is required');

  const templatesDir = path.join(process.cwd(), 'uploads', 'templates');
  if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });

  const destinationFileName = `${form_number.trim().toUpperCase()}_${Date.now()}.pdf`;
  const relativePdfPath = path.join('uploads', 'templates', destinationFileName);
  const absolutePdfPath = path.join(process.cwd(), relativePdfPath);

  // Write file to templates folder
  fs.writeFileSync(absolutePdfPath, file.buffer);

  // Load and parse PDF using pdf-lib
  let pdfFieldNames = [];
  try {
    const pdfDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
    const pdfForm = pdfDoc.getForm();
    const pdfFields = pdfForm.getFields();
    pdfFieldNames = pdfFields.map(f => f.getName());
  } catch (err) {
    console.error('Failed parsing PDF form fields:', err);
    // Remove the file if parsing failed
    if (fs.existsSync(absolutePdfPath)) fs.unlinkSync(absolutePdfPath);
    throw new Error('Invalid fillable PDF template structure');
  }

  // Check if form_number already exists, if so delete the old one first to overwrite it!
  const normFormNum = form_number.trim().toUpperCase();
  const existingForm = await prisma.courtFormTemplate.findUnique({
    where: { form_number: normFormNum }
  });
  if (existingForm) {
    // 1. Delete physical file
    const oldPdfPath = path.join(process.cwd(), existingForm.pdf_path);
    if (fs.existsSync(oldPdfPath)) {
      try { fs.unlinkSync(oldPdfPath); } catch (e) { console.error('Failed to delete old pdf:', e); }
    }
    // 2. Delete database record
    await prisma.courtFormTemplate.delete({
      where: { id: existingForm.id }
    });
  }

  // Create template record in db
  const template = await prisma.courtFormTemplate.create({
    data: {
      form_number: normFormNum,
      title: title.trim(),
      practice_area: practice_area ? practice_area.trim() : null,
      pdf_path: relativePdfPath,
    }
  });

function autoMapFieldName(fieldName) {
  const lower = fieldName.toLowerCase();
  
  if (lower.includes('casenumber') || lower.includes('case_number') || (lower.includes('case') && lower.includes('no'))) return 'case_number';
  if (lower.includes('casetitle') || lower.includes('casename') || (lower.includes('case') && lower.includes('title')) || (lower.includes('case') && lower.includes('name'))) return 'case_title';
  if (lower.includes('judgename') || lower.includes('judge') || lower.includes('dept')) return 'judge_name';
  
  // Attorney / Firm
  if (lower.includes('attypartyinfo') && lower.includes('name')) return 'attorney_name';
  if (lower.includes('attorneyname') || lower.includes('attyname') || lower.includes('lawyername')) return 'attorney_name';
  
  if (lower.includes('attypartyinfo') && lower.includes('email')) return 'attorney_email';
  if (lower.includes('attorneyemail') || lower.includes('attyemail') || lower.includes('lawyeremail')) return 'attorney_email';
  
  if (lower.includes('attyfirm') || lower.includes('firmname') || lower.includes('firm_name')) return 'firm_name';
  
  if (lower.includes('attypartyinfo') && (lower.includes('street') || lower.includes('city') || lower.includes('address') || lower.includes('state') || lower.includes('zip'))) return 'firm_address';
  if (lower.includes('firmaddress') || lower.includes('firm_address')) return 'firm_address';
  
  if (lower.includes('attypartyinfo') && (lower.includes('phone') || lower.includes('telephone') || lower.includes('telno'))) return 'firm_phone';
  if (lower.includes('firmphone') || lower.includes('firm_phone')) return 'firm_phone';
  
  // Parties
  if (lower.includes('plaintiff') || lower.includes('petitioner') || lower.includes('pltf')) return 'plaintiff';
  if (lower.includes('defendant') || lower.includes('respondent') || lower.includes('deft')) return 'defendant';
  
  // Client details
  if (lower.includes('clientname') || lower.includes('client_name')) return 'client_name';
  if (lower.includes('clientemail') || lower.includes('client_email')) return 'client_email';
  if (lower.includes('clientphone') || lower.includes('client_phone')) return 'client_phone';
  if (lower.includes('clientaddress') || lower.includes('client_address')) return 'client_address';
  
  // Court
  if (lower.includes('courtname') || lower.includes('court_name') || lower.includes('superiorcourt')) return 'court_name';
  if (lower.includes('courtaddress') || lower.includes('court_address')) return 'court_address';
  
  // Dates
  if (lower.includes('filingdate') || lower.includes('filing_date')) return 'filing_date';
  if (lower.includes('hearingdate') || lower.includes('hearing_date')) return 'hearing_date';
  
  return '';
}

function getCleanFieldName(pdfFieldName) {
  const parts = pdfFieldName.split('.');
  const lastPart = parts[parts.length - 1];
  let clean = lastPart.replace(/\[\d+\]/g, '');
  clean = clean.replace(/_(ft|cb|rt|ft_|\.b)$/g, '');
  // Insert spaces before caps
  clean = clean.replace(/([A-Z])/g, ' $1').trim();
  
  // Standard overrides
  if (clean.toLowerCase().includes('galname')) return 'GAL Name';
  if (clean.toLowerCase().includes('gdn')) return 'Guardian Name';
  if (clean.toLowerCase().includes('minorname')) return 'Minor Name';
  if (clean.toLowerCase().includes('minordob')) return 'Minor DOB';
  return clean;
}

  // Pre-seed empty mapping records for the parsed field names
  if (pdfFieldNames.length > 0) {
    for (const fieldName of pdfFieldNames) {
      let systemPath = autoMapFieldName(fieldName);
      if (!systemPath) {
        const cleanName = getCleanFieldName(fieldName);
        if (cleanName && cleanName.length > 1) {
          let def = await prisma.customFieldDefinition.findFirst({
            where: { name: cleanName }
          });
          if (!def) {
            def = await prisma.customFieldDefinition.create({
              data: {
                name: cleanName,
                type: fieldName.toLowerCase().includes('_cb') ? 'checkbox' : 'text',
                is_active: true
              }
            });
          }
          systemPath = cleanName;
        }
      }

      await prisma.courtFormMapping.create({
        data: {
          template_id: template.id,
          pdf_field_name: fieldName,
          system_field_path: systemPath || ''
        }
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
    if (fs.existsSync(oldPdfPath)) {
      try { fs.unlinkSync(oldPdfPath); } catch (e) { console.error('Failed to delete pdf:', e); }
    }
  }

  await prisma.courtFormTemplate.delete({
    where: { id: templateId }
  });
};
