const courtFormsService = require('../src/modules/court-forms/court-forms.service');
const prisma = require('../src/config/db');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function testCIV110Full() {
  try {
    const template = await prisma.courtFormTemplate.findUnique({
      where: { id: 29 },
      include: { mappings: true, field_mappings: true }
    });

    console.log('Template 29 details:', template?.form_number, 'Field Mappings count:', template?.field_mappings?.length);

    if (template && template.field_mappings.length === 0) {
      console.log('Seeding default CIV-110 coordinate field_mappings...');
      const defaultMappings = [
        { template_id: 29, field_name: 'Attorney Name', system_field_path: 'attorney_name', page_number: 0, x_position: 45, y_position: 742, font_size: 9 },
        { template_id: 29, field_name: 'Firm Name', system_field_path: 'firm_name', page_number: 0, x_position: 45, y_position: 730, font_size: 9 },
        { template_id: 29, field_name: 'Firm Address', system_field_path: 'firm_address', page_number: 0, x_position: 45, y_position: 718, font_size: 9 },
        { template_id: 29, field_name: 'Firm Phone', system_field_path: 'firm_phone', page_number: 0, x_position: 45, y_position: 694, font_size: 9 },
        { template_id: 29, field_name: 'Bar Number', system_field_path: 'Atty Bar No', page_number: 0, x_position: 335, y_position: 742, font_size: 9 },
        { template_id: 29, field_name: 'Plaintiff', system_field_path: 'plaintiff', page_number: 0, x_position: 45, y_position: 618, font_size: 9 },
        { template_id: 29, field_name: 'Defendant', system_field_path: 'defendant', page_number: 0, x_position: 45, y_position: 593, font_size: 9 },
        { template_id: 29, field_name: 'Case Number', system_field_path: 'case_number', page_number: 0, x_position: 425, y_position: 572, font_size: 10 },
      ];

      for (const m of defaultMappings) {
        await prisma.courtFormFieldMapping.create({ data: m });
      }
      console.log('Seeded 8 CIV-110 coordinate field_mappings!');
    }

    let draft = await prisma.generatedForm.findFirst({ where: { template_id: 29 } });
    if (!draft) {
      draft = await prisma.generatedForm.create({
        data: {
          template_id: 29,
          matter_id: 7,
          created_by: 1,
          form_data: {
            attorney_name: 'Victoria Admin, Esq.',
            firm_name: 'Victoria Tulsidas Law Firm',
            firm_address: '750 San Vincente Blvd, Suite 800, West Hollywood, CA 90069',
            firm_phone: '(310) 555-0192',
            'Atty Bar No': 'BAR-987654',
            plaintiff: 'Gill Victoria Cabler Sampson',
            defendant: 'ABC Corporation',
            case_number: 'CIV-2024-001234'
          }
        }
      });
    }

    console.log(`Running generatePdf(${draft.id})...`);
    const result = await courtFormsService.generatePdf(draft.id);
    console.log('CIV-110 PDF Generation Success! Output file:', result.fileName);

    const generatedPath = path.join(process.cwd(), 'uploads', 'generated', result.fileName);
    const bytes = fs.readFileSync(generatedPath);
    console.log('Generated CIV-110 PDF size:', bytes.length, 'bytes');

    const pdfDoc = await PDFDocument.load(bytes);
    console.log('SUCCESS! Loaded generated CIV-110 PDF! Pages:', pdfDoc.getPageCount());
  } catch (err) {
    console.error('ERROR during CIV-110 full test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testCIV110Full();
