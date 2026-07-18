const pdfAcroForm = require('../src/modules/court-forms/services/pdfAcroForm.service');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { spawn } = require('child_process');

const localQpdfBin = path.join(process.cwd(), 'scratch', 'qpdf', 'qpdf-12.3.2-msvc64', 'bin');
if (fs.existsSync(localQpdfBin)) {
  process.env.PATH = `${localQpdfBin};${process.env.PATH}`;
}

async function runQpdfDecrypt(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const qpdf = spawn('qpdf', ['--decrypt', '--object-streams=disable', '--stream-data=uncompress', inputPath, outputPath]);
    qpdf.on('close', code => (code === 0 || code === 3) ? resolve() : reject(new Error('qpdf failed')));
  });
}

async function testCiv010Filler() {
  const inputPath = path.join(process.cwd(), 'uploads', 'templates', 'SUBP-010_1784358418138.pdf');
  const tempPath = path.join(process.cwd(), 'scratch', 'CIV010_uncompressed.pdf');
  await runQpdfDecrypt(inputPath, tempPath);

  const rawBytes = fs.readFileSync(tempPath);

  const testFormData = {
    case_number: 'CIV-2024-001234',
    attorney_name: 'Victoria Admin',
    firm_name: 'Victoria Tulsidas Law Firm',
    firm_address: '750 San Vincente Blvd, Suite 800, Los Angeles, CA',
    firm_phone: '(310) 555-0192',
    attorney_email: 'gillvictoriacablersampson@placeholder.local',
    client_name: 'Gill victoria Cabler Sampson',
    plaintiff: 'Gill victoria Cabler Sampson',
    defendant: 'ABC Corporation',
    court_name: 'Superior Court of California, County of Los Angeles',
    court_address: '111 N Hill St, Los Angeles, CA 90012',
    'Atty Bar No': '345678'
  };

  const filledBytes = await pdfAcroForm.fillFields(rawBytes, {}, testFormData);
  const pdfDoc = await PDFDocument.load(filledBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`\nVerified ${fields.length} AcroForm fields in populated output:`);
  let count = 0;
  fields.forEach(f => {
    if (f.constructor.name === 'PDFTextField') {
      const txt = f.getText();
      if (txt) {
        count++;
        console.log(`- "${f.getName()}" = "${txt}"`);
      }
    }
  });

  console.log(`\n✓ Total Populated Fields: ${count}`);
}

testCiv010Filler();
