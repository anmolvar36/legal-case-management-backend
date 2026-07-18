const courtFormsService = require('../src/modules/court-forms/court-forms.service');
const prisma = require('../src/config/db');

async function testAll() {
  const templates = await prisma.courtFormTemplate.findMany();
  console.log(`Testing all ${templates.length} templates:`);

  const testFormData = {
    case_title: 'Immigration Filing Under Humanitarian Expedition',
    case_number: 'CIV-2024-001234',
    matter_number: '00013-Aldridge',
    plaintiff: 'Erika Lillian Aldridge',
    defendant: 'ABC Corporation',
    client_name: 'Erika Lillian Aldridge',
    client_email: 'erikalillianaldridge@placeholder.local',
    client_phone: '1234567890',
    client_address: '123 Client St, Los Angeles, CA',
    attorney_name: 'Victoria Admin',
    attorney_email: 'victoria@vktori.com',
    firm_name: 'Victoria Tulsidas',
    firm_phone: '1234567890',
    firm_address: '750 San Vincente Blvd, Suite 800West Hollywood, CA 90069',
    court_name: 'Superior Court of California, County of Los Angeles',
    court_address: '111 N Hill St, Los Angeles, CA 90012',
    'Atty Bar No': '123456',
    bar_number: '123456'
  };

  // Find a draft for each template or use draft 46/72
  for (const template of templates) {
    console.log(`\n========================================`);
    console.log(`Generating form for template: "${template.form_number}" (ID: ${template.id})`);
    console.log(`========================================`);

    // Create a temporary draft to test generation
    const draft = await prisma.generatedForm.create({
      data: {
        template: { connect: { id: template.id } },
        matter: { connect: { id: 7 } }, // Matter 7 is active
        creator: { connect: { id: 1 } }, // Admin creator
        status: 'draft',
        form_data: testFormData
      }
    });

    try {
      const { fileName, filePath, pdfBytes } = await courtFormsService.generatePdf(draft.id, { form_data: testFormData });
      console.log(`✓ SUCCESS: Generated PDF: "${fileName}"`);
      console.log(`  File size: ${pdfBytes.length} bytes`);
      console.log(`  Disk path: "${filePath}"`);
    } catch (err) {
      console.error(`✗ FAILED for ${template.form_number}:`, err.message);
    } finally {
      // Clean up draft
      await prisma.generatedForm.delete({ where: { id: draft.id } });
    }
  }

  await prisma.$disconnect();
}

testAll();
