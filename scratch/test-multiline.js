const { PDFDocument } = require('pdf-lib');

async function test() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([500, 500]);
  const form = pdfDoc.getForm();
  const textField = form.createTextField('test.field');
  textField.addToPage(page, { x: 50, y: 50, width: 200, height: 50 });
  
  if (typeof textField.enableMultiline === 'function') {
    console.log('enableMultiline exists');
  } else {
    console.log('enableMultiline does not exist');
  }
}

test().catch(console.error);
