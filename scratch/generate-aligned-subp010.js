const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const pdfXfa = require('../src/modules/court-forms/services/pdfXfa.service');
const pdfAcroForm = require('../src/modules/court-forms/services/pdfAcroForm.service');

async function testAligned() {
  const testFormData = {
    case_title: 'Immigration Filing Under Humanitarian Expedition',
    case_number: 'CIV-2024-001234',
    matter_number: '00013-Aldridge',
    plaintiff: 'Gill victoria Cabler Sampson',
    defendant: 'ABC Corporation',
    client_name: 'Gill victoria Cabler Sampson',
    client_email: 'admin@vktori.com',
    client_phone: '1234567890',
    client_address: '123 Client St, Los Angeles, CA',
    attorney_name: 'Victoria Admin',
    attorney_email: 'admin@vktori.com',
    firm_name: 'Victoria Tulsidas',
    firm_phone: '1234567890',
    firm_address: '750 San Vincente Blvd, Suite 800West Hollywood, CA 90069',
    court_name: 'Los Angeles Superior Court',
    court_address: '111 N Hill St, Los Angeles, CA 90012',
    'Atty Bar No': 'BAR-987654',
    bar_number: 'BAR-987654'
  };

  const templatePath = path.join(process.cwd(), 'uploads', 'templates', 'SUBP-010.pdf');
  const bytes = fs.readFileSync(templatePath);

  // 1. Fill XFA
  const xfaBytes = await pdfXfa.fillXfaDataset(bytes, testFormData);

  // 2. Fill AcroForm
  const finalPdfBytes = await pdfAcroForm.fillFields(xfaBytes, {}, testFormData);

  // Save to scratch
  const outPath = path.join(process.cwd(), 'scratch', 'SUBP010_perfect_alignment.pdf');
  fs.writeFileSync(outPath, finalPdfBytes);
  console.log(`✓ Generated SUBP-010 without coordinate overlay: ${outPath}`);
}

testAligned();
