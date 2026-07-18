const { PDFDocument, PDFName } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const localQpdfBin = path.join(process.cwd(), 'scratch', 'qpdf', 'qpdf-12.3.2-msvc64', 'bin');
if (fs.existsSync(localQpdfBin)) {
  process.env.PATH = `${localQpdfBin};${process.env.PATH}`;
}

async function runQpdfDecrypt(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const qpdf = spawn('qpdf', ['--decrypt', '--object-streams=disable', '--stream-data=preserve', inputPath, outputPath]);
    qpdf.on('close', code => (code === 0 || code === 3) ? resolve() : reject(new Error('qpdf failed')));
  });
}

async function testRestoreXfa() {
  const inputPath = path.join(process.cwd(), 'uploads', 'templates', 'SUBP-010_1784358418138.pdf');
  const tempPath = path.join(process.cwd(), 'scratch', 'SUBP-010_restore_input.pdf');
  await runQpdfDecrypt(inputPath, tempPath);

  const bytes = fs.readFileSync(tempPath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const acroFormRef = pdfDoc.catalog.get(PDFName.of('AcroForm'));
  const acroFormDict = pdfDoc.context.lookup(acroFormRef);
  const xfaObj = acroFormDict ? acroFormDict.get(PDFName.of('XFA')) : null;

  console.log('Saved XFA Object exists:', !!xfaObj);

  // Call getForm and fill fields
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  console.log('Filled fields count:', fields.length);

  // Restore XFA object back to AcroForm dict!
  if (acroFormDict && xfaObj) {
    acroFormDict.set(PDFName.of('XFA'), xfaObj);
    console.log('✓ Successfully restored XFA object back into AcroForm dictionary!');
  }

  const savedBytes = await pdfDoc.save();
  const outputPath = path.join(process.cwd(), 'uploads', 'generated', 'SUBP-010_XFA_RESTORED.pdf');
  fs.writeFileSync(outputPath, savedBytes);
  console.log('Saved PDF file with restored XFA to:', outputPath);
}

testRestoreXfa();
