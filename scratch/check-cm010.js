const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');
const { PDFDocument } = require('pdf-lib');
const prisma = require('../src/config/db');

const localQpdfBin = path.join(process.cwd(), 'scratch', 'qpdf', 'qpdf-12.3.2-msvc64', 'bin');
if (fs.existsSync(localQpdfBin)) {
  process.env.PATH = `${localQpdfBin};${process.env.PATH}`;
}

function runQpdfDecrypt(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const qpdf = spawn('qpdf', ['--decrypt', '--password=', '--object-streams=disable', '--stream-data=uncompress', inputPath, outputPath]);
    qpdf.on('close', code => (code === 0 || code === 3 || code === 2) ? resolve() : reject(new Error(`qpdf failed with code ${code}`)));
    qpdf.on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function checkAndFixCM010() {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'templates');
  const templatesDir = path.join(process.cwd(), 'src', 'modules', 'court-forms', 'templates');

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });

  const officialUrl = 'https://www.courts.ca.gov/documents/cm010.pdf';
  const rawCm010Path = path.join(process.cwd(), 'scratch', 'CM-010_official.pdf');
  
  if (!fs.existsSync(rawCm010Path)) {
    console.log('Downloading official CM-010.pdf from courts.ca.gov...');
    try {
      await downloadFile(officialUrl, rawCm010Path);
      console.log('✓ Successfully downloaded official CM-010.pdf');
    } catch (err) {
      console.error('Failed to download CM-010.pdf:', err.message);
      return;
    }
  }

  // Uncompress CM-010.pdf using QPDF
  const uncompressedCm010Path = path.join(process.cwd(), 'scratch', 'CM-010_uncompressed.pdf');
  await runQpdfDecrypt(rawCm010Path, uncompressedCm010Path);

  // Copy to uploads/templates/CM-010.pdf and src/modules/court-forms/templates/CM-010.pdf
  const targetUploadPath = path.join(uploadsDir, 'CM-010.pdf');
  const targetModulePath = path.join(templatesDir, 'CM-010.pdf');

  fs.copyFileSync(uncompressedCm010Path, targetUploadPath);
  fs.copyFileSync(uncompressedCm010Path, targetModulePath);
  console.log(`✓ Copied uncompressed CM-010.pdf to uploads/templates/CM-010.pdf and src/modules/court-forms/templates/CM-010.pdf`);

  // Also update DB records for CM-010 if any exist to point to uploads/templates/CM-010.pdf
  try {
    const cm010Record = await prisma.courtFormTemplate.findFirst({
      where: { form_number: 'CM-010' }
    });
    if (cm010Record) {
      const dbPathFull = path.join(process.cwd(), cm010Record.pdf_path);
      const dbDir = path.dirname(dbPathFull);
      if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
      fs.copyFileSync(uncompressedCm010Path, dbPathFull);

      await prisma.courtFormTemplate.update({
        where: { id: cm010Record.id },
        data: { pdf_path: 'uploads/templates/CM-010.pdf' }
      });
      console.log(`✓ Updated DB record for CM-010 (ID: ${cm010Record.id}) to point to uploads/templates/CM-010.pdf`);
    }
  } catch (dbErr) {
    console.warn('DB update notice:', dbErr.message);
  }

  // Inspect fields of CM-010
  const bytes = fs.readFileSync(targetUploadPath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  console.log(`\n✓ Native load for CM-010.pdf succeeded! Total fields count: ${fields.length}`);

  fields.forEach(f => {
    console.log(`- Field: "${f.getName()}" | Type: ${f.constructor.name}`);
  });

  await prisma.$disconnect();
}

checkAndFixCM010();
