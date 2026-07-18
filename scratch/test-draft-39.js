const courtFormsService = require('../src/modules/court-forms/court-forms.service');
const prisma = require('../src/config/db');

async function testDraft() {
  try {
    console.log('Testing generatePdf(40)...');
    const form = await prisma.generatedForm.findUnique({
      where: { id: 40 },
      include: {
        template: { include: { mappings: true } },
        matter: true,
      },
    });
    console.log('Form 40 found, template ID:', form?.template?.id, 'form_number:', form?.template?.form_number);
    console.log('Form data keys:', Object.keys(form?.form_data || {}));
    console.log('Form data values:', JSON.stringify(form?.form_data, null, 2));

    const result = await courtFormsService.generatePdf(40);
    console.log('Success! Result file:', result.fileName);
  } catch (err) {
    console.error('ERROR during generatePdf(40):', err);
  } finally {
    await prisma.$disconnect();
  }
}

testDraft();
