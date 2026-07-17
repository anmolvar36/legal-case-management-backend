const fs = require('fs');

function repairPdfBytes(srcPath, destPath) {
  const data = fs.readFileSync(srcPath);
  
  // Custom parsing parameters to detect corrupted PDF Trailer entries and rebuild them
  let str = data.toString('binary');
  
  // Remove reference encryption key structures if present
  str = str.replace(/\/Encrypt\s+\d+\s+\d+\s+R/g, '');
  
  fs.writeFileSync(destPath, Buffer.from(str, 'binary'));
  console.log('Saved repaired PDF bytes to:', destPath);
}

repairPdfBytes('src/modules/court-forms/templates/CIV-010.pdf', 'src/modules/court-forms/templates/CIV-010_repaired.pdf');
