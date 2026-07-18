const courtFormsService = require('../src/modules/court-forms/court-forms.service');
const prisma = require('../src/config/db');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function testSmartFill() {
  try {
    let draft = await prisma.generatedForm.findFirst();
    if (!draft) {
      console.log('Creating draft...');
      draft = await prisma.generatedForm.create({
        data: {
          template_id: 28,
          matter_id: 7,
          created_by: 1,
          form_data: {}
        }
      });
    }

    const testFormData = {
      case_title: 'Immigration Filing Under Humanitarian Expedition',
      case_number: 'CIV-2024-001234',
      matter_number: '00002-Cabler Sampson',
      filing_date: '2024-03-15',
      plaintiff: 'Gill Victoria Cabler Sampson',
      defendant: 'ABC Corporation',
      client_name: 'Gill Victoria Cabler Sampson',
      client_email: 'gillvictoriacablersampson@placeholder.loc',
      client_phone: '(310) 555-0192',
      client_address: '742 Evergreen Terrace, Los Angeles, CA, 90001',
      attorney_name: 'Victoria Admin',
      attorney_email: 'admin@vktori.com',
      firm_name: 'Victoria Tulsidas',
      firm_phone: '1234567890',
      firm_address: '750 San Vincente Blvd, Suite 800West Hollywood, CA 90069',
      court_name: 'Los Angeles Superior Court',
      judge_name: 'Hon. Maria Rodriguez',
      court_address: '111 N Hill St, Los Angeles, CA 90012'
    };

    console.log(`Updating Draft ID ${draft.id} with test form data...`);
    await prisma.generatedForm.update({
      where: { id: draft.id },
      data: { form_data: testFormData }
    });

    console.log(`Running generatePdf(${draft.id})...`);
    const result = await courtFormsService.generatePdf(draft.id);
    console.log('PDF Generation Success! Output file:', result.fileName);

    const generatedPath = path.join(process.cwd(), 'uploads', 'generated', result.fileName);
    const bytes = fs.readFileSync(generatedPath);
    console.log('Generated PDF size:', bytes.length, 'bytes');

    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    console.log('Generated PDF total AcroForm fields:', fields.length);

    let filledCount = 0;
    fields.forEach(f => {
      if (f.constructor.name === 'PDFTextField') {
        const text = f.getText();
        if (text) {
          filledCount++;
          console.log(`Filled Field: "${f.getName()}" = "${text}"`);
        }
      }
    });

    console.log(`\n========================================`);
    console.log(`TOTAL FILLED EDITABLE ACROFORM FIELDS: ${filledCount} / ${fields.length}`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error('ERROR during smart fill test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testSmartFill();
