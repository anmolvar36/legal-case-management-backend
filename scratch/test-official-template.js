const { PDFDocument, StandardFonts } = require('pdf-lib');
const pdfAcroForm = require('../src/modules/court-forms/services/pdfAcroForm.service');
const pdfCoordinate = require('../src/modules/court-forms/services/pdfCoordinate.service');
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
    const qpdf = spawn('qpdf', ['--decrypt', '--object-streams=disable', '--stream-data=preserve', inputPath, outputPath]);
    qpdf.on('close', code => (code === 0 || code === 3) ? resolve() : reject(new Error('qpdf failed')));
  });
}

async function testOfficial() {
  try {
    const templatePath = path.join(process.cwd(), 'src', 'modules', 'court-forms', 'templates', 'CIV-010.pdf');
    const repairedPath = path.join(process.cwd(), 'src', 'modules', 'court-forms', 'templates', 'CIV-010_repaired.pdf');

    console.log('Running QPDF decrypt on official template:', templatePath);
    await runQpdfDecrypt(templatePath, repairedPath);

    const pdfBytes = fs.readFileSync(repairedPath);
    console.log('Repaired Official PDF Size:', pdfBytes.length, 'bytes');

    const pdfDoc = await PDFDocument.load(pdfBytes);
    console.log('Official PDF Pages:', pdfDoc.getPageCount());

    const fields = pdfDoc.getForm().getFields();
    console.log('Official AcroForm Fields count:', fields.length);
    console.log('Sample Field Names:', fields.slice(0, 10).map(f => f.getName()));

    const fieldValuesMap = {};
    for (const f of fields) {
      fieldValuesMap[f.getName()] = `Sample text`;
    }

    const outputBytes = await pdfAcroForm.fillFields(pdfBytes, fieldValuesMap);
    const outputPath = path.join(process.cwd(), 'uploads', 'generated', 'TEST_OFFICIAL_REPAIRED_OUTPUT.pdf');
    fs.writeFileSync(outputPath, outputBytes);
    console.log('Filled official repaired PDF written to:', outputPath, 'Size:', outputBytes.length, 'bytes');
  } catch (err) {
    console.error('ERROR testing official template:', err);
  }
}

testOfficial();
