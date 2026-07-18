const courtFormsService = require('../src/modules/court-forms/court-forms.service');
const prisma = require('../src/config/db');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function testSubp010Service() {
  try {
    const template = await prisma.courtFormTemplate.findFirst({
      where: { form_number: { contains: 'SUBP-010' } }
    });

    if (!template) {
      console.log('Template SUBP-010 not found!');
      return;
    }

    let draft = await prisma.generatedForm.findFirst({
      where: { template_id: template.id }
    });

    const testFormData = {
      case_title: 'Immigration Filing Under Humanitarian Expedition',
      case_number: 'CIV-2024-001234',
      matter_number: '00002-Cabler Sampson',
      filing_date: '15-Mar-2024',
      plaintiff: 'Gill victoria Cabler Sampson',
      defendant: 'ABC Corporation',
      client_name: 'Gill victoria Cabler Sampson',
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

    console.log(`Running generatePdf(${draft.id}) for SUBP-010...`);
    const result = await courtFormsService.generatePdf(draft.id);
    console.log('SUCCESS! SUBP-010 Generated PDF file:', result.fileName);

    const generatedPath = path.join(process.cwd(), 'uploads', 'generated', result.fileName);
    const bytes = fs.readFileSync(generatedPath);
    console.log('File Size:', bytes.length, 'bytes');

    const pdfDoc = await PDFDocument.load(bytes);
    console.log('PDF reloaded cleanly! Page count:', pdfDoc.getPageCount());
  } catch (err) {
    console.error('Error during SUBP-010 service test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testSubp010Service();
