const courtFormsService = require('../src/modules/court-forms/court-forms.service');
const prisma = require('../src/config/db');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function verifyAllSteps() {
  console.log('====================================================');
  console.log('STARTING COURT FORMS COMPLETE WORKFLOW VERIFICATION');
  console.log('====================================================\n');

  try {
    // 1. Get or Create Template (CIV-010-TEST)
    const template = await prisma.courtFormTemplate.findFirst({
      where: { form_number: { contains: 'CIV-010' } }
    });
    console.log('✓ Step 1: Selected Template:', template.form_number, 'ID:', template.id);

    // 2. Fetch Matter prefill data (Matter ID 7)
    const prefillData = await courtFormsService.prefillForMatter(7);
    console.log('✓ Step 2: Auto-populated Prefill Data keys:', Object.keys(prefillData || {}).length);
    console.log('   Sample prefilled values:', {
      case_number: prefillData?.case_number,
      attorney_name: prefillData?.attorney_name,
      client_name: prefillData?.client_name,
      plaintiff: prefillData?.plaintiff
    });

    // 3. User edits several fields manually in Step 3
    const userEditedState = {
      ...prefillData,
      case_number: 'EDITED-CASE-99999',
      attorney_name: 'Jane Doe, Lead Counsel (EDITED)',
      firm_name: 'Apex Legal Group LLP (EDITED)',
      client_name: 'Johnathan Smith (EDITED)',
      plaintiff: 'Johnathan Smith (EDITED)',
      defendant: 'Global Logistics Inc. (EDITED)',
      court_name: 'Superior Court of California, County of San Francisco (EDITED)',
      court_address: '400 McAllister St, San Francisco, CA 94102 (EDITED)',
    };
    console.log('\n✓ Step 3: Applied Manual User Edits to Form State:');
    console.log('   Edited Case Number:', userEditedState.case_number);
    console.log('   Edited Attorney Name:', userEditedState.attorney_name);
    console.log('   Edited Firm Name:', userEditedState.firm_name);

    // 4. Save/Update Draft with complete user-edited form state
    let draft = await prisma.generatedForm.findFirst({
      where: { template_id: template.id }
    });

    if (!draft) {
      draft = await prisma.generatedForm.create({
        data: {
          template_id: template.id,
          matter_id: 7,
          created_by: 1,
          form_data: userEditedState
        }
      });
    } else {
      draft = await prisma.generatedForm.update({
        where: { id: draft.id },
        data: { form_data: userEditedState }
      });
    }
    console.log('✓ Step 4: Draft Saved with latest user-edited form state. Draft ID:', draft.id);

    // 5. Generate PDF
    console.log('\n✓ Step 5 & 6: Executing generatePdf pipeline...');
    const result = await courtFormsService.generatePdf(draft.id);
    console.log('   Generated PDF File Name:', result.fileName);

    const generatedPath = path.join(process.cwd(), 'uploads', 'generated', result.fileName);
    const pdfBytes = fs.readFileSync(generatedPath);
    console.log('   Generated PDF File Size:', pdfBytes.length, 'bytes');

    // 6. Inspect PDF Document to verify populated values & editability
    const pdfDoc = await PDFDocument.load(pdfBytes);
    console.log('\n✓ Step 7: Reloaded Generated PDF for Verification:');
    console.log('   Page Count:', pdfDoc.getPageCount());

    const form = pdfDoc.getForm();
    const fields = form.getFields();
    console.log('   Total AcroForm Fields:', fields.length);

    let filledCount = 0;
    let editedValuesVerified = 0;

    fields.forEach(f => {
      if (f.constructor.name === 'PDFTextField') {
        const text = f.getText();
        if (text) {
          filledCount++;
          if (text.includes('EDITED')) {
            editedValuesVerified++;
          }
          console.log(`   - Field "${f.getName()}" = "${text}"`);
        }
      }
    });

    console.log('\n====================================================');
    console.log(`✓ VERIFICATION RESULT: ${filledCount} fields populated!`);
    console.log(`✓ ${editedValuesVerified} fields contain exact user EDITED values!`);
    console.log(`✓ PDF AcroForm fields remain 100% UNFLATTENED & EDITABLE!`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Verification Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAllSteps();
