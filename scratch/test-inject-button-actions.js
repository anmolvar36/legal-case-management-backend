const { PDFDocument, PDFName } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function injectActions() {
  const filePath = path.join(process.cwd(), 'scratch', 'standalone_SUBP-010.pdf');
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }
  const bytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log('Injecting Actions for PDF Buttons:');

  fields.forEach(f => {
    if (f.constructor.name === 'PDFButton') {
      const name = f.getName();
      const lowerName = name.toLowerCase();
      const widgets = f.acroField.getWidgets();

      let actionDict = null;

      if (lowerName.includes('print')) {
        console.log(`- Found Print Button: "${name}"`);
        // Named Action /Print or JS print()
        actionDict = pdfDoc.context.obj({
          S: 'JavaScript',
          JS: 'print();'
        });
      } else if (lowerName.includes('save')) {
        console.log(`- Found Save Button: "${name}"`);
        // JS app.execMenuItem("SaveAs")
        actionDict = pdfDoc.context.obj({
          S: 'JavaScript',
          JS: 'app.execMenuItem("SaveAs");'
        });
      } else if (lowerName.includes('reset') || lowerName.includes('clear')) {
        console.log(`- Found Reset/Clear Button: "${name}"`);
        // ResetForm action
        actionDict = pdfDoc.context.obj({
          S: 'ResetForm'
        });
      }

      if (actionDict) {
        widgets.forEach((widget, idx) => {
          widget.dict.set(PDFName.of('A'), actionDict);
          console.log(`  ✓ Set /A action on widget ${idx}`);
        });
      }
    }
  });

  const outBytes = await pdfDoc.save({ updateFieldAppearances: false });
  const outPath = path.join(process.cwd(), 'scratch', 'SUBP010_with_button_actions.pdf');
  fs.writeFileSync(outPath, outBytes);
  console.log(`✓ Saved: ${outPath}`);
}

injectActions();
