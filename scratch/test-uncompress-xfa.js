const { PDFDocument, PDFName } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const localQpdfBin = path.join(process.cwd(), 'scratch', 'qpdf', 'qpdf-12.3.2-msvc64', 'bin');
if (fs.existsSync(localQpdfBin)) {
  process.env.PATH = `${localQpdfBin};${process.env.PATH}`;
}

async function runQpdfUncompress(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const qpdf = spawn('qpdf', ['--decrypt', '--object-streams=disable', '--stream-data=uncompress', inputPath, outputPath]);
    qpdf.on('close', code => (code === 0 || code === 3) ? resolve() : reject(new Error('qpdf failed')));
  });
}

async function testUncompressXfa() {
  const inputPath = path.join(process.cwd(), 'uploads', 'templates', 'SUBP-010_1784358418138.pdf');
  const tempPath = path.join(process.cwd(), 'scratch', 'SUBP-010_uncompressed_xfa.pdf');
  await runQpdfUncompress(inputPath, tempPath);

  const pdfBytes = fs.readFileSync(tempPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  const acroFormRef = pdfDoc.catalog.get(PDFName.of('AcroForm'));
  const acroFormDict = pdfDoc.context.lookup(acroFormRef);
  const xfaArray = acroFormDict.get(PDFName.of('XFA'));

  console.log('XFA Array size:', xfaArray.size());

  for (let i = 0; i < xfaArray.size(); i += 2) {
    const key = xfaArray.get(i).value;
    if (key === 'datasets') {
      const datasetsStreamRef = xfaArray.get(i + 1);
      const datasetsStream = pdfDoc.context.lookup(datasetsStreamRef);
      const contents = datasetsStream.getContents();
      const xmlContent = Buffer.from(contents).toString('utf8');
      console.log('\n--- UNCOMPRESSED XFA DATASETS XML STREAM ---');
      console.log(xmlContent);
      console.log('--- END OF UNCOMPRESSED XML ---');

      // Test updating XML nodes with populated values!
      let updatedXml = xmlContent;
      updatedXml = updatedXml.replace(/<CaseNumber_ft\/>|<CaseNumber_ft>.*?<\/CaseNumber_ft>/g, '<CaseNumber_ft>CIV-2024-001234-XFA-FILLED</CaseNumber_ft>');
      updatedXml = updatedXml.replace(/<Name\/>|<Name>.*?<\/Name>/g, '<Name>Victoria Admin (XFA FILLED)</Name>');
      updatedXml = updatedXml.replace(/<AttyFirm\/>|<AttyFirm>.*?<\/AttyFirm>/g, '<AttyFirm>Victoria Tulsidas Law (XFA FILLED)</AttyFirm>');

      // Update stream contents in pdfDoc
      datasetsStream.getContents = () => Buffer.from(updatedXml, 'utf8');

      const filledPdfBytes = await pdfDoc.save();
      const outputPath = path.join(process.cwd(), 'uploads', 'generated', 'SUBP-010_XFA_XML_SUCCESS.pdf');
      fs.writeFileSync(outputPath, filledPdfBytes);
      console.log('\n✓ Output PDF with updated XFA XML dataset saved to:', outputPath);
      break;
    }
  }
}

testUncompressXfa();
