const { PDFDocument } = require('pdf-lib');

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
  if (typeof str !== 'string') return '';
  let clean = str
    .replace(/[\u2018\u2019]/g, "'") // curly single quotes
    .replace(/[\u201C\u201D]/g, '"') // curly double quotes
    .replace(/[\u2013\u2014]/g, '-') // dashes
    .replace(/\uFFFD/g, '');         // replacement character 
    
  return clean.split('').map(char => {
    const code = char.charCodeAt(0);
    if (code >= 32 && code <= 255) {
      return char;
    }
    return '';
  }).join('');
}

/**
 * Fills field values in an AcroForm PDF buffer.
 * @param {Buffer} buffer
 * @param {Object} fieldValuesMap - key-value mapping of field names to values
 * @returns {Promise<Buffer>} - filled PDF buffer
 */
async function fillFields(buffer, fieldValuesMap) {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    
    for (const [fieldName, val] of Object.entries(fieldValuesMap)) {
      try {
        const field = form.getField(fieldName);
        if (field) {
          const type = field.constructor.name;
          if (type === 'PDFTextField') {
            const sanitizedValue = sanitizeWinAnsiString(String(val || ''));
            field.setText(sanitizedValue);
          } else if (type === 'PDFCheckBox') {
            const isTrue = val === true || String(val).toLowerCase() === 'true' || String(val).toLowerCase() === 'yes';
            if (isTrue) {
              field.check();
            } else {
              field.uncheck();
            }
          }
        }
      } catch (err) {
        console.warn(`[PDF_ACROFORM] Field ${fieldName} fill error:`, err.message);
      }
    }

    const pdfBytes = await pdfDoc.save();
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
