const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function testLoadRaw() {
  const files = ['SUBP-010.pdf', 'CIV-110.pdf', 'CIV-010.pdf'];
  const dir = path.join(process.cwd(), 'uploads', 'templates');

  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${file}`);
      continue;
    }
    const bytes = fs.readFileSync(fullPath);
    try {
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      console.log(`✓ successfully loaded "${file}" directly in pdf-lib! Fields count: ${fields.length}`);
    } catch (err) {
      console.log(`✗ failed to load "${file}" directly in pdf-lib: ${err.message}`);
    }
  }
}

testLoadRaw();
