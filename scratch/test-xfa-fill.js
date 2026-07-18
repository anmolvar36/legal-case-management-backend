const { PDFDocument, PDFName, PDFDict, PDFArray, PDFStream, PDFRawStream } = require('pdf-lib');
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

async function testXfaPreservation() {
  const inputPath = path.join(process.cwd(), 'uploads', 'templates', 'SUBP-010_1784358418138.pdf');
  const tempPath = path.join(process.cwd(), 'scratch', 'SUBP-010_xfa_repaired.pdf');

  await runQpdfDecrypt(inputPath, tempPath);
  const pdfBytes = fs.readFileSync(tempPath);

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  
  // Inspect Catalog -> AcroForm -> XFA
  const catalog = pdfDoc.catalog;
  const acroForm = catalog.get(PDFName.of('AcroForm'));
  console.log('AcroForm exists in Catalog:', !!acroForm);

  if (acroForm && acroForm instanceof PDFDict) {
    const xfa = acroForm.get(PDFName.of('XFA'));
    console.log('XFA exists in AcroForm:', !!xfa);
    if (xfa && xfa instanceof PDFArray) {
      console.log('XFA Array Length:', xfa.size());
      for (let i = 0; i < xfa.size(); i += 2) {
        const nameObj = xfa.get(i);
        const streamRef = xfa.get(i + 1);
        console.log(`XFA Packet [${i/2}]: Name = "${nameObj.toString()}"`);
      }
    }
  }
}

testXfaPreservation();
