const fs = require('fs');
const path = require('path');
const courtFormsService = require('../src/modules/court-forms/court-forms.service');

async function runTest() {
  const localPdfPath = path.join(__dirname, '../../civ010.pdf');
  console.log('Testing parsing via local workspace civ010.pdf...');
  if (!fs.existsSync(localPdfPath)) {
    console.error('Test FAILED: Local civ010.pdf not found at', localPdfPath);
    process.exit(1);
  }

  const bytes = fs.readFileSync(localPdfPath);
  try {
    const template = await courtFormsService.uploadTemplate({
      form_number: 'CIV-010-TEST',
      title: 'Test Title'
    }, {
      buffer: bytes,
      size: bytes.length,
      mimetype: 'application/pdf'
    });
    
    console.log('Template processed successfully. ID:', template.id);
    console.log('Test PASSED!');
  } catch (e) {
    console.error('Test FAILED:', e.message, e.stack);
  }
}

runTest();
