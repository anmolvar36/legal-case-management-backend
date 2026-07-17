const fs = require('fs');

function checkXfa() {
  const dest = 'c:\\Kiaan\\legal-case-managment\\civ010.pdf';
  if (!fs.existsSync(dest)) {
    console.error('File not found');
    return;
  }
  const content = fs.readFileSync(dest, 'utf8');
  console.log('Contains AcroForm:', content.includes('AcroForm'));
  console.log('Contains XFA:', content.includes('XFA') || content.includes('xfa'));
}

checkXfa();
