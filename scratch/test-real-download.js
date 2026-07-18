const courtFormsService = require('../src/modules/court-forms/court-forms.service');
const prisma = require('../src/config/db');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function testRealDownload() {
  console.log('====================================================');
  console.log('TESTING REAL RUNTIME PDF GENERATION & STREAM OUTPUT');
  console.log('====================================================\n');

  try {
    const draftId = 46; // SUBP-010 draft
    const payload = {
      form_data: {
        case_title: 'Immigration Filing Under Humanitarian Expedition',
        case_number: 'REAL-RUNTIME-CASE-777',
        attorney_name: 'Victoria Tulsidas, Esq. (REAL RUNTIME)',
        firm_name: 'Vktori Law Firm (REAL RUNTIME)',
        firm_address: '100 Wilshire Blvd, Los Angeles, CA 90025',
        firm_phone: '(310) 999-8888',
        attorney_email: 'victoria.real@vktori.com',
        client_name: 'Gill Victoria Cabler Sampson (REAL RUNTIME)',
        plaintiff: 'Gill Victoria Cabler Sampson (REAL RUNTIME)',
        defendant: 'ABC Corporation (REAL RUNTIME)',
        court_name: 'Superior Court of California, County of Los Angeles',
        court_address: '111 N Hill St, Los Angeles, CA 90012'
      }
    };

    console.log(`Sending POST /api/court-forms/generate/${draftId} payload...`);
    const result = await courtFormsService.generatePdf(draftId, payload);

    console.log('\n[CONTROLLER RECEIVES RESULT]');
    console.log('File Name:', result.fileName);
    console.log('File Path:', result.filePath);
    console.log('Returned Byte Length:', result.pdfBytes.length);

    // Save streamed output file to disk as if downloaded by browser
    const downloadedPath = path.join(process.cwd(), 'scratch', 'DOWNLOADED_FROM_BROWSER.pdf');
    fs.writeFileSync(downloadedPath, result.pdfBytes);

    console.log('\n[VERIFYING DOWNLOADED FILE CONTENT]');
    const pdfDoc = await PDFDocument.load(result.pdfBytes, { ignoreEncryption: true });
    console.log('Page Count:', pdfDoc.getPageCount());

    const form = pdfDoc.getForm();
    const fields = form.getFields();
    console.log('Total AcroForm Fields:', fields.length);

    let filledCount = 0;
    fields.forEach(f => {
      if (f.constructor.name === 'PDFTextField') {
        const text = f.getText();
        if (text) {
          filledCount++;
          console.log(`- "${f.getName()}" = "${text}"`);
        }
      }
    });

    console.log('\n====================================================');
    console.log(`✓ SUCCESS! ${filledCount} fields populated in downloaded file!`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('Error during real download test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testRealDownload();
