const courtFormsService = require('../src/modules/court-forms/court-forms.service');
const prisma = require('../src/config/db');
const pdfCoordinate = require('../src/modules/court-forms/services/pdfCoordinate.service');
const pdfAcroForm = require('../src/modules/court-forms/services/pdfAcroForm.service');
const fs = require('fs');
const path = require('path');

async function testComparison() {
  try {
    console.log('Inspecting Form Draft 40 and template...');
    const form = await prisma.generatedForm.findUnique({
      where: { id: 40 },
      include: {
        template: { include: { mappings: true } },
        matter: true,
      },
    });

    console.log('Template details:');
    console.log('Form Number:', form.template.form_number);
    console.log('Title:', form.template.title);
    console.log('PDF Path:', form.template.pdf_path);
    console.log('Mappings count:', form.template.mappings.length);
    console.log('Sample Mappings:', JSON.stringify(form.template.mappings.slice(0, 5), null, 2));

    const masterPath = path.resolve(process.cwd(), form.template.pdf_path.replace(/\\/g, '/'));
    console.log('Master path:', masterPath, 'Exists:', fs.existsSync(masterPath));

    // Test coordinate filling on the master PDF
    const existingPdfBytes = fs.readFileSync(masterPath);
    console.log('Original Master PDF size:', existingPdfBytes.length, 'bytes');

    const filledWithCoordinates = await pdfCoordinate.fillCoordinates(existingPdfBytes, form.template.mappings, form.form_data);
    const coordPath = path.join(process.cwd(), 'uploads', 'generated', 'TEST_COORDINATE_OUTPUT.pdf');
    fs.writeFileSync(coordPath, filledWithCoordinates);
    console.log('Coordinate output written to:', coordPath, 'Size:', filledWithCoordinates.length, 'bytes');

  } catch (err) {
    console.error('ERROR during comparison test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testComparison();
