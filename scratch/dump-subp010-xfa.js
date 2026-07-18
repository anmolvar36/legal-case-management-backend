const { PDFDocument, PDFName } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function dumpXfa() {
  const rawPath = path.join(process.cwd(), 'scratch', 'SUBP010_uncompressed.pdf');
  if (!fs.existsSync(rawPath)) {
    console.error(`File does not exist: ${rawPath}`);
    return;
  }
  const bytes = fs.readFileSync(rawPath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const catalog = pdfDoc.catalog;
  const acroFormRef = catalog.get(PDFName.of('AcroForm'));
  if (!acroFormRef) {
    console.log('No AcroForm in PDF catalog');
    return;
  }

  const acroFormDict = pdfDoc.context.lookup(acroFormRef);
  const xfaArray = acroFormDict.get(PDFName.of('XFA'));
  if (!xfaArray) {
    console.log('No XFA entry in AcroForm');
    return;
  }

  console.log(`XFA array size: ${xfaArray.size()}`);
  for (let i = 0; i < xfaArray.size(); i += 2) {
    const key = xfaArray.get(i).value;
    const ref = xfaArray.get(i + 1);
    const stream = pdfDoc.context.lookup(ref);
    if (key === 'datasets') {
      const xml = Buffer.from(stream.getContents()).toString('utf8');
      console.log('--- DATASETS XML ---');
      console.log(xml.substring(0, 1500)); // Print first 1500 chars
      console.log('--------------------');
    }
  }
}

dumpXfa();
