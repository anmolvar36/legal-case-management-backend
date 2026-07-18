const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function inspectCoordinates() {
  const rawPath = path.join(process.cwd(), 'uploads', 'templates', 'CIV-010.pdf');
  const bytes = fs.readFileSync(rawPath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`Field locations in CIV-010:`);
  fields.forEach(f => {
    const name = f.getName();
    const type = f.constructor.name;
    const widgets = f.acroField.getWidgets();
    if (widgets.length > 0) {
      const widget = widgets[0];
      const rect = widget.getRectangle();
      let pageIndex = -1;
      const pages = pdfDoc.getPages();
      
      const wRefStr = widget.ref ? widget.ref.toString() : null;

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const annots = page.node.Annots();
        if (annots) {
          for (let j = 0; j < annots.size(); j++) {
            const annotRef = annots.get(j);
            const resolved = pdfDoc.context.lookup(annotRef);
            if (resolved === widget || resolved === widget.dict || (widget.ref && annotRef.num === widget.ref.num && annotRef.gen === widget.ref.gen)) {
              pageIndex = i;
              break;
            }
          }
        }
        if (pageIndex !== -1) break;
      }
      console.log(`- "${name}" | Page: ${pageIndex} | X: ${rect.x.toFixed(1)}, Y: ${rect.y.toFixed(1)} | W: ${rect.width.toFixed(1)}, H: ${rect.height.toFixed(1)}`);
    }
  });
}

inspectCoordinates();
