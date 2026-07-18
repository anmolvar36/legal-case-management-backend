const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function verifyAcroform() {
  const filePath = path.join(process.cwd(), 'scratch', 'SUBP010_pure_acroform.pdf');
  const bytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log('Verifying Fields in scratch/SUBP010_pure_acroform.pdf:');
  let filledCount = 0;
  fields.forEach(f => {
    if (f.constructor.name === 'PDFTextField') {
      const val = f.getText();
      if (val) {
        filledCount++;
        console.log(`- "${f.getName()}" = "${val}"`);
      }
    }
  });
  console.log(`\nTotal Filled Fields: ${filledCount}`);
}

verifyAcroform();
