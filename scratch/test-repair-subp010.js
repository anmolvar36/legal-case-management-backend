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
    const qpdf = spawn('qpdf', ['--decrypt', '--object-streams=disable', '--stream-data=preserve', inputPath, outputPath]);
    qpdf.on('close', code => (code === 0 || code === 3) ? resolve() : reject(new Error('qpdf failed')));
  });
}

async function testRepair() {
  const inputPath = path.join(process.cwd(), 'uploads', 'templates', 'SUBP-010_1784358418138.pdf');
  const tempPath = path.join(process.cwd(), 'scratch', 'SUBP-010_repaired_test.pdf');

  console.log('Testing QPDF repair on:', inputPath);
  await runQpdfDecrypt(inputPath, tempPath);

  const bytes = fs.readFileSync(tempPath);
  console.log('Repaired PDF Size:', bytes.length, 'bytes');

  const pdfDoc = await PDFDocument.load(bytes);
  console.log('Loaded Repaired SUBP-010 PDF! Pages:', pdfDoc.getPageCount());

  const form = pdfDoc.getForm();
  const fields = form.getFields();
  console.log('Total AcroForm fields:', fields.length);
  fields.forEach((f, idx) => {
    console.log(`[${idx + 1}] Name: "${f.getName()}" | Type: ${f.constructor.name}`);
  });
}

testRepair();
