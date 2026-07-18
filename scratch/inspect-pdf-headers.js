const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function inspectPdfHeaders() {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'templates');
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.pdf'));

  console.log(`Found ${files.length} PDF files in uploads/templates:\n`);

  for (const file of files) {
    const fullPath = path.join(uploadsDir, file);
    const pdfBytes = fs.readFileSync(fullPath);
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();
      let formTitle = 'UNKNOWN';
      try {
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        if (fields.length > 0) {
          formTitle = fields[0].getName();
        }
      } catch (e) {}

      console.log(`File: "${file}"`);
      console.log(`  Size: ${pdfBytes.length} bytes | Pages: ${pageCount}`);
      console.log(`  Sample Field Name: "${formTitle}"`);
      console.log('---');
    } catch (err) {
      console.log(`File: "${file}" -> Error loading PDF: ${err.message}`);
    }
  }
}

inspectPdfHeaders();
