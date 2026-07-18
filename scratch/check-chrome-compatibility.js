const { PDFDocument, PDFName } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function checkAP() {
  const filePath = path.join(process.cwd(), 'scratch', 'SUBP010_field_ap_saved.pdf');
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }
  const bytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log('Inspecting Appearance Streams (/AP) for filled fields:');
  fields.forEach(f => {
    if (f.constructor.name === 'PDFTextField') {
      const val = f.getText();
      if (val) {
        const widgets = f.acroField.getWidgets();
        const hasAP = widgets.some(w => w.dict.has(PDFName.of('AP')));
        const apDict = widgets.map(w => w.dict.get(PDFName.of('AP')));
        console.log(`- Field: "${f.getName()}"`);
        console.log(`  Value (/V): "${val}"`);
        console.log(`  Has /AP: ${hasAP}`);
        console.log(`  /AP Content:`, apDict.map(d => d ? d.toString() : 'null').join(', '));
      }
    }
  });
}

checkAP();
