const fs = require('fs');
const https = require('https');
const { PDFDocument } = require('pdf-lib');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };
    https.get(url, options, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function testOfficial() {
  const dest = 'official_civ010.pdf';
  console.log('Downloading official fillable CIV-010...');
  await download('https://www.courts.ca.gov/documents/civ010.pdf', dest);
  console.log('Downloaded. Loading PDF...');
  
  const bytes = fs.readFileSync(dest);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  console.log('Total fields in official PDF:', fields.length);
  
  fields.slice(0, 15).forEach(f => {
    console.log(`Field Name: "${f.getName()}", Type: "${f.constructor.name}"`);
  });
  
  // Clean up
  fs.unlinkSync(dest);
}

testOfficial().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
