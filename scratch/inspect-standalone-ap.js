const { PDFDocument, PDFName } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function checkAP() {
  const filePath = path.join(process.cwd(), 'scratch', 'standalone_SUBP-010.pdf');
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }
  const bytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log('Inspecting Appearance Streams (/AP) for filled fields in standalone_SUBP-010.pdf:');
  fields.forEach(f => {
    if (f.constructor.name === 'PDFTextField') {
      const val = f.getText();
      if (val) {
        const widgets = f.acroField.getWidgets();
        const hasAP = widgets.some(w => w.dict.has(PDFName.of('AP')));
        console.log(`- Field: "${f.getName()}"`);
        console.log(`  Value (/V): "${val.replace(/\n/g, '\\n')}"`);
        console.log(`  Has /AP: ${hasAP}`);
      }
    }
  });
}

checkAP();
