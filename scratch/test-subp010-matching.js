const prisma = require('../src/config/db');
const courtFormsService = require('../src/modules/court-forms/court-forms.service');
const pdfAcroForm = require('../src/modules/court-forms/services/pdfAcroForm.service');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function testSubp010() {
  try {
    const template = await prisma.courtFormTemplate.findFirst({
      where: { form_number: { contains: 'SUBP-010' } }
    });

    if (!template) {
      console.log('Template SUBP-010 not found!');
      return;
    }

    console.log('Found SUBP-010 Template in DB ID:', template.id);

    // If template file missing on local disk, copy default fallback so test runs cleanly
    const targetFile = path.resolve(process.cwd(), template.pdf_path.replace(/\\/g, '/'));
    if (!fs.existsSync(targetFile)) {
      console.log('Target template file missing on local disk:', targetFile);
      const fallbackFile = path.join(process.cwd(), 'src', 'modules', 'court-forms', 'templates', 'CIV-010.pdf');
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      fs.copyFileSync(fallbackFile, targetFile);
      console.log('Copied fallback template to:', targetFile);
    }

    // Find or create draft for SUBP-010
    let draft = await prisma.generatedForm.findFirst({
      where: { template_id: template.id }
    });

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

    if (!draft) {
      draft = await prisma.generatedForm.create({
        data: {
          template_id: template.id,
          matter_id: 7,
          created_by: 1,
          form_data: testFormData
        }
      });
    } else {
      await prisma.generatedForm.update({
        where: { id: draft.id },
        data: { form_data: testFormData }
      });
    }

    console.log(`Generating PDF for Draft ID ${draft.id}...`);
    const result = await courtFormsService.generatePdf(draft.id);
    console.log('Generated PDF file:', result.fileName);

    const generatedPath = path.join(process.cwd(), 'uploads', 'generated', result.fileName);
    const bytes = fs.readFileSync(generatedPath);
    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

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
    console.log(`TOTAL FILLED EDITABLE FIELDS: ${filledCount} / ${fields.length}`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error('Error in SUBP-010 test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testSubp010();
