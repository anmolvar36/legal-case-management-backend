const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function checkFields() {
  const filePath = path.join(process.cwd(), 'uploads', 'templates', 'CIV-010_1784269775323.pdf');
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }
  const bytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  console.log('Total fields found:', fields.length);
  fields.forEach(f => {
    console.log(`Field Name: "${f.getName()}", Type: "${f.constructor.name}"`);
  });
}

checkFields().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
