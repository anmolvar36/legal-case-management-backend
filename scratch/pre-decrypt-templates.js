const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { PDFDocument } = require('pdf-lib');

const localQpdfBin = path.join(process.cwd(), 'scratch', 'qpdf', 'qpdf-12.3.2-msvc64', 'bin');
if (fs.existsSync(localQpdfBin)) {
  process.env.PATH = `${localQpdfBin};${process.env.PATH}`;
}

function runQpdfDecrypt(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const qpdf = spawn('qpdf', ['--decrypt', '--object-streams=disable', '--stream-data=uncompress', inputPath, outputPath]);
    qpdf.on('close', code => (code === 0 || code === 3) ? resolve() : reject(new Error(`qpdf failed with code ${code}`)));
    qpdf.on('error', reject);
  });
}

async function preDecrypt() {
  const templatesDir = path.join(process.cwd(), 'src', 'modules', 'court-forms', 'templates');
  const uploadsDir = path.join(process.cwd(), 'uploads', 'templates');

  const forms = ['SUBP-010.pdf', 'CIV-110.pdf', 'CIV-010.pdf'];

  for (const form of forms) {
    const originalPath = path.join(templatesDir, form);
    if (!fs.existsSync(originalPath)) {
      console.warn(`File ${originalPath} does not exist`);
      continue;
    }

    const tempOut = path.join(process.cwd(), 'scratch', `temp_${form}`);
    console.log(`Pre-decrypting and uncompressing: ${form}...`);
    try {
      await runQpdfDecrypt(originalPath, tempOut);
      // Overwrite both templates and uploads folders
      fs.copyFileSync(tempOut, originalPath);
      fs.copyFileSync(tempOut, path.join(uploadsDir, form));
      fs.unlinkSync(tempOut);
      console.log(`✓ Successfully updated and uncompressed ${form}`);
    } catch (err) {
      console.error(`Failed to decrypt ${form}:`, err.message);
    }
  }

  // Verify
  console.log('\n--- VERIFYING PRE-DECRYPTED FILES NATIVE PARSING ---');
  for (const form of forms) {
    const filePath = path.join(uploadsDir, form);
    try {
      const bytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const f = pdfDoc.getForm();
      const fields = f.getFields();
      console.log(`✓ Native load for "${form}" - Fields count: ${fields.length}`);
    } catch (err) {
      console.error(`✗ Native load failed for "${form}":`, err.message);
    }
  }
}

preDecrypt();
