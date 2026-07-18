const { PDFDocument, PDFName } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function testDecryption() {
  try {
    const masterPath = path.join(process.cwd(), 'uploads', 'templates', 'CIV-010-TEST_1784288051780.pdf');
    const existingPdfBytes = fs.readFileSync(masterPath);

    console.log('Loading master PDF with ignoreEncryption: true...');
    const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });

    console.log('Trailer info before:', pdfDoc.context.trailerInfo);
    if (pdfDoc.context.trailerInfo.Encrypt) {
      console.log('Encrypt key found in trailerInfo! Removing it...');
      delete pdfDoc.context.trailerInfo.Encrypt;
    }

    const pdfBytes = await pdfDoc.save({ updateFieldAppearances: false });
    console.log('Saved PDF size:', pdfBytes.length, 'bytes');

    console.log('Attempting to reload saved PDF without ignoreEncryption...');
    const reloaded = await PDFDocument.load(pdfBytes);
    console.log('RELOAD SUCCESSFUL! Page count:', reloaded.getPageCount());
  } catch (err) {
    console.error('Test Decryption ERROR:', err);
  }
}

testDecryption();
