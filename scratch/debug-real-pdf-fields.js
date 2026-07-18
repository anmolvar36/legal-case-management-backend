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

async function inspectRealFiles() {
  const dir = path.join(process.cwd(), 'uploads', 'templates');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));

  console.log('Found Uploaded Template Files:', files);

  for (const file of files) {
    console.log(`\n====================================================`);
    console.log(`FILE: ${file}`);
    console.log(`====================================================`);

    const fullPath = path.join(dir, file);
    const tempPath = path.join(process.cwd(), 'scratch', `temp_${file}`);

    try {
      await runQpdfDecrypt(fullPath, tempPath);
      const bytes = fs.readFileSync(tempPath);
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      console.log(`Page Count: ${pdfDoc.getPageCount()} | Total Fields: ${fields.length}`);
      fields.forEach((f, idx) => {
        console.log(`[${idx + 1}] Name: "${f.getName()}" | Type: ${f.constructor.name}`);
      });
    } catch (e) {
      console.error(`Error inspecting ${file}:`, e.message);
    }
  }
}

inspectRealFiles();
