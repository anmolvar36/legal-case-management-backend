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
    const qpdf = spawn('qpdf', ['--decrypt', '--object-streams=disable', '--stream-data=uncompress', inputPath, outputPath]);
    qpdf.on('close', code => (code === 0 || code === 3) ? resolve() : reject(new Error('qpdf failed')));
  });
}

async function dumpFields() {
  const rawPath = path.join(process.cwd(), 'uploads', 'templates', 'SUBP-010.pdf');
  const tempPath = path.join(process.cwd(), 'scratch', 'SUBP010_uncompressed.pdf');
  await runQpdfDecrypt(rawPath, tempPath);

  const bytes = fs.readFileSync(tempPath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`SUBP-010 has ${fields.length} fields:`);
  fields.forEach(f => {
    console.log(`- Name: "${f.getName()}" | Type: ${f.constructor.name}`);
  });
}

dumpFields();
