const courtFormsService = require('../src/modules/court-forms/court-forms.service');
const prisma = require('../src/config/db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PDFDocument } = require('pdf-lib');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function verifyDownloadPipelineHash() {
  console.log('====================================================');
  console.log('VERIFYING DOWNLOAD PIPELINE SHA256 INTEGRITY & HASH');
  console.log('====================================================\n');

  try {
    const draftId = 46;
    const testPayload = {
      form_data: {
        case_title: 'Immigration Filing Under Humanitarian Expedition',
        case_number: 'HASH-TEST-CASE-888',
        attorney_name: 'Victoria Admin (HASH TEST)',
        firm_name: 'Victoria Tulsidas Law (HASH TEST)',
        firm_address: '100 Wilshire Blvd, Los Angeles, CA 90025',
        firm_phone: '(310) 999-8888',
        attorney_email: 'admin@vktori.com',
        client_name: 'Gill Victoria Cabler Sampson (HASH TEST)',
        plaintiff: 'Gill Victoria Cabler Sampson (HASH TEST)',
        defendant: 'ABC Corporation (HASH TEST)',
        court_name: 'Superior Court of California, County of Los Angeles',
        court_address: '111 N Hill St, Los Angeles, CA 90012'
      }
    };

    console.log(`Executing generatePdf for Draft ID ${draftId}...`);
    const serviceResult = await courtFormsService.generatePdf(draftId, testPayload);

    // 1. Inspect generated file on disk
    const diskPath = serviceResult.filePath;
    const diskBytes = fs.readFileSync(diskPath);
    const diskHash = sha256(diskBytes);

    console.log('\n--- DISK FILE (GENERATED ON SERVER) ---');
    console.log('Disk File Path:', diskPath);
    console.log('Disk File Size:', diskBytes.length, 'bytes');
    console.log('Disk File SHA256:', diskHash);

    // 2. Inspect returned service buffer (sent to Express response)
    const returnedBytes = Buffer.from(serviceResult.pdfBytes);
    const returnedHash = sha256(returnedBytes);

    console.log('\n--- STREAMED BUFFER (SENT TO CONTROLLER / EXPRESS) ---');
    console.log('Streamed Byte Length:', returnedBytes.length, 'bytes');
    console.log('Streamed SHA256:', returnedHash);

    // 3. Simulate browser download saving to disk
    const downloadedPath = path.join(process.cwd(), 'scratch', 'BROWSER_DOWNLOADED_FILE.pdf');
    fs.writeFileSync(downloadedPath, returnedBytes);
    const downloadedBytes = fs.readFileSync(downloadedPath);
    const downloadedHash = sha256(downloadedBytes);

    console.log('\n--- BROWSER DOWNLOADED FILE ---');
    console.log('Downloaded File Path:', downloadedPath);
    console.log('Downloaded File Size:', downloadedBytes.length, 'bytes');
    console.log('Downloaded File SHA256:', downloadedHash);

    // 4. Compare all 3 hashes
    console.log('\n====================================================');
    console.log('HASH COMPARISON VERIFICATION:');
    console.log('1. Server Disk File SHA256:   ', diskHash);
    console.log('2. Controller Stream SHA256:  ', returnedHash);
    console.log('3. Browser Downloaded SHA256: ', downloadedHash);

    const isIdentical = (diskHash === returnedHash) && (returnedHash === downloadedHash);

    if (isIdentical) {
      console.log('✓ PERFECT MATCH! ALL THREE FILES ARE 100% IDENTICAL!');
    } else {
      console.error('❌ HASH MISMATCH DETECTED!');
    }
    console.log('====================================================\n');

    // 5. Inspect Downloaded File AcroForm fields & values
    const pdfDoc = await PDFDocument.load(downloadedBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`Inspecting Downloaded PDF AcroForm Fields (${fields.length} total)...`);
    let count = 0;
    fields.forEach(f => {
      if (f.constructor.name === 'PDFTextField') {
        const txt = f.getText();
        if (txt) {
          count++;
          console.log(`- "${f.getName()}" = "${txt}"`);
        }
      }
    });

    console.log(`\n✓ Verified: ${count} fields populated in downloaded file!`);
  } catch (err) {
    console.error('Error during hash pipeline verification:', err);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDownloadPipelineHash();
