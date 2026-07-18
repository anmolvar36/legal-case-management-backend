const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

// Prepend local qpdf to PATH on Windows if available
const localQpdfBin = path.join(process.cwd(), 'scratch', 'qpdf', 'qpdf-12.3.2-msvc64', 'bin');
if (fs.existsSync(localQpdfBin)) {
  process.env.PATH = `${localQpdfBin};${process.env.PATH}`;
}

async function testQpdf() {
  const downloadDir = 'C:/Users/abc/Downloads';
  const inputFile = path.join(downloadDir, 'CIV-010-TEST_form (1).pdf');
  const outputFile = path.join(downloadDir, 'CIV-010-TEST_form_DECRYPTED.pdf');

  console.log('Running qpdf --decrypt on:', inputFile);

  await new Promise((resolve, reject) => {
    const proc = spawn('qpdf', ['--decrypt', inputFile, outputFile]);
    let stderr = '';
    proc.stderr.on('data', d => stderr += d.toString());
    proc.on('close', code => {
      console.log('qpdf exit code:', code);
      if (code === 0 || code === 3) resolve();
      else reject(new Error(`qpdf failed: ${stderr}`));
    });
  });

  const decryptedBytes = fs.readFileSync(outputFile);
  console.log('Decrypted file size:', decryptedBytes.length, 'bytes');

  const pdfDoc = await PDFDocument.load(decryptedBytes);
  console.log('pdf-lib loaded decrypted PDF WITHOUT ignoreEncryption!');
  console.log('Is Encrypted:', pdfDoc.isEncrypted);
  console.log('Page count:', pdfDoc.getPageCount());
}

testQpdf();
