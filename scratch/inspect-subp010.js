const prisma = require('../src/config/db');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const localQpdfBin = path.join(process.cwd(), 'scratch', 'qpdf', 'qpdf-12.3.2-msvc64', 'bin');
if (fs.existsSync(localQpdfBin)) {
  process.env.PATH = `${localQpdfBin};${process.env.PATH}`;
}

async function runQpdfDecrypt(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const qpdf = spawn('qpdf', ['--decrypt', inputPath, outputPath]);
    qpdf.on('close', code => (code === 0 || code === 3) ? resolve() : reject(new Error('qpdf failed')));
  });
}

async function main() {
  try {
    const template = await prisma.courtFormTemplate.findFirst({
      where: { form_number: { contains: 'SUBP-010' } },
      include: { mappings: true, field_mappings: true, drafts: true }
    });

    console.log('SUBP-010 Template in DB:');
    if (!template) {
      console.log('Template NOT found in DB!');
      return;
    }

    console.log(`ID: ${template.id} | Form Number: ${template.form_number} | Title: ${template.title}`);
    console.log(`PDF Path: ${template.pdf_path}`);
    console.log(`Mappings count: ${template.mappings.length}`);
    console.log(`Field Mappings count: ${template.field_mappings.length}`);
    console.log(`Drafts count: ${template.drafts.length}`);

    const masterPath = path.resolve(process.cwd(), template.pdf_path.replace(/\\/g, '/'));
    console.log(`Master Path: ${masterPath} | Exists: ${fs.existsSync(masterPath)}`);

    if (fs.existsSync(masterPath)) {
      const tempDecrypted = path.join(process.cwd(), 'scratch', 'subp010_decrypted.pdf');
      await runQpdfDecrypt(masterPath, tempDecrypted);
      const bytes = fs.readFileSync(tempDecrypted);
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      console.log(`\nSUBP-010 AcroForm Fields count: ${fields.length}`);
      fields.forEach((f, idx) => {
        console.log(`[${idx + 1}] Name: "${f.getName()}" | Type: ${f.constructor.name}`);
      });
      if (fs.existsSync(tempDecrypted)) fs.unlinkSync(tempDecrypted);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
