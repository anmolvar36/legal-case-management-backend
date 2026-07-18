const { PDFDocument, PDFName, PDFStream, PDFRawStream } = require('pdf-lib');
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

async function testXfaXmlFiller() {
  const inputPath = path.join(process.cwd(), 'uploads', 'templates', 'SUBP-010_1784358418138.pdf');
  const tempPath = path.join(process.cwd(), 'scratch', 'SUBP-010_raw_xfa.pdf');
  await runQpdfDecrypt(inputPath, tempPath);

  const pdfBytes = fs.readFileSync(tempPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  const acroFormRef = pdfDoc.catalog.get(PDFName.of('AcroForm'));
  const acroFormDict = pdfDoc.context.lookup(acroFormRef);
  const xfaArray = acroFormDict.get(PDFName.of('XFA'));

  console.log('XFA Array size:', xfaArray.size());

  let datasetsStreamRef = null;
  let datasetsStream = null;

  for (let i = 0; i < xfaArray.size(); i += 2) {
    const key = xfaArray.get(i).value;
    if (key === 'datasets') {
      datasetsStreamRef = xfaArray.get(i + 1);
      datasetsStream = pdfDoc.context.lookup(datasetsStreamRef);
      console.log(`Found XFA datasets stream at index ${i/2}!`);
      break;
    }
  }

  if (datasetsStream) {
    const contents = datasetsStream.getContents();
    const xmlContent = Buffer.from(contents).toString('utf8');
    console.log('\n--- ORIGINAL XFA DATASETS XML STREAM ---');
    console.log(xmlContent.substring(0, 1500));
    console.log('...\n--- END OF XML SAMPLE ---');
  }
}

testXfaXmlFiller();
