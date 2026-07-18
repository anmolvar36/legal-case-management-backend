const { PDFDocument, PDFName } = require('pdf-lib');
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

async function testConvertXfa() {
  const inputPath = path.join(process.cwd(), 'uploads', 'templates', 'SUBP-010_1784358418138.pdf');
  const tempPath = path.join(process.cwd(), 'scratch', 'SUBP-010_raw_input.pdf');
  await runQpdfDecrypt(inputPath, tempPath);

  const bytes = fs.readFileSync(tempPath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  // Completely REMOVE XFA dictionary from Catalog and AcroForm so PDF viewers rely ONLY on AcroForm
  const acroFormRef = pdfDoc.catalog.get(PDFName.of('AcroForm'));
  if (acroFormRef) {
    const acroFormDict = pdfDoc.context.lookup(acroFormRef);
    if (acroFormDict && typeof acroFormDict.delete === 'function') {
      acroFormDict.delete(PDFName.of('XFA'));
      console.log('✓ Successfully removed XFA dictionary entry!');
    }
  }

  // Ensure /NeedsAppearances is set to true in AcroForm dictionary so PDF Viewers render AcroForm values!
  if (acroFormRef) {
    const acroFormDict = pdfDoc.context.lookup(acroFormRef);
    acroFormDict.set(PDFName.of('NeedsAppearances'), pdfDoc.context.obj(true));
    console.log('✓ Set NeedsAppearances = true!');
  }

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  fields.forEach(f => {
    if (f.constructor.name === 'PDFTextField') {
      const name = f.getName().toLowerCase();
      if (name.includes('casenumber')) {
        f.setText('CIV-2024-001234-CONVERTED');
      } else if (name.includes('attname') || name.includes('name')) {
        f.setText('Victoria Admin (CONVERTED)');
      } else if (name.includes('attyfirm') || name.includes('firm')) {
        f.setText('Victoria Tulsidas Law (CONVERTED)');
      } else if (name.includes('party1') || name.includes('plaintiff')) {
        f.setText('Gill Victoria Cabler Sampson (CONVERTED)');
      } else if (name.includes('party2') || name.includes('defendant')) {
        f.setText('ABC Corporation (CONVERTED)');
      }
    }
  });

  const convertedBytes = await pdfDoc.save();
  const outputPath = path.join(process.cwd(), 'uploads', 'generated', 'SUBP-010_PURE_ACROFORM.pdf');
  fs.writeFileSync(outputPath, convertedBytes);
  console.log('✓ Output Pure AcroForm PDF saved to:', outputPath);
}

testConvertXfa();
