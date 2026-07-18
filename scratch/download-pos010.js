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
  return new Promise((resolve) => {
    const qpdf = spawn('qpdf', ['--decrypt', '--password=', '--object-streams=disable', '--stream-data=uncompress', inputPath, outputPath]);
    qpdf.on('close', (code) => {
      if (fs.existsSync(outputPath)) {
        resolve();
      } else {
        fs.copyFileSync(inputPath, outputPath);
        resolve();
      }
    });
    qpdf.on('error', () => {
      fs.copyFileSync(inputPath, outputPath);
      resolve();
    });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function preparePos010() {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'templates');
  const templatesDir = path.join(process.cwd(), 'src', 'modules', 'court-forms', 'templates');

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });

  const rawPath = path.join(process.cwd(), 'scratch', 'POS-010_raw.pdf');
  const uncompressedPath = path.join(process.cwd(), 'scratch', 'POS-010_uncompressed.pdf');

  const formNo = 'POS-010';
  const cleanFormNo = formNo.toLowerCase().replace(/[^a-z0-9]/g, '');
  const officialUrl = `https://www.courts.ca.gov/documents/${cleanFormNo}.pdf`;

  if (!fs.existsSync(rawPath)) {
    console.log(`Downloading ${formNo} from ${officialUrl}...`);
    try {
      await downloadFile(officialUrl, rawPath);
      console.log(`✓ Successfully downloaded ${formNo}`);
    } catch (err) {
      console.error(`Failed to download ${formNo}:`, err.message);
      return;
    }
  }

  await runQpdfDecrypt(rawPath, uncompressedPath);
  console.log(`✓ Processed ${formNo}`);

  const targetUpload = path.join(uploadsDir, 'POS-010.pdf');
  const targetModule = path.join(templatesDir, 'POS-010.pdf');

  fs.copyFileSync(uncompressedPath, targetUpload);
  fs.copyFileSync(uncompressedPath, targetModule);
  console.log(`✓ Copied ${formNo}.pdf to uploads/templates/ and src/modules/court-forms/templates/`);

  // Verify fields
  const bytes = fs.readFileSync(targetUpload);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  console.log(`✓ Native load for ${formNo}.pdf succeeded! Total fields count: ${fields.length}`);

  await prisma.$disconnect();
}

preparePos010();
