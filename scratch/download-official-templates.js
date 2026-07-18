const fs = require('fs');
const path = require('path');
const https = require('https');
const prisma = require('../src/config/db');

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: HTTP ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function fetchOfficialTemplates() {
  const templatesDir = path.join(process.cwd(), 'src', 'modules', 'court-forms', 'templates');
  const uploadsDir = path.join(process.cwd(), 'uploads', 'templates');

  if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const officialForms = [
    { formNumber: 'SUBP-010', url: 'https://www.courts.ca.gov/documents/subp010.pdf', filename: 'SUBP-010.pdf' },
    { formNumber: 'CIV-110',  url: 'https://www.courts.ca.gov/documents/civ110.pdf',  filename: 'CIV-110.pdf' },
    { formNumber: 'CIV-010',  url: 'https://www.courts.ca.gov/documents/civ010.pdf',  filename: 'CIV-010.pdf' }
  ];

  for (const form of officialForms) {
    const targetTemplatesPath = path.join(templatesDir, form.filename);
    const targetUploadsPath = path.join(uploadsDir, form.filename);

    try {
      console.log(`Downloading official Judicial Council template for ${form.formNumber} from ${form.url}...`);
      await downloadFile(form.url, targetTemplatesPath);
      fs.copyFileSync(targetTemplatesPath, targetUploadsPath);
      console.log(`✓ Successfully downloaded and saved ${form.formNumber} to: "${targetTemplatesPath}" and "${targetUploadsPath}"`);
    } catch (err) {
      console.warn(`Could not download ${form.formNumber}:`, err.message);
    }
  }

  // Update DB records for SUBP-010, CIV-110, and CIV-010 to point to their dedicated template paths
  const dbTemplates = await prisma.courtFormTemplate.findMany();
  for (const t of dbTemplates) {
    const formNoUpper = t.form_number.toUpperCase();
    if (formNoUpper.includes('SUBP-010')) {
      const subpPath = path.join('uploads', 'templates', 'SUBP-010.pdf');
      await prisma.courtFormTemplate.update({
        where: { id: t.id },
        data: { pdf_path: subpPath }
      });
      console.log(`✓ Updated DB Template ID ${t.id} (${t.form_number}) pdf_path -> "${subpPath}"`);
    } else if (formNoUpper.includes('CIV-110')) {
      const civ110Path = path.join('uploads', 'templates', 'CIV-110.pdf');
      await prisma.courtFormTemplate.update({
        where: { id: t.id },
        data: { pdf_path: civ110Path }
      });
      console.log(`✓ Updated DB Template ID ${t.id} (${t.form_number}) pdf_path -> "${civ110Path}"`);
    } else if (formNoUpper.includes('CIV-010')) {
      const civ010Path = path.join('uploads', 'templates', 'CIV-010.pdf');
      await prisma.courtFormTemplate.update({
        where: { id: t.id },
        data: { pdf_path: civ010Path }
      });
      console.log(`✓ Updated DB Template ID ${t.id} (${t.form_number}) pdf_path -> "${civ010Path}"`);
    }
  }

  await prisma.$disconnect();
}

fetchOfficialTemplates();
