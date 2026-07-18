const { PDFDocument, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Prepend local qpdf to PATH on Windows if available
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

function sanitizeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x00-\x7F]/g, ''); // Standard ASCII for clean English
}

async function testFont() {
  const masterPath = path.join(process.cwd(), 'uploads', 'templates', 'CIV-010-TEST_1784288051780.pdf');
  const tempDecryptedPath = path.join(process.cwd(), 'uploads', 'templates', 'CIV-010-TEST_DECRYPTED.pdf');

  await runQpdfDecrypt(masterPath, tempDecryptedPath);
  const decryptedBytes = fs.readFileSync(tempDecryptedPath);

  const pdfDoc = await PDFDocument.load(decryptedBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const form = pdfDoc.getForm();

  const fieldValuesMap = {
    "Applicant Name": "Gill Victoria Cabler Sampson",
    "firm_name": "Victoria Tulsidas Law Firm",
    "case_number": "CIV-2024-001234",
    "case_title": "Immigration Filing Under Humanitarian Expedition"
  };

  const fields = form.getFields();
  console.log('Total AcroForm fields:', fields.length);

  for (const field of fields) {
    const name = field.getName();
    const type = field.constructor.name;
    const val = fieldValuesMap[name];

    if (val) {
      if (type === 'PDFTextField') {
        const safeText = sanitizeText(val);
        field.setText(safeText);
        // Set default font on the text field so appearances use Helvetica!
        field.defaultUpdateAppearances(helveticaFont);
      }
    }
  }

  // Save with default font appearances update
  const filledBytes = await pdfDoc.save();
  const outputPath = path.join(process.cwd(), 'uploads', 'generated', 'TEST_ENGLISH_TEXT.pdf');
  fs.writeFileSync(outputPath, filledBytes);
  console.log('Saved filled PDF with Helvetica font appearances to:', outputPath);
}

testFont();
