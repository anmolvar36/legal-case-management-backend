const prisma = require('../src/config/db');

async function listTemplates() {
  try {
    const templates = await prisma.courtFormTemplate.findMany();
    console.log('Templates in Database:');
    templates.forEach(t => {
      console.log(`- ID: ${t.id} | Form No: ${t.form_number} | Title: ${t.title} | PDF Path: ${t.pdf_path}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

listTemplates();
