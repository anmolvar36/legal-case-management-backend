const { PDFDocument, StandardFonts } = require('pdf-lib');

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
 * Draws text overlays on a PDF document based on coordinates mapping configuration.
 * @param {Buffer} buffer - original PDF bytes
 * @param {Array<Object>} mappingsList - array of coordinate mapping objects
 * @param {Object} fieldValuesMap - key-value pairs matching system_field_path to actual prefilled values
 * @returns {Promise<Buffer>} - modified PDF bytes
 */
async function fillCoordinates(buffer, mappingsList, fieldValuesMap) {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    for (const mapping of mappingsList) {
      const pageIndex = mapping.page_number;
      if (pageIndex < 0 || pageIndex >= pages.length) {
        console.warn(`[PDF_COORDINATE] Page index ${pageIndex} is out of bounds (total pages: ${pages.length})`);
        continue;
      }

      const page = pages[pageIndex];
      const systemKey = mapping.system_field_path;
      const value = systemKey ? (fieldValuesMap[systemKey] || '') : '';

      if (value !== undefined && value !== null && value !== '') {
        const x = parseFloat(mapping.x_position) || 0;
        const y = parseFloat(mapping.y_position) || 0;
        const fontSize = parseFloat(mapping.font_size) || 10;

        const lowerVal = String(value).toLowerCase();
        const isCheckboxChecked = value === true || lowerVal === 'true' || lowerVal === 'yes' || lowerVal === '1' || lowerVal === 'on';

        if (isCheckboxChecked) {
          page.drawText('X', {
            x,
            y,
            size: fontSize,
            font: helveticaFont
          });
        } else if (typeof value !== 'boolean') {
          const sanitizedValue = sanitizeWinAnsiString(String(value));
          page.drawText(sanitizedValue, {
            x,
            y,
            size: fontSize,
            font: helveticaFont
          });
        }
      }
    }

    const pdfBytes = await pdfDoc.save({ updateFieldAppearances: false });
    return Buffer.from(pdfBytes);
  } catch (err) {
    console.error('[PDF_COORDINATE] Error filling coordinates on PDF:', err.message);
    throw err;
  }
}

module.exports = {
  fillCoordinates
};
