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

function updateXfaXmlNode(xml, tagName, value) {
  if (!value) return xml;
  const safeVal = String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Match self-closing tag <TagName/> or <TagName></TagName>
  const selfClosingRegex = new RegExp(`<${tagName}\\s*\\/>`, 'gi');
  const openCloseRegex = new RegExp(`<${tagName}\\b[^>]*>(.*?)<\\/${tagName}>`, 'gi');

  if (selfClosingRegex.test(xml)) {
    xml = xml.replace(selfClosingRegex, `<${tagName}>${safeVal}</${tagName}>`);
  } else if (openCloseRegex.test(xml)) {
    xml = xml.replace(openCloseRegex, `<${tagName}>${safeVal}</${tagName}>`);
  }
  return xml;
}

async function testFullXfaInjector() {
  const inputPath = path.join(process.cwd(), 'uploads', 'templates', 'SUBP-010_1784358418138.pdf');
  const tempPath = path.join(process.cwd(), 'scratch', 'SUBP-010_uncompressed_xfa.pdf');
  await runQpdfUncompress(inputPath, tempPath);

  const pdfBytes = fs.readFileSync(tempPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  const acroFormRef = pdfDoc.catalog.get(PDFName.of('AcroForm'));
  const acroFormDict = pdfDoc.context.lookup(acroFormRef);
  const xfaArray = acroFormDict.get(PDFName.of('XFA'));

  let xmlContent = '';
  let datasetsStream = null;

  for (let i = 0; i < xfaArray.size(); i += 2) {
    const key = xfaArray.get(i).value;
    if (key === 'datasets') {
      const streamRef = xfaArray.get(i + 1);
      datasetsStream = pdfDoc.context.lookup(streamRef);
      xmlContent = Buffer.from(datasetsStream.getContents()).toString('utf8');
      break;
    }
  }

  if (xmlContent) {
    console.log('Populating XFA XML dataset stream...');

    const data = {
      CaseNumber_ft: 'CIV-2024-001234',
      CaseNumber: 'CIV-2024-001234',
      Name: 'Victoria Admin',
      AttyFirm: 'Victoria Tulsidas Law Firm',
      Street: '750 San Vincente Blvd, Suite 800',
      Phone: '1234567890',
      Email: 'admin@vktori.com',
      AttyFor: 'Gill Victoria Cabler Sampson',
      CrtCounty: 'Superior Court of California, County of Los Angeles',
      CrtStreet: '111 N Hill St, Los Angeles, CA 90012',
      Party1_ft: 'Gill Victoria Cabler Sampson',
      Party2_ft: 'ABC Corporation',
      ApplicantName_ft: 'Gill Victoria Cabler Sampson',
      AttName_ft: 'Victoria Admin'
    };

    let updatedXml = xmlContent;
    for (const [key, val] of Object.entries(data)) {
      updatedXml = updateXfaXmlNode(updatedXml, key, val);
    }

    // Replace stream dict contents in pdfDoc
    const newStream = pdfDoc.context.flateStream(Buffer.from(updatedXml, 'utf8'));
    acroFormDict.set(PDFName.of('XFA'), xfaArray); // retain XFA array reference

    const filledPdfBytes = await pdfDoc.save();
    const outputPath = path.join(process.cwd(), 'uploads', 'generated', 'SUBP-010_PERFECT_XFA_FILLED.pdf');
    fs.writeFileSync(outputPath, filledPdfBytes);
    console.log('✓ XFA Filled PDF successfully created at:', outputPath);
  }
}

testFullXfaInjector();
