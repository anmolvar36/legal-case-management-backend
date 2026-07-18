const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const pdfXfa = require('../src/modules/court-forms/services/pdfXfa.service');
const pdfAcroForm = require('../src/modules/court-forms/services/pdfAcroForm.service');
const pdfCoordinate = require('../src/modules/court-forms/services/pdfCoordinate.service');

async function testStandalone() {
  const forms = ['SUBP-010.pdf', 'CIV-110.pdf', 'CIV-010.pdf', 'CM-010.pdf'];
  const testFormData = {
    case_title: 'Mohamed Aaron Lamin',
    case_number: 'CIV-2024-001234',
    matter_number: '00013-Aldridge',
    plaintiff: 'Mohamed Aaron Lamin',
    defendant: 'ABC Corporation',
    client_name: 'Mohamed Aaron Lamin',
    client_email: 'mohamedaaronlamin@placeholder.local',
    client_phone: '1234567890',
    client_address: '750 San Vincente Blvd, Suite 800 West Hollywood, CA 90069',
    attorney_name: 'Victoria Tulsidas',
    attorney_email: 'mohamedaaronlamin@placeholder.local',
    firm_name: 'Victoria Tulsidas',
    firm_phone: '1234567890',
    firm_address: '750 San Vincente Blvd, Suite 800 West Hollywood, CA 90069',
    court_name: 'Superior Court of California, County of Los Angeles',
    court_address: '750 San Vincente Blvd, Suite 800 West Hollywood, CA 90069',
    'Atty Bar No': '123456',
    bar_number: '123456'
  };

  const templatesDir = path.join(process.cwd(), 'uploads', 'templates');

  for (const formName of forms) {
    const inputPath = path.join(templatesDir, formName);
    if (!fs.existsSync(inputPath)) {
      console.log(`Master template not found: ${formName}`);
      continue;
    }

    console.log(`\n========================================`);
    console.log(`Processing Standalone Form: ${formName}`);
    console.log(`========================================`);

    const bytes = fs.readFileSync(inputPath);

    // 1. Fill XFA datasets
    let xfaBytes = bytes;
    try {
      xfaBytes = await pdfXfa.fillXfaDataset(bytes, testFormData);
      console.log(`✓ XFA Filled: ${xfaBytes.length} bytes`);
    } catch (e) {
      console.error(`✗ XFA Fill error:`, e.message);
    }

    // 2. Fill AcroForm
    let acroBytes = xfaBytes;
    try {
      acroBytes = await pdfAcroForm.fillFields(xfaBytes, {}, testFormData);
      console.log(`✓ AcroForm Filled: ${acroBytes.length} bytes`);
    } catch (e) {
      console.error(`✗ AcroForm Fill error:`, e.message);
    }

    // 3. Draw coordinates (fallback visual overlay)
    let finalBytes = acroBytes;
    try {
      finalBytes = await pdfCoordinate.fillCoordinates(acroBytes, [], testFormData);
      console.log(`✓ Coordinate Overlay Applied: ${finalBytes.length} bytes`);
    } catch (e) {
      console.error(`✗ Coordinate Overlay error:`, e.message);
    }

    // Save final output file
    const outPath = path.join(process.cwd(), 'scratch', `standalone_${formName}`);
    fs.writeFileSync(outPath, finalBytes);
    console.log(`✓ Standalone PDF generated and saved to: ${outPath}`);
  }
}

testStandalone();
