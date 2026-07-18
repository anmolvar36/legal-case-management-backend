const courtFormsService = require('../src/modules/court-forms/court-forms.service');
const prisma = require('../src/config/db');
const fs = require('fs');
const path = require('path');
const { PDFDocument, PDFName } = require('pdf-lib');

async function generateRealAppProofPdf() {
  console.log('====================================================');
  console.log('REAL APPLICATION DOWNLOAD VERIFICATION & FILE PROOF');
  console.log('====================================================\n');

  try {
    const draftId = 46;

    // Step 2 Form Values entered in UI
    const step2FormValues = {
      case_title: 'Immigration Filing Under Humanitarian Expedition',
      case_number: 'CIV-2024-001234',
      attorney_name: 'Victoria Admin',
      firm_name: 'Victoria Tulsidas Law Firm',
      firm_address: '750 San Vincente Blvd, Suite 800, Los Angeles, CA',
      firm_phone: '(310) 555-0199',
      attorney_email: 'admin@vktori.com',
      client_name: 'Gill Victoria Cabler Sampson',
      plaintiff: 'Gill Victoria Cabler Sampson',
      defendant: 'ABC Corporation',
      court_name: 'Superior Court of California, County of Los Angeles',
      court_address: '111 N Hill St, Los Angeles, CA 90012',
      'Atty Bar No': '345678'
    };

    console.log(`Executing exact application PDF generation flow for Draft ID ${draftId}...`);
    const serviceResult = await courtFormsService.generatePdf(draftId, { form_data: step2FormValues });

    // Ensure uploads/proof directory exists
    const proofDir = path.join(process.cwd(), 'uploads', 'proof');
    if (!fs.existsSync(proofDir)) {
      fs.mkdirSync(proofDir, { recursive: true });
    }

    // Save the actual produced PDF into uploads/proof
    const proofFilePath = path.join(proofDir, 'ACTUAL_APP_DOWNLOADED_FORM.pdf');
    fs.writeFileSync(proofFilePath, Buffer.from(serviceResult.pdfBytes));

    console.log(`\n✓ ACTUAL DOWNLOADED PDF SAVED TO: "${proofFilePath}"`);
    console.log(`File Byte Length: ${serviceResult.pdfBytes.length} bytes`);

    // Re-open and inspect the exact saved file
    const savedBytes = fs.readFileSync(proofFilePath);
    const pdfDoc = await PDFDocument.load(savedBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`\n--- INSPECTING SAVED PROOF FILE (${fields.length} AcroForm fields) ---`);

    let populatedCount = 0;
    const verifiedValues = {};

    fields.forEach(f => {
      if (f.constructor.name === 'PDFTextField') {
        const text = f.getText();
        if (text) {
          populatedCount++;
          verifiedValues[f.getName()] = text;
          console.log(`Field Name: "${f.getName()}"`);
          console.log(`  -> Populated Value: "${text}"`);
        }
      }
    });

    console.log('\n====================================================');
    console.log('VERIFICATION SUMMARY:');
    console.log(`Total Interactive Fields: ${fields.length}`);
    console.log(`Total Populated Fields: ${populatedCount}`);
    console.log(`Saved File Path: ${proofFilePath}`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('Error during proof PDF generation:', err);
  } finally {
    await prisma.$disconnect();
  }
}

generateRealAppProofPdf();
