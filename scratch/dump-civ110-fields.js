const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function dumpFields() {
  const rawPath = path.join(process.cwd(), 'uploads', 'templates', 'CIV-110.pdf');
  const bytes = fs.readFileSync(rawPath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`CIV-110 has ${fields.length} fields:`);
  fields.forEach(f => {
    console.log(`- Name: "${f.getName()}" | Type: ${f.constructor.name}`);
  });
}

dumpFields();
