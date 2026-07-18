const prisma = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function inspectTemplatePaths() {
  const templates = await prisma.courtFormTemplate.findMany();
  console.log(`Found ${templates.length} templates in DB:\n`);

  templates.forEach(t => {
    console.log(`Template ID: ${t.id} | Form Number: "${t.form_number}" | Title: "${t.title}"`);
    console.log(`  DB pdf_path: "${t.pdf_path}"`);

    const normalizedPath = t.pdf_path ? t.pdf_path.replace(/\\/g, '/') : '';
    const absPath = path.resolve(process.cwd(), normalizedPath);
    console.log(`  Absolute Path: "${absPath}"`);
    console.log(`  File Exists on Disk: ${fs.existsSync(absPath)}`);

    const basename = path.basename(normalizedPath);
    const inUploads = path.join(process.cwd(), 'uploads', 'templates', basename);
    console.log(`  In uploads/templates: "${inUploads}" -> Exists: ${fs.existsSync(inUploads)}`);
    console.log('---');
  });

  await prisma.$disconnect();
}

inspectTemplatePaths();
