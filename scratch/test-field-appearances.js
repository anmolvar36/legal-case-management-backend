const { PDFDocument, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
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

async function runTest() {
  const rawPath = path.join(process.cwd(), 'uploads', 'templates', 'SUBP-010.pdf');
  const tempPath = path.join(process.cwd(), 'scratch', 'SUBP010_uncompressed.pdf');
  await runQpdfDecrypt(rawPath, tempPath);

  const bytes = fs.readFileSync(tempPath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const testFormData = {
    case_number: 'CIV-2024-9988',
    attorney_name: 'Victoria Admin',
    firm_name: 'Victoria Tulsidas',
    firm_address: '750 San Vincente Blvd, Suite 800West Hollywood, CA 90069',
    firm_phone: '1234567890',
    attorney_email: 'erikalillianaldridge@placeholder.local',
    client_name: 'Erika Lillian Aldridge',
    plaintiff: 'Erika Lillian Aldridge',
    defendant: 'ABC Corporation'
  };

  fields.forEach(field => {
    const name = field.getName();
    const lowerName = name.toLowerCase();
    let value = '';

    if (lowerName.includes('case') && (lowerName.includes('number') || lowerName.includes('no'))) {
      value = testFormData.case_number;
    } else if (lowerName.includes('phone')) {
      value = testFormData.firm_phone;
    } else if (lowerName.includes('email')) {
      value = testFormData.attorney_email;
    } else if (lowerName.includes('party1') || lowerName.includes('plaintiff')) {
      value = testFormData.plaintiff;
    } else if (lowerName.includes('party2') || lowerName.includes('defendant')) {
      value = testFormData.defendant;
    } else if (lowerName.includes('textfield1')) {
      value = `${testFormData.attorney_name}\n${testFormData.firm_name}\n${testFormData.firm_address}`;
    } else if (lowerName.includes('attyfor') || (lowerName.includes('atty') && lowerName.includes('name'))) {
      value = testFormData.client_name;
    }

    if (value && field.constructor.name === 'PDFTextField') {
      try {
        field.setText(value);
        if (typeof field.updateAppearances === 'function') {
          field.updateAppearances(helveticaFont);
          console.log(`✓ Updated appearance for "${name}"`);
        }
      } catch (err) {
        console.warn(`Failed to set/update "${name}":`, err.message);
      }
    }
  });

  // Save WITHOUT updateFieldAppearances: false
  try {
    const outBytes = await pdfDoc.save();
    fs.writeFileSync(path.join(process.cwd(), 'scratch', 'SUBP010_field_ap_saved.pdf'), outBytes);
    console.log('✓ Successfully saved scratch/SUBP010_field_ap_saved.pdf with default save options!');
  } catch (saveErr) {
    console.error('Failed to save with default options:', saveErr.message);
  }
}

runTest();
