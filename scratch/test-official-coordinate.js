const { PDFDocument, StandardFonts } = require('pdf-lib');
const pdfCoordinate = require('../src/modules/court-forms/services/pdfCoordinate.service');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Prepend local qpdf to PATH on Windows if available
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

async function testCoordinateOverlay() {
  try {
    const templatePath = path.join(process.cwd(), 'src', 'modules', 'court-forms', 'templates', 'CIV-010.pdf');
    const repairedPath = path.join(process.cwd(), 'src', 'modules', 'court-forms', 'templates', 'CIV-010_repaired.pdf');

    await runQpdfDecrypt(templatePath, repairedPath);
    const pdfBytes = fs.readFileSync(repairedPath);

    // Coordinate mappings matching standard Judicial Council CIV-010 / CIV-110 layout
    const sampleMappings = [
      { page_number: 0, system_field_path: 'attorney_name', x_position: 40, y_position: 740, font_size: 9 },
      { page_number: 0, system_field_path: 'firm_name', x_position: 40, y_position: 728, font_size: 9 },
      { page_number: 0, system_field_path: 'firm_address', x_position: 40, y_position: 716, font_size: 9 },
      { page_number: 0, system_field_path: 'firm_phone', x_position: 40, y_position: 692, font_size: 9 },
      { page_number: 0, system_field_path: 'Atty Bar No', x_position: 330, y_position: 740, font_size: 9 },
      { page_number: 0, system_field_path: 'plaintiff', x_position: 40, y_position: 615, font_size: 9 },
      { page_number: 0, system_field_path: 'defendant', x_position: 40, y_position: 590, font_size: 9 },
      { page_number: 0, system_field_path: 'case_number', x_position: 420, y_position: 570, font_size: 10 },
    ];

    const sampleData = {
      attorney_name: 'Victoria Admin, Esq.',
      firm_name: 'Victoria Tulsidas Law Firm',
      firm_address: '750 San Vincente Blvd, Suite 800, West Hollywood, CA 90069',
      firm_phone: '(310) 555-0192',
      'Atty Bar No': 'BAR-987654',
      plaintiff: 'Gill Victoria Cabler Sampson',
      defendant: 'ABC Corporation',
      case_number: 'CIV-2024-001234'
    };

    console.log('Filling coordinates without calling getForm()...');
    const filledBytes = await pdfCoordinate.fillCoordinates(pdfBytes, sampleMappings, sampleData);

    const outputPath = path.join(process.cwd(), 'uploads', 'generated', 'TEST_COORDINATE_PERFECT_BACKGROUND.pdf');
    fs.writeFileSync(outputPath, filledBytes);
    console.log('Perfect background PDF written to:', outputPath, 'Size:', filledBytes.length, 'bytes');

    const pdfDoc = await PDFDocument.load(filledBytes);
    console.log('PDF reloaded cleanly! Pages:', pdfDoc.getPageCount());
  } catch (err) {
    console.error('ERROR during coordinate overlay test:', err);
  }
}

testCoordinateOverlay();
