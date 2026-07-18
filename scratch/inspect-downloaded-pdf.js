const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function inspect() {
  const downloadDir = 'C:/Users/abc/Downloads';
  const files = fs.readdirSync(downloadDir).filter(f => f.includes('CIV-010-TEST_form'));
  console.log('Found downloaded files:', files);

  for (const f of files) {
    const filePath = path.join(downloadDir, f);
    const stat = fs.statSync(filePath);
    console.log(`\n--- Inspecting ${f} (${stat.size} bytes) ---`);
    const buffer = fs.readFileSync(filePath);
    
    console.log('First 50 bytes text:', JSON.stringify(buffer.toString('utf8', 0, 50)));
    console.log('First 20 bytes hex:', buffer.subarray(0, 20).toString('hex'));
    
    // Check if it's JSON error response saved as .pdf
    try {
      const json = JSON.parse(buffer.toString('utf8'));
      console.log('WARNING! The downloaded file is actually a JSON response:', json);
      continue;
    } catch (e) {}

    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      console.log('pdf-lib loaded PDF successfully! Pages:', pdfDoc.getPageCount());
      console.log('Is Encrypted:', pdfDoc.isEncrypted);
    } catch (err) {
      console.error('pdf-lib failed to load:', err.message);
    }
  }
}

inspect();
