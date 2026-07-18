const courtFormsService = require('../src/modules/court-forms/court-forms.service');
const prisma = require('../src/config/db');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function testCIV110() {
  try {
    console.log('Finding or creating a draft for Template 29 (CIV-110)...');
    
    let draft = await prisma.generatedForm.findFirst({
      where: { template_id: 29 },
    });

    if (!draft) {
      console.log('Creating new draft for Template 29...');
      draft = await prisma.generatedForm.create({
        data: {
          template_id: 29,
          matter_id: 7,
          created_by: 1,
          form_data: {
            "Atty For": "Gill Victoria Cabler Sampson",
            "plaintiff": "Gill Victoria Cabler Sampson",
            "defendant": "ABC Corporation",
            "case_number": "CIV-2024-001234",
            "court_name": "Superior Court of California, County of Los Angeles",
            "attorney_name": "Victoria Admin"
          }
        }
      });
    }

    console.log(`Draft ID: ${draft.id} for CIV-110. Running generatePdf(${draft.id})...`);
    const result = await courtFormsService.generatePdf(draft.id);
    console.log('Success! CIV-110 Result file:', result.fileName);

    const generatedPath = path.join(process.cwd(), 'uploads', 'generated', result.fileName);
    const bytes = fs.readFileSync(generatedPath);
    console.log('Generated CIV-110 PDF size:', bytes.length, 'bytes');

    const pdfDoc = await PDFDocument.load(bytes);
    console.log('Loaded generated CIV-110 PDF! Pages:', pdfDoc.getPageCount());
  } catch (err) {
    console.error('ERROR during CIV-110 test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testCIV110();
