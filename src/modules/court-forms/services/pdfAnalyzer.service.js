const { PDFDocument } = require('pdf-lib');

/**
 * Analyzes a PDF buffer to detect its type.
 * @param {Buffer} buffer
 * @returns {Promise<{type: 'ACROFORM' | 'XFA' | 'FLAT'}>}
 */
async function analyzePdf(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    
    // Check Catalog for XFA dictionary entry
    let hasXfa = false;
    try {
      const catalog = pdfDoc.catalog;
      if (catalog && typeof catalog.get === 'function') {
        const acroForm = catalog.get(pdfDoc.context.obj('AcroForm'));
        if (acroForm) {
          const acroFormDict = pdfDoc.context.lookup(acroForm);
          if (acroFormDict && typeof acroFormDict.get === 'function') {
            const xfa = acroFormDict.get(pdfDoc.context.obj('XFA'));
            if (xfa) {
              hasXfa = true;
            }
          }
        }
      }
    } catch (err) {
      // Ignore resolution errors
    }

    // Fallback: Check raw buffer string for XFA indicators
    if (!hasXfa) {
      const rawStr = buffer.toString('binary');
      if (rawStr.includes('/XFA') || rawStr.includes('<xfa') || rawStr.includes('xfa:datasets')) {
        hasXfa = true;
      }
    }

    if (hasXfa) {
      return { type: 'XFA' };
    }

    const form = pdfDoc.getForm();
    const fields = form.getFields();

    if (fields.length > 0) {
      return { type: 'ACROFORM' };
    }

    return { type: 'FLAT' };
  } catch (e) {
    console.error('[PDF_ANALYZER] Error loading PDF for analysis, treating as FLAT:', e.message);
    return { type: 'FLAT' };
  }
}

module.exports = {
  analyzePdf
};
