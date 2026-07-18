const { PDFDocument, StandardFonts, PDFName } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const localQpdfBin = path.join(process.cwd(), 'scratch', 'qpdf', 'qpdf-12.3.2-msvc64', 'bin');
if (fs.existsSync(localQpdfBin)) {
  process.env.PATH = `${localQpdfBin};${process.env.PATH}`;
}

async function runQpdfUncompress(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const qpdf = spawn('qpdf', ['--decrypt', '--object-streams=disable', '--stream-data=uncompress', inputPath, outputPath]);
    qpdf.on('close', code => (code === 0 || code === 3) ? resolve() : reject(new Error('qpdf failed')));
  });
}

async function testAppearanceUpdate() {
  const inputPath = path.join(process.cwd(), 'uploads', 'templates', 'SUBP-010_1784358418138.pdf');
  const tempPath = path.join(process.cwd(), 'scratch', 'SUBP-010_uncompressed.pdf');
  await runQpdfUncompress(inputPath, tempPath);

  const pdfBytes = fs.readFileSync(tempPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`Processing ${fields.length} AcroForm fields...`);

  fields.forEach(field => {
    const type = field.constructor.name;
    const name = field.getName();

    if (type === 'PDFTextField') {
      if (name.includes('CaseNumber')) {
        field.setText('CIV-2024-001234');
      } else if (name.includes('Name')) {
        field.setText('Gill Victoria Cabler Sampson');
      } else if (name.includes('AttyFirm')) {
        field.setText('Victoria Tulsidas Law Firm');
      } else if (name.includes('Street')) {
        field.setText('750 San Vincente Blvd, Suite 800');
      } else if (name.includes('Phone')) {
        field.setText('(310) 555-0199');
      }
    }
  });

  try {
    form.updateFieldAppearances(helveticaFont);
    console.log('✓ Successfully called form.updateFieldAppearances(helveticaFont)!');
  } catch (err) {
    console.error('Error calling updateFieldAppearances:', err.message);
  }

  const outBytes = await pdfDoc.save();
  const outPath = path.join(process.cwd(), 'uploads', 'generated', 'SUBP-010_APPEARANCE_UPDATED.pdf');
  fs.writeFileSync(outPath, outBytes);
  console.log('✓ Saved appearance updated PDF to:', outPath);
}

testAppearanceUpdate();
