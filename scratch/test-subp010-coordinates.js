const prisma = require('../src/config/db');
const courtFormsService = require('../src/modules/court-forms/court-forms.service');
const pdfCoordinate = require('../src/modules/court-forms/services/pdfCoordinate.service');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { spawn } = require('child_process');

const localQpdfBin = path.join(process.cwd(), 'scratch', 'qpdf', 'qpdf-12.3.2-msvc64', 'bin');
if (fs.existsSync(localQpdfBin)) {
  process.env.PATH = `${localQpdfBin};${process.env.PATH}`;
}

async function runQpdfDecrypt(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const qpdf = spawn('qpdf', ['--decrypt', '--object-streams=disable', '--stream-data=preserve', inputPath, outputPath]);
    qpdf.on('close', code => (code === 0 || code === 3) ? resolve() : reject(new Error('qpdf failed')));
  });
}

async function testSubp010Coordinates() {
  try {
    const template = await prisma.courtFormTemplate.findFirst({
      where: { form_number: { contains: 'SUBP-010' } }
    });

    if (!template) {
      console.log('Template SUBP-010 not found!');
      return;
    }

    const masterPath = path.resolve(process.cwd(), template.pdf_path.replace(/\\/g, '/'));
    const repairedPath = path.join(process.cwd(), 'scratch', 'SUBP-010_repaired_coord.pdf');

    await runQpdfDecrypt(masterPath, repairedPath);
    const pdfBytes = fs.readFileSync(repairedPath);

    // Standard California Judicial Council top caption coordinates
    const defaultCourtFormMappings = [
      { page_number: 0, system_field_path: 'attorney_name', x_position: 45, y_position: 742, font_size: 9 },
      { page_number: 0, system_field_path: 'firm_name', x_position: 45, y_position: 730, font_size: 9 },
      { page_number: 0, system_field_path: 'firm_address', x_position: 45, y_position: 718, font_size: 9 },
      { page_number: 0, system_field_path: 'firm_phone', x_position: 110, y_position: 694, font_size: 9 },
      { page_number: 0, system_field_path: 'attorney_email', x_position: 110, y_position: 672, font_size: 9 },
      { page_number: 0, system_field_path: 'client_name', x_position: 130, y_position: 660, font_size: 9 },
      { page_number: 0, system_field_path: 'Atty Bar No', x_position: 335, y_position: 742, font_size: 9 },
      { page_number: 0, system_field_path: 'court_name', x_position: 210, y_position: 635, font_size: 9 },
      { page_number: 0, system_field_path: 'court_address', x_position: 130, y_position: 622, font_size: 9 },
      { page_number: 0, system_field_path: 'plaintiff', x_position: 140, y_position: 570, font_size: 9 },
      { page_number: 0, system_field_path: 'defendant', x_position: 140, y_position: 548, font_size: 9 },
      { page_number: 0, system_field_path: 'case_number', x_position: 425, y_position: 572, font_size: 10 },
    ];

    const sampleData = {
      attorney_name: 'Victoria Admin',
      firm_name: 'Victoria Tulsidas',
      firm_address: '750 San Vincente Blvd, Suite 800West Hollywood, CA 90069',
      firm_phone: '1234567890',
      attorney_email: 'admin@vktori.com',
      client_name: 'Gill victoria Cabler Sampson',
      'Atty Bar No': 'BAR-987654',
      court_name: 'Los Angeles Superior Court',
      court_address: '111 N Hill St, Los Angeles, CA 90012',
      plaintiff: 'Gill victoria Cabler Sampson',
      defendant: 'ABC Corporation',
      case_number: 'CIV-2024-001234'
    };

    console.log('Rendering SUBP-010 with Judicial Council coordinate text overlays...');
    const outputBytes = await pdfCoordinate.fillCoordinates(pdfBytes, defaultCourtFormMappings, sampleData);

    const outputPath = path.join(process.cwd(), 'uploads', 'generated', 'SUBP-010_PERFECT_FILLED.pdf');
    fs.writeFileSync(outputPath, outputBytes);
    console.log('SUBP-010 Filled PDF successfully created at:', outputPath);
    console.log('File Size:', outputBytes.length, 'bytes');

    const pdfDoc = await PDFDocument.load(outputBytes);
    console.log('PDF reloaded cleanly! Page Count:', pdfDoc.getPageCount());
  } catch (err) {
    console.error('Error during SUBP-010 coordinate test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testSubp010Coordinates();
