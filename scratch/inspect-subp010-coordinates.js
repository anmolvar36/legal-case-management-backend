const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function inspectCoordinates() {
  const rawPath = path.join(process.cwd(), 'scratch', 'SUBP010_uncompressed.pdf');
  if (!fs.existsSync(rawPath)) {
    console.error(`File does not exist: ${rawPath}. Run test-fill-subp010-exact.js first.`);
    return;
  }
  const bytes = fs.readFileSync(rawPath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`Field locations in SUBP-010 (Uncompressed):`);
  fields.forEach(f => {
    const name = f.getName();
    const type = f.constructor.name;
    const widgets = f.acroField.getWidgets();
    if (widgets.length > 0) {
      const widget = widgets[0];
      const rect = widget.getRectangle();
      // Find which page this widget belongs to
      let pageIndex = -1;
      const pages = pdfDoc.getPages();
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const annots = page.node.Annots();
        if (annots) {
          for (let j = 0; j < annots.size(); j++) {
            const annotRef = annots.get(j);
            if (annotRef === widget.ref) {
              pageIndex = i;
              break;
            }
          }
        }
        if (pageIndex !== -1) break;
      }
      console.log(`- "${name}" | Type: ${type} | Page: ${pageIndex} | X: ${rect.x.toFixed(1)}, Y: ${rect.y.toFixed(1)} | W: ${rect.width.toFixed(1)}, H: ${rect.height.toFixed(1)}`);
    } else {
      console.log(`- "${name}" | Type: ${type} | No Widget`);
    }
  });
}

inspectCoordinates();
