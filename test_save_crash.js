const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PDFDocument } = require('pdf-lib');

const prisma = new PrismaClient();

async function testGenerate() {
  try {
    const draftId = 18; // From user request
    const form = await prisma.generatedForm.findUnique({
      where: { id: parseInt(draftId) },
      include: {
        template: { include: { mappings: true } },
        matter: true,
      },
    });
    if (!form) {
      console.error('Draft not found in database');
      process.exit(1);
    }
    console.log('Successfully fetched draft:', form.id);
    
    const masterPath = path.join(process.cwd(), 'src/modules/court-forms/templates/CIV-010.pdf');
    if (!fs.existsSync(masterPath)) {
      console.error('CIV-010 template does not exist at:', masterPath);
      process.exit(1);
    }
    
    console.log('Loading PDF template...');
    const existingPdfBytes = fs.readFileSync(masterPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
    console.log('PDF template loaded successfully.');
    
    const pdfForm = pdfDoc.getForm();
    console.log('PDF Form acquired. Fields count:', pdfForm.getFields().length);
    
    const { PDFTextField, PDFCheckBox } = require('pdf-lib');
    const fields = pdfForm.getFields();
    
    for (const field of fields) {
      const name = field.getName();
      const value = 'Test Value';
      try {
        if (field instanceof PDFTextField) {
          field.setText(value);
        }
      } catch (err) {
        console.log(`Error setting text on field ${name}:`, err.message);
      }
    }
    
    console.log('Attempting flatten...');
    try {
      pdfForm.flatten();
      console.log('Flatten succeeded.');
    } catch (err) {
      console.error('Flatten failed:', err.message);
    }
    
    console.log('Attempting save...');
    const pdfBytes = await pdfDoc.save({ updateFieldAppearances: false });
    console.log('Save succeeded. Bytes count:', pdfBytes.length);
    
    process.exit(0);
  } catch (e) {
    console.error('CRITICAL TOP-LEVEL CRASH:', e.message, e.stack);
    process.exit(1);
  }
}

testGenerate();
