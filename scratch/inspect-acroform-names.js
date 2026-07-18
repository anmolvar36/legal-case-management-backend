const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const localQpdfBin = path.join(process.cwd(), 'scratch', 'qpdf', 'qpdf-12.3.2-msvc64', 'bin');
if (fs.existsSync(localQpdfBin)) {
  process.env.PATH = `${localQpdfBin};${process.env.PATH}`;
}

async function runQpdfDecrypt(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const qpdf = spawn('qpdf', ['--decrypt', inputPath, outputPath]);
    qpdf.on('close', code => (code === 0 || code === 3) ? resolve() : reject(new Error('qpdf failed')));
  });
}

async function inspectTemplate(filePath) {
  console.log('\n========================================');
  console.log('Inspecting:', filePath);
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist!');
    return;
  }

  const tempDecrypted = path.join(process.cwd(), 'scratch', `temp_inspect_${Date.now()}.pdf`);
  try {
    await runQpdfDecrypt(filePath, tempDecrypted);
    const bytes = fs.readFileSync(tempDecrypted);
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    console.log('Total AcroForm Fields:', fields.length);
    fields.forEach((f, idx) => {
      console.log(`[${idx + 1}] Name: "${f.getName()}" | Type: ${f.constructor.name}`);
    });
  } catch (err) {
    console.error('Error inspecting:', err.message);
  } finally {
    if (fs.existsSync(tempDecrypted)) fs.unlinkSync(tempDecrypted);
  }
}

async function main() {
  await inspectTemplate(path.join(process.cwd(), 'src', 'modules', 'court-forms', 'templates', 'CIV-010.pdf'));
  await inspectTemplate(path.join(process.cwd(), 'uploads', 'templates', 'CIV-010-TEST_1784288051780.pdf'));
}

main();
