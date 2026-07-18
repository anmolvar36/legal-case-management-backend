const prisma = require('../src/config/db');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const templates = await prisma.courtFormTemplate.findMany({
      include: { mappings: true, field_mappings: true }
    });

    console.log('All Templates in Database:');
    for (const t of templates) {
      console.log(`\n----------------------------------------`);
      console.log(`ID: ${t.id} | Form Number: ${t.form_number} | Title: ${t.title}`);
      console.log(`PDF Path: ${t.pdf_path}`);
      console.log(`AcroForm mappings: ${t.mappings.length}`);
      console.log(`Coordinate field_mappings: ${t.field_mappings.length}`);

      const fullPath = path.resolve(process.cwd(), (t.pdf_path || '').replace(/\\/g, '/'));
      console.log(`Full Path: ${fullPath} | Exists: ${fs.existsSync(fullPath)}`);

      if (fs.existsSync(fullPath)) {
        try {
          const bytes = fs.readFileSync(fullPath);
          const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const form = pdfDoc.getForm();
          const fields = form.getFields();
          console.log(`PDF Page Count: ${pdfDoc.getPageCount()}`);
          console.log(`AcroForm Fields Count: ${fields.length}`);
          if (fields.length > 0) {
            console.log('First 10 Field Names:', fields.slice(0, 10).map(f => f.getName()));
          }
        } catch (pdfErr) {
          console.log('PDF load error:', pdfErr.message);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
