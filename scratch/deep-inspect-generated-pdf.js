const { PDFDocument, PDFName } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

function getSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function deepInspect() {
  console.log('====================================================');
  console.log('DEEP INSPECTION OF REAL GENERATED PDF FILE ON DISK');
  console.log('====================================================\n');

  const generatedDir = path.join(process.cwd(), 'uploads', 'generated');
  const files = fs.readdirSync(generatedDir).filter(f => f.endsWith('.pdf'));

  if (files.length === 0) {
    console.log('No generated files found in uploads/generated!');
    return;
  }

  // Pick the latest generated PDF file
  files.sort((a, b) => fs.statSync(path.join(generatedDir, b)).mtimeMs - fs.statSync(path.join(generatedDir, a)).mtimeMs);
  const latestFile = files[0];
  const fullPath = path.join(generatedDir, latestFile);

  console.log(`Target Latest Generated File: "${latestFile}"`);
  console.log(`Full Disk Path: "${fullPath}"`);

  const diskBytes = fs.readFileSync(fullPath);
  console.log(`File Size: ${diskBytes.length} bytes`);
  console.log(`SHA256 Hash: ${getSha256(diskBytes)}`);

  // Uncompress for inspection
  const tempUncompressed = path.join(process.cwd(), 'scratch', 'deep_inspect_uncompressed.pdf');
  await runQpdfUncompress(fullPath, tempUncompressed);
  const uncompressedBytes = fs.readFileSync(tempUncompressed);

  const pdfDoc = await PDFDocument.load(uncompressedBytes, { ignoreEncryption: true });
  console.log(`\nPDF Loaded Cleanly! Page Count: ${pdfDoc.getPageCount()}`);

  // 1. Inspect AcroForm dictionary & NeedsAppearances
  const acroFormRef = pdfDoc.catalog.get(PDFName.of('AcroForm'));
  const acroFormDict = acroFormRef ? pdfDoc.context.lookup(acroFormRef) : null;

  console.log('\n--- ACROFORM DICTIONARY INSPECTION ---');
  console.log('AcroForm Dict Exists:', !!acroFormDict);
  if (acroFormDict) {
    const needsApp = acroFormDict.get(PDFName.of('NeedsAppearances'));
    console.log('/NeedsAppearances Value:', needsApp ? needsApp.toString() : 'MISSING / UNDEFINED');
    const xfa = acroFormDict.get(PDFName.of('XFA'));
    console.log('/XFA Entry Exists:', !!xfa);
  }

  // 2. Inspect Fields & Appearance Streams (/AP)
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  console.log(`\n--- ACROFORM FIELDS & APPEARANCE STREAMS (${fields.length} total) ---`);

  let populatedCount = 0;
  let appearanceCount = 0;

  fields.forEach((f, idx) => {
    const name = f.getName();
    const type = f.constructor.name;

    if (type === 'PDFTextField') {
      const text = f.getText();
      const ref = f.acroField.ref;
      const dict = pdfDoc.context.lookup(ref);
      const ap = dict ? dict.get(PDFName.of('AP')) : null;

      if (text) {
        populatedCount++;
        if (ap) appearanceCount++;
        console.log(`[Field ${idx + 1}] Name: "${name}"`);
        console.log(`           Value (/V): "${text}"`);
        console.log(`           Appearance (/AP): ${ap ? ap.toString() : 'NONE'}`);
      }
    }
  });

  console.log(`\nTotal Populated Fields with /V: ${populatedCount}`);
  console.log(`Total Populated Fields with /AP Stream: ${appearanceCount}`);

  // 3. Inspect XFA Datasets Stream
  if (acroFormDict) {
    const xfaArray = acroFormDict.get(PDFName.of('XFA'));
    if (xfaArray && typeof xfaArray.size === 'function') {
      for (let i = 0; i < xfaArray.size(); i += 2) {
        const key = xfaArray.get(i).value;
        if (key === 'datasets') {
          const streamRef = xfaArray.get(i + 1);
          const stream = pdfDoc.context.lookup(streamRef);
          const xml = Buffer.from(stream.getContents()).toString('utf8');
          console.log('\n--- XFA DATASETS XML STREAM SNAPSHOT ---');
          console.log(xml.substring(0, 1000));
          break;
        }
      }
    }
  }

  console.log('\n====================================================');
}

deepInspect();
