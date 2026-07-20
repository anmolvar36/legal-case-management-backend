const { PDFDocument, PDFName } = require('pdf-lib');

function updateXfaXmlNode(xml, tagName, value) {
  if (value === undefined || value === null || value === '') return xml;
  const safeVal = String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const selfClosingRegex = new RegExp(`<${tagName}\\s*\\/>`, 'gi');
  const openCloseRegex = new RegExp(`<${tagName}\\b[^>]*>(.*?)<\\/${tagName}>`, 'gi');

  if (selfClosingRegex.test(xml)) {
    xml = xml.replace(selfClosingRegex, `<${tagName}>${safeVal}</${tagName}>`);
  } else if (openCloseRegex.test(xml)) {
    xml = xml.replace(openCloseRegex, `<${tagName}>${safeVal}</${tagName}>`);
  }
  return xml;
}

async function fillXfaDataset(buffer, formData = {}) {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const catalog = pdfDoc.catalog;
    const acroFormRef = catalog.get(PDFName.of('AcroForm'));
    if (!acroFormRef) return buffer;

    const acroFormDict = pdfDoc.context.lookup(acroFormRef);
    if (!acroFormDict || typeof acroFormDict.get !== 'function') return buffer;

    const xfaArray = acroFormDict.get(PDFName.of('XFA'));
    if (!xfaArray || typeof xfaArray.size !== 'function') return buffer;

    let datasetsStream = null;
    for (let i = 0; i < xfaArray.size(); i += 2) {
      const key = xfaArray.get(i).value;
      if (key === 'datasets') {
        const streamRef = xfaArray.get(i + 1);
        datasetsStream = pdfDoc.context.lookup(streamRef);
        break;
      }
    }

    if (!datasetsStream || typeof datasetsStream.getContents !== 'function') return buffer;

    const contents = datasetsStream.getContents();
    let xmlContent = Buffer.from(contents).toString('utf8');

    // Data map covering all Judicial Council XFA tag names
    const dataMap = {
      CaseNumber_ft: formData.case_number,
      CaseNumber: formData.case_number,
      Name: formData.attorney_name,
      AttyBarNo: formData['Atty Bar No'] || formData.bar_number,
      AttyFirm: formData.firm_name,
      Street: formData.firm_address || formData.client_address,
      Phone: formData.firm_phone || formData.client_phone,
      Email: formData.attorney_email || formData.client_email,
      AttyFor: formData.client_name || formData.plaintiff,
      CrtCounty: formData.court_name,
      CrtStreet: formData.court_address,
      CrtMailingAdd: formData.court_address,
      Party1_ft: formData.plaintiff || formData.client_name,
      Party2_ft: formData.defendant,
      ApplicantName_ft: formData.client_name || formData.plaintiff,
      AttName_ft: formData.attorney_name
    };

    for (const [key, val] of Object.entries(dataMap)) {
      xmlContent = updateXfaXmlNode(xmlContent, key, val);
    }

    datasetsStream.contents = Buffer.from(xmlContent, 'utf8');

    const updatedPdfBytes = await pdfDoc.save({ updateFieldAppearances: false });
//     console.log('[PDF_XFA] Successfully populated XFA XML dataset stream!');
    return Buffer.from(updatedPdfBytes);
  } catch (err) {
    console.warn('[PDF_XFA] XFA XML dataset population skipped/error:', err.message);
    return buffer;
  }
}

module.exports = {
  fillXfaDataset
};
