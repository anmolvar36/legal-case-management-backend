const { PDFDocument } = require('pdf-lib');

async function test() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([500, 500]);
  const form = pdfDoc.getForm();
  const textField = form.createTextField('test.field');
  textField.addToPage(page, { x: 50, y: 50, width: 200, height: 50 });
  
  if (typeof textField.setFontSize === 'function') {
    console.log('setFontSize exists');
  } else {
    console.log('setFontSize does not exist');
  }
}

test().catch(console.error);
