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

    // Remove XFA array if present to prevent double text/ghosting
    let acroFormDict = null;
    try {
      const acroFormRef = pdfDoc.catalog.get(PDFName.of('AcroForm'));
      if (acroFormRef) {
        acroFormDict = pdfDoc.context.lookup(acroFormRef);
        if (acroFormDict && typeof acroFormDict.delete === 'function') {
          acroFormDict.delete(PDFName.of('XFA'));
//           console.log('[PDF_ACROFORM_RUNTIME] Successfully deleted XFA dictionary to prevent ghosting.');
        }
      }
    } catch (xfaPreErr) {
      console.warn('[PDF_ACROFORM] XFA removal notice:', xfaPreErr.message);
    }

    let helveticaFont = null;
    try {
      helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    } catch (fontErr) {
      console.warn('[PDF_ACROFORM] Font embed notice:', fontErr.message);
    }

    let form = null;
    let allFields = [];
    try {
      form = pdfDoc.getForm();
      if (form) {
        allFields = form.getFields();
      }
    } catch (getFormErr) {
      console.warn('[PDF_ACROFORM] AcroForm form lookup notice:', getFormErr.message);
    }

    // Combined data lookup pool
    const dataPool = { ...formData, ...fieldValuesMap };
    let filledCount = 0;

    const allFieldNames = allFields.map(f => f.getName().toLowerCase());
    const hasAttyForField = allFieldNames.some(name => name.includes('attyfor'));

//     console.log(`[PDF_ACROFORM_RUNTIME] Processing ${allFields.length} AcroForm fields...`);

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
          if (lowerName.includes('case') && (lowerName.includes('number') || lowerName.includes('no') || lowerName.includes('ft') || lowerName.includes('caseno'))) {
            valueToFill = dataPool.case_number;
          } 
          // State Bar Number
          else if (lowerName.includes('bar')) {
            valueToFill = dataPool['Atty Bar No'] || dataPool.bar_number;
          } 
          // Combined Attorney Box (for forms like SUBP-010 that don't have separate Name/Address fields)
          else if (lowerName.includes('textfield1') || lowerName.includes('attynameandaddress') || lowerName.includes('attorneyandaddress')) {
            const parts = [];
            if (dataPool.attorney_name) {
              let nameBar = dataPool.attorney_name;
              if (dataPool.bar_number || dataPool['Atty Bar No']) {
                nameBar += ` (Bar No. ${dataPool.bar_number || dataPool['Atty Bar No']})`;
              }
              parts.push(nameBar);
            }
            if (dataPool.firm_name) {
              parts.push(dataPool.firm_name);
            }
            if (dataPool.firm_address) {
              parts.push(dataPool.firm_address);
            }
            if (parts.length > 0) {
              valueToFill = parts.join('\n');
            }
          }
          // Attorney Name (only if the form has a dedicated AttyFor field, like CIV-110/CIV-010)
          else if (hasAttyForField && (lowerName.includes('attname') || (lowerName.includes('atty') && lowerName.includes('name')) || lowerName.includes('attorney_name') || lowerName.includes('partywithoutattorney'))) {
            valueToFill = dataPool.attorney_name;
          } 
          // Attorney For / Client Name
          else if (lowerName.includes('attyfor') || lowerName.includes('attorneyfor') || (!hasAttyForField && lowerName.includes('attypartyinfo') && lowerName.includes('name'))) {
            valueToFill = dataPool.client_name || dataPool.plaintiff;
          } 
          // Firm Name
          else if (lowerName.includes('attyfirm') || lowerName.includes('firm') || lowerName.includes('lawfirm')) {
            valueToFill = dataPool.firm_name;
          } 
          // Firm / Attorney Zip Code
          else if (lowerName.includes('zip')) {
            valueToFill = dataPool.firm_zip;
          }
          // Firm / Attorney City
          else if (lowerName.includes('city')) {
            valueToFill = dataPool.firm_city || dataPool.court_city;
          }
          // Firm / Attorney State
          else if (lowerName.includes('state')) {
            valueToFill = dataPool.firm_state || dataPool.court_state;
          }
          // Firm / Attorney Address - Street
          else if (lowerName.includes('street') || lowerName.includes('address') || lowerName.includes('addr')) {
            valueToFill = dataPool.firm_address || dataPool.court_address;
          } 
          // Phone / Telephone Number
          else if (lowerName.includes('telephone') || lowerName.includes('phone') || lowerName.includes('tel')) {
            valueToFill = dataPool.firm_phone || dataPool.client_phone;
          } 
          // Fax
          else if (lowerName.includes('fax')) {
            valueToFill = dataPool.firm_fax || dataPool.client_fax || '';
          }
          // Email Address
          else if (lowerName.includes('email') || lowerName.includes('e-mail')) {
            valueToFill = dataPool.attorney_email || dataPool.client_email;
          } 
          // Court County / Superior Court Name
          else if (lowerName.includes('crtcounty') || lowerName.includes('county') || lowerName.includes('superiorcourt') || lowerName.includes('courtname') || lowerName.includes('court_name') || lowerName.includes('crtbranch') || lowerName.includes('branch')) {
            valueToFill = dataPool.court_name;
          } 
          // Court Street Address / Mailing Address
          else if (lowerName.includes('crtstreet') || lowerName.includes('crtmailingadd') || lowerName.includes('crtcityzip') || lowerName.includes('court_address') || lowerName.includes('courtaddress')) {
            valueToFill = dataPool.court_address;
          } 
          // Plaintiff / Petitioner / Party 1
          else if (lowerName.includes('party1') || lowerName.includes('plaintiff') || lowerName.includes('petitioner')) {
            valueToFill = dataPool.plaintiff || dataPool.client_name;
          } 
          // Defendant / Respondent / Party 2
          else if (lowerName.includes('party2') || lowerName.includes('defendant') || lowerName.includes('respondent')) {
            valueToFill = dataPool.defendant;
          } 
          // Applicant / Client Name
          else if (lowerName.includes('applicant') || lowerName.includes('client')) {
            valueToFill = dataPool.client_name || dataPool.plaintiff;
          }
        }

        if (type === 'PDFButton') {
          const lowerName = fName.toLowerCase();
          const widgets = field.acroField.getWidgets();
          let actionDict = null;

          if (lowerName.includes('print')) {
            actionDict = pdfDoc.context.obj({
              S: 'JavaScript',
              JS: 'print();'
            });
//             console.log(`[PDF_ACROFORM_RUNTIME] Configured Print Action for Button "${fName}"`);
          } else if (lowerName.includes('save')) {
            actionDict = pdfDoc.context.obj({
              S: 'JavaScript',
              JS: 'app.execMenuItem("SaveAs");'
            });
//             console.log(`[PDF_ACROFORM_RUNTIME] Configured Save Action for Button "${fName}"`);
          } else if (lowerName.includes('reset') || lowerName.includes('clear')) {
            actionDict = pdfDoc.context.obj({
              S: 'ResetForm'
            });
//             console.log(`[PDF_ACROFORM_RUNTIME] Configured Reset/Clear Action for Button "${fName}"`);
          }

          if (actionDict) {
            widgets.forEach(widget => {
              widget.dict.set(PDFName.of('A'), actionDict);
            });
          }
        }

        if (valueToFill !== undefined && valueToFill !== null && valueToFill !== '') {
          if (type === 'PDFTextField') {
            const sanitizedValue = sanitizeWinAnsiString(valueToFill);
            
            // Auto-align text perfectly within the bounding box
            field.setFontSize(0);
            
            if (sanitizedValue.includes('\\n')) {
              field.enableMultiline();
            }
            
            const maxLength = field.getMaxLength();
            let finalValue = sanitizedValue;
            if (maxLength !== undefined && finalValue.length > maxLength) {
              finalValue = finalValue.substring(0, maxLength);
              console.warn(`[PDF_ACROFORM] Truncated field "${fName}" from ${sanitizedValue.length} to ${maxLength} chars`);
            }
            
            field.setText(finalValue);
            
            // Lock fixed attorney details so they cannot be edited in the PDF
            if (sanitizedValue && (
                sanitizedValue.includes('Victoria Tulsidas') || 
                sanitizedValue.includes('365147') ||
                sanitizedValue.includes('vtulsidas@victoriatulsidaslaw.com') ||
                sanitizedValue.includes('750 San Vincente Blvd') ||
                sanitizedValue === '90069' ||
                sanitizedValue === '(310) 504-2359' ||
                sanitizedValue === 'West Hollywood'
            )) {
                field.enableReadOnly();
            }
            
            filledCount++;
//             console.log(`[PDF_ACROFORM_RUNTIME] Written Field "${fName}" = "${sanitizedValue}"`);
          } else if (type === 'PDFCheckBox') {
            const isTrue = valueToFill === true || String(valueToFill).toLowerCase() === 'true' || String(valueToFill).toLowerCase() === 'yes';
            if (isTrue) {
              field.check();
            } else {
              field.uncheck();
            }
            filledCount++;
//             console.log(`[PDF_ACROFORM_RUNTIME] Written CheckBox "${fName}" = ${isTrue}`);
          } else if (type === 'PDFDropdown' || type === 'PDFOptionGroup' || type === 'PDFRadioGroup') {
            try {
              const sanitizedVal = sanitizeWinAnsiString(valueToFill);
              if (sanitizedVal) {
                field.select(sanitizedVal);
                filledCount++;
//                 console.log(`[PDF_ACROFORM_RUNTIME] Selected Option "${fName}" = "${sanitizedVal}"`);
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
    if (form && helveticaFont) {
      try {
        form.updateFieldAppearances(helveticaFont);
//         console.log('[PDF_ACROFORM_RUNTIME] Successfully updated visual appearance streams for all AcroForm fields!');
      } catch (appErr) {
        console.warn('[PDF_ACROFORM_RUNTIME] Notice updating field appearances:', appErr.message);
      }
    }

    // Disable NeedsAppearances to prevent "double text" / ghosting by PDF viewers
    if (acroFormDict && typeof acroFormDict.set === 'function') {
      try {
        acroFormDict.set(PDFName.of('NeedsAppearances'), pdfDoc.context.obj(false));
//         console.log('[PDF_ACROFORM_RUNTIME] Set /NeedsAppearances false to prevent double text');
      } catch (needsErr) {
        console.warn('[PDF_ACROFORM_RUNTIME] NeedsAppearances setting warning:', needsErr.message);
      }
    }

    let pdfBytes;
    try {
      pdfBytes = await pdfDoc.save();
//       console.log('[PDF_ACROFORM_RUNTIME] Successfully saved PDF with default serialization options.');
    } catch (saveErr) {
      console.warn('[PDF_ACROFORM_RUNTIME] Failed default save, falling back to updateFieldAppearances: false. Error:', saveErr.message);
      pdfBytes = await pdfDoc.save({ updateFieldAppearances: false });
    }

//     console.log(`[PDF_ACROFORM_RUNTIME] Total Filled Fields: ${filledCount} | Saved Output PDF Byte Length: ${pdfBytes.length} bytes`);
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
