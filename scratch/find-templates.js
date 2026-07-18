const prisma = require('../src/config/db');

async function findTemplates() {
  try {
    const templates = await prisma.courtFormTemplate.findMany({
      include: { mappings: true, _count: { select: { drafts: true } } }
    });
    console.log('Total Templates:', templates.length);
    for (const t of templates) {
      console.log(`\nID: ${t.id} | Form Number: ${t.form_number} | Title: ${t.title}`);
      console.log(`PDF Path: ${t.pdf_path}`);
      console.log(`Mappings: ${t.mappings.length} | Drafts Count: ${t._count.drafts}`);
    }
  } catch (err) {
    console.error('ERROR finding templates:', err);
  } finally {
    await prisma.$disconnect();
  }
}

findTemplates();
