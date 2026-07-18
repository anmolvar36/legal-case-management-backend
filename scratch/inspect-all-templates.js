const prisma = require('../src/config/db');

async function inspectAllTemplates() {
  const templates = await prisma.courtFormTemplate.findMany({
    include: {
      mappings: true,
      field_mappings: true
    }
  });

  console.log(`Found ${templates.length} Court Form Templates in database:`);
  templates.forEach(t => {
    console.log(`- Template ID: ${t.id} | Form Number: "${t.form_number}" | Title: "${t.title}"`);
    console.log(`  -> AcroForm Mappings Count: ${t.mappings.length}`);
    console.log(`  -> Coordinate Mappings Count: ${t.field_mappings.length}`);
  });

  await prisma.$disconnect();
}

inspectAllTemplates();
