const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const pdfAcroForm = require('../src/modules/court-forms/services/pdfAcroForm.service');

// Prepend local qpdf to PATH on Windows if available
const localQpdfBin = path.join(process.cwd(), 'scratch', 'qpdf', 'qpdf-12.3.2-msvc64', 'bin');
if (fs.existsSync(localQpdfBin)) {
  process.env.PATH = `${localQpdfBin};${process.env.PATH}`;
}

async function runQpdfDecrypt(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const qpdf = spawn('qpdf', ['--decrypt', inputPath, outputPath]);
    let stderr = '';
    qpdf.stderr.on('data', d => stderr += d.toString());
    qpdf.on('close', code => {
      console.log('qpdf decrypt exit code:', code);
      if (code === 0 || code === 3) resolve();
      else reject(new Error(`qpdf failed: ${stderr}`));
    });
  });
}

async function testMaster() {
  const masterPath = path.join(process.cwd(), 'uploads', 'templates', 'CIV-010-TEST_1784288051780.pdf');
  const tempDecryptedPath = path.join(process.cwd(), 'uploads', 'templates', 'CIV-010-TEST_DECRYPTED.pdf');

  console.log('Decrypting master template first...');
  await runQpdfDecrypt(masterPath, tempDecryptedPath);

  const decryptedBytes = fs.readFileSync(tempDecryptedPath);
  console.log('Decrypted master size:', decryptedBytes.length, 'bytes');

  // Load in pdf-lib WITHOUT ignoreEncryption
  const pdfDoc = await PDFDocument.load(decryptedBytes);
  console.log('pdf-lib loaded decrypted master WITHOUT ignoreEncryption! Pages:', pdfDoc.getPageCount());

  // Now fill fields
  const fieldValuesMap = { "Applicant Name": "Victoria Sampson Test" };
  const filledBytes = await pdfAcroForm.fillFields(decryptedBytes, fieldValuesMap);

  const testOutputPath = path.join(process.cwd(), 'uploads', 'generated', 'TEST_DECRYPTED_FILLED.pdf');
  fs.writeFileSync(testOutputPath, filledBytes);
  console.log('Filled PDF written to:', testOutputPath);

  // Verify that qpdf and pdf-lib can both parse the filled PDF cleanly!
  await runQpdfDecrypt(testOutputPath, path.join(process.cwd(), 'uploads', 'generated', 'TEST_FINAL_CHECK.pdf'));
  const finalCheck = await PDFDocument.load(fs.readFileSync(testOutputPath));
  console.log('FINAL PDF VERIFIED! Page count:', finalCheck.getPageCount());
}

testMaster();
