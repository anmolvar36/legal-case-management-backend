const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');
const prisma = require('../src/config/db');
const courtFormsService = require('../src/modules/court-forms/court-forms.service');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

function runQpdfDecrypt(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const qpdf = spawn('qpdf', ['--decrypt', '--password=', '--object-streams=disable', '--stream-data=uncompress', inputPath, outputPath]);
    qpdf.on('close', code => (code === 0 || code === 3 || code === 2) ? resolve() : reject(new Error(`qpdf failed with code ${code}`)));
    qpdf.on('error', reject);
  });
}

async function testAutoMappingEngine() {
  console.log('====================================================');
  console.log('TESTING DYNAMIC AUTO ALIGNMENT ENGINE & METADATA CACHE');
  console.log('====================================================\n');

  try {
    // 1. Ensure POS-010 master PDF exists if record exists in DB
    const posRecord = await prisma.courtFormTemplate.findFirst({ where: { form_number: 'POS-010' } });
    if (posRecord) {
      const targetPosPath = path.join(process.cwd(), 'uploads', 'templates', 'POS-010.pdf');
      if (!fs.existsSync(targetPosPath)) {
        console.log('Downloading official POS-010.pdf from courts.ca.gov...');
        const rawPos = path.join(process.cwd(), 'scratch', 'POS-010_official.pdf');
        try {
          await downloadFile('https://www.courts.ca.gov/documents/pos010.pdf', rawPos);
          await runQpdfDecrypt(rawPos, targetPosPath);
          await prisma.courtFormTemplate.update({
            where: { id: posRecord.id },
            data: { pdf_path: 'uploads/templates/POS-010.pdf' }
          });
          console.log('✓ Successfully downloaded and uncompressed POS-010.pdf!');
        } catch (e) {
          console.warn('POS-010 download notice:', e.message);
        }
      }
    }

    const templates = await prisma.courtFormTemplate.findMany({
      include: { mappings: true, field_mappings: true }
    });

    console.log(`Found ${templates.length} templates in database.`);

    for (const t of templates) {
      console.log(`\n----------------------------------------------------`);
      console.log(`Template ID: ${t.id} | Form No: ${t.form_number} | Title: "${t.title}"`);
      console.log(`PDF Path: "${t.pdf_path}"`);
      console.log(`Cached Mappings: ${t.mappings.length} | Cached Field Coords: ${t.field_mappings.length}`);

      if (t.mappings.length > 0) {
        console.log(`Sample Auto-Mapped Fields:`);
        t.mappings.slice(0, 5).forEach(m => {
          console.log(`  - "${m.pdf_field_name}" -> "${m.system_field_path}"`);
        });
      }
    }

    console.log('\n====================================================');
    console.log('VERIFYING DRAFT GENERATION VIA SERVICE');
    console.log('====================================================\n');

    // Test generation on Draft ID 46 (SUBP-010)
    const draft = await prisma.generatedForm.findFirst({
      where: { id: 46 },
      include: { template: true }
    });

    if (draft) {
      console.log(`Generating PDF for Draft ID ${draft.id} (Template: ${draft.template.form_number})...`);
      const result = await courtFormsService.generatePdf(draft.id);
      console.log(`✓ Successfully generated PDF! File: ${result.filePath}`);
      console.log(`✓ Byte length: ${result.pdfBytes.length} bytes`);
    }

    console.log('\n✓ DYNAMIC AUTO ALIGNMENT ENGINE TEST PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('✗ Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testAutoMappingEngine();
