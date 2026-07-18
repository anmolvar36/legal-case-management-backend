const { PDFDocument, StandardFonts, PDFName } = require('pdf-lib');

/**
 * Extracts form field names from an AcroForm PDF buffer.
 * @param {Buffer} buffer
 * @returns {Promise<string[]>}
 */
async function extractFields(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    return fields.map(f => f.getName());
  } catch (err) {
    console.error('[PDF_ACROFORM] Error extracting fields:', err.message);
    return [];
  }
}

function sanitizeWinAnsiString(str) {
  if (str === null || str === undefined) return '';
  const valStr = String(str);
  const clean = valStr
    .replace(/[\u2018\u2019]/g, "'") // curly single quotes
    .replace(/[\u201C\u201D]/g, '"') // curly double quotes
    .replace(/[\u2013\u2014]/g, '-') // dashes
    .replace(/\uFFFD/g, '');         // replacement character 
    
  return clean.split('').map(char => {
    const code = char.charCodeAt(0);
    if ((code >= 32 && code <= 255) || code === 10 || code === 13 || code === 9) {
      return char;
    }
    return '';
  }).join('');
}

/**
 * Fills field values in an AcroForm PDF buffer while preserving editable interactive fields.
 * @param {Buffer} buffer
 * @param {Object} fieldValuesMap - key-value mapping of field names to values
 * @param {Object} [formData] - optional full form data object for smart fallback matching
 * @returns {Promise<Buffer>} - filled PDF buffer
 */
async function fillFields(buffer, fieldValuesMap = {}, formData = {}) {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

    // Preserve XFA array if present before pdfDoc.getForm()
    let acroFormDict = null;
    let xfaObj = null;
    try {
      const acroFormRef = pdfDoc.catalog.get(PDFName.of('AcroForm'));
      if (acroFormRef) {
        acroFormDict = pdfDoc.context.lookup(acroFormRef);
        if (acroFormDict && typeof acroFormDict.get === 'function') {
          xfaObj = acroFormDict.get(PDFName.of('XFA'));
        }
      }
    } catch (xfaPreErr) {
      console.warn('[PDF_ACROFORM] XFA pre-preservation notice:', xfaPreErr.message);
    }

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const form = pdfDoc.getForm();
    const allFields = form.getFields();

    // Combined data lookup pool
    const dataPool = { ...formData, ...fieldValuesMap };
    let filledCount = 0;

    console.log(`[PDF_ACROFORM_RUNTIME] Processing ${allFields.length} AcroForm fields...`);

    for (const field of allFields) {
      try {
        const fName = field.getName();
        const type = field.constructor.name;

        // 1. Direct match by exact fieldName
        let valueToFill = fieldValuesMap[fName] !== undefined && fieldValuesMap[fName] !== '' 
          ? fieldValuesMap[fName] 
          : dataPool[fName];

        // 2. Smart Fuzzy Matcher if direct value is missing
        if (valueToFill === undefined || valueToFill === null || valueToFill === '') {
          const lowerName = fName.toLowerCase();

          // Case Number
          if (lowerName.includes('casenumber') || lowerName.includes('case_number') || lowerName.includes('caseno')) {
            valueToFill = dataPool.case_number;
          } 
          // State Bar Number
          else if (lowerName.includes('attybarno') || lowerName.includes('barno') || lowerName.includes('statebar')) {
            valueToFill = dataPool['Atty Bar No'] || dataPool.bar_number;
          } 
          // Attorney Name
          else if (lowerName.includes('attname') || (lowerName.includes('atty') && lowerName.includes('name')) || lowerName.includes('attorney_name') || lowerName.includes('partywithoutattorney')) {
            valueToFill = dataPool.attorney_name;
          } 
          // Firm Name
          else if (lowerName.includes('attyfirm') || lowerName.includes('firm_name') || lowerName.includes('firmname') || lowerName.includes('lawfirm')) {
            valueToFill = dataPool.firm_name;
          } 
          // Firm / Attorney Address
          else if (lowerName.includes('firm_address') || (lowerName.includes('atty') && lowerName.includes('street')) || lowerName.includes('attorneyaddress')) {
            valueToFill = dataPool.firm_address;
          } 
          // Phone / Telephone Number
          else if (lowerName.includes('telephone') || lowerName.includes('phone') || lowerName.includes('tel') || lowerName.includes('firm_phone')) {
            valueToFill = dataPool.firm_phone || dataPool.client_phone;
          } 
          // Email Address
          else if (lowerName.includes('email') || lowerName.includes('e-mail') || lowerName.includes('attorney_email')) {
            valueToFill = dataPool.attorney_email || dataPool.client_email;
          } 
          // Attorney For / Client Name
          else if (lowerName.includes('attyfor') || lowerName.includes('attorneyfor')) {
            valueToFill = dataPool.client_name || dataPool.plaintiff;
          } 
          // Court County / Superior Court Name
          else if (lowerName.includes('crtcounty') || lowerName.includes('court_name') || lowerName.includes('superiorcourt') || lowerName.includes('courtname')) {
            valueToFill = dataPool.court_name;
          } 
          // Court Street Address / Mailing Address
          else if (lowerName.includes('crtstreet') || lowerName.includes('crtmailingadd') || lowerName.includes('court_address') || lowerName.includes('courtaddress')) {
            valueToFill = dataPool.court_address;
          } 
          // Plaintiff / Petitioner / Party 1
          else if (lowerName.includes('party1') || lowerName.includes('plaintiff') || lowerName.includes('petitioner')) {
            valueToFill = dataPool.plaintiff;
          } 
          // Defendant / Respondent / Party 2
          else if (lowerName.includes('party2') || lowerName.includes('defendant') || lowerName.includes('respondent')) {
            valueToFill = dataPool.defendant;
          } 
          // Applicant / Client Name
          else if (lowerName.includes('applicantname') || lowerName.includes('client_name') || lowerName.includes('clientname')) {
            valueToFill = dataPool.client_name || dataPool.plaintiff;
          }
        }

        if (valueToFill !== undefined && valueToFill !== null && valueToFill !== '') {
          if (type === 'PDFTextField') {
            const sanitizedValue = sanitizeWinAnsiString(valueToFill);
            field.setText(sanitizedValue);
            try {
              field.defaultUpdateAppearances(helveticaFont);
            } catch (fErr) {}
            filledCount++;
            console.log(`[PDF_ACROFORM_RUNTIME] Written Field "${fName}" = "${sanitizedValue}"`);
          } else if (type === 'PDFCheckBox') {
            const isTrue = valueToFill === true || String(valueToFill).toLowerCase() === 'true' || String(valueToFill).toLowerCase() === 'yes';
            if (isTrue) {
              field.check();
            } else {
              field.uncheck();
            }
            filledCount++;
            console.log(`[PDF_ACROFORM_RUNTIME] Written CheckBox "${fName}" = ${isTrue}`);
          } else if (type === 'PDFDropdown' || type === 'PDFOptionGroup' || type === 'PDFRadioGroup') {
            try {
              const sanitizedVal = sanitizeWinAnsiString(valueToFill);
              if (sanitizedVal) {
                field.select(sanitizedVal);
                filledCount++;
                console.log(`[PDF_ACROFORM_RUNTIME] Selected Option "${fName}" = "${sanitizedVal}"`);
              }
            } catch (selErr) {
              console.warn(`[PDF_ACROFORM] Select error for ${fName}:`, selErr.message);
            }
          }
        }
      } catch (err) {
        console.warn(`[PDF_ACROFORM] Field ${field.getName()} fill error:`, err.message);
      }
    }

    // Generate visual appearance streams for all fields in the form
    try {
      form.updateFieldAppearances(helveticaFont);
      console.log('[PDF_ACROFORM_RUNTIME] Successfully updated visual appearance streams for all AcroForm fields!');
    } catch (appErr) {
      console.warn('[PDF_ACROFORM_RUNTIME] Notice updating field appearances:', appErr.message);
    }

    // Force PDF Viewers to generate appearances for all filled AcroForm fields
    if (acroFormDict && typeof acroFormDict.set === 'function') {
      try {
        acroFormDict.set(PDFName.of('NeedsAppearances'), pdfDoc.context.obj(true));
        console.log('[PDF_ACROFORM_RUNTIME] Set /NeedsAppearances true on AcroForm dictionary');
      } catch (needsErr) {
        console.warn('[PDF_ACROFORM_RUNTIME] NeedsAppearances setting warning:', needsErr.message);
      }
    }

    const pdfBytes = await pdfDoc.save();
    console.log(`[PDF_ACROFORM_RUNTIME] Total Filled Fields: ${filledCount} | Saved Output PDF Byte Length: ${pdfBytes.length} bytes`);
    return Buffer.from(pdfBytes);
  } catch (err) {
    console.error('[PDF_ACROFORM] Error filling PDF form:', err.message);
    throw err;
  }
}

module.exports = {
  extractFields,
  fillFields
};
