const { PDFDocument, PDFName, PDFDict } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function inspectButtons() {
  const templatePath = path.join(process.cwd(), 'uploads', 'templates', 'SUBP-010.pdf');
  const generatedPath = path.join(process.cwd(), 'scratch', 'standalone_SUBP-010.pdf');

  const printButtonInfo = (filePath) => {
    console.log(`\nButton actions in: ${path.basename(filePath)}`);
    const bytes = fs.readFileSync(filePath);
    const pdfDoc = PDFDocument.load ? null : {}; // We'll load properly
    return PDFDocument.load(bytes, { ignoreEncryption: true }).then(doc => {
      const form = doc.getForm();
      const fields = form.getFields();
      fields.forEach(f => {
        if (f.constructor.name === 'PDFButton') {
          const name = f.getName();
          const widgets = f.acroField.getWidgets();
          console.log(`- Button name: "${name}"`);
          widgets.forEach((w, idx) => {
            const wDict = w.dict;
            const aAction = wDict.get(PDFName.of('A'));
            const aaAction = wDict.get(PDFName.of('AA'));
            console.log(`  Widget ${idx}:`);
            console.log(`    Has /A (Action): ${!!aAction}`);
            if (aAction) {
              const aResolved = doc.context.lookup(aAction);
              console.log(`    /A Content:`, aResolved.toString());
            }
            console.log(`    Has /AA (Additional Actions): ${!!aaAction}`);
            if (aaAction) {
              const aaResolved = doc.context.lookup(aaAction);
              console.log(`    /AA Content:`, aaResolved.toString());
            }
          });
        }
      });
    });
  };

  await printButtonInfo(templatePath);
  await printButtonInfo(generatedPath);
}

inspectButtons();
