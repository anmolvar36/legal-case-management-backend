const courtFormsService = require('../src/modules/court-forms/court-forms.service');
const prisma = require('../src/config/db');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function testFullFlow() {
  try {
    console.log('Testing generatePdf(40) full service flow...');
    const result = await courtFormsService.generatePdf(40);
    console.log('Success! Result file:', result.fileName);

    const generatedPath = path.join(process.cwd(), 'uploads', 'generated', result.fileName);
    const bytes = fs.readFileSync(generatedPath);
    console.log('Generated PDF size:', bytes.length, 'bytes');

    // Try loading generated PDF with pdf-lib WITHOUT ignoreEncryption
    const pdfDoc = await PDFDocument.load(bytes);
    console.log('FULL FLOW SUCCESS! Loaded PDF without ignoreEncryption! Pages:', pdfDoc.getPageCount());
  } catch (err) {
    console.error('ERROR during testFullFlow:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testFullFlow();
