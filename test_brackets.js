const fs = require('fs');

try {
  const code = fs.readFileSync('c:\\Kiaan\\legal-case-managment\\frontend-legal-case\\src\\pages\\CourtFormsPage.jsx', 'utf8');
  // Simple check using eval/Function constructor is not suitable for JSX,
  // but we can check matching brackets.
  let openBraces = 0;
  let closeBraces = 0;
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '{') openBraces++;
    if (code[i] === '}') closeBraces++;
  }
  console.log('Open curly braces:', openBraces);
  console.log('Close curly braces:', closeBraces);
  console.log('Curly braces match:', openBraces === closeBraces);

  let openTags = (code.match(/<[a-zA-Z]/g) || []).length;
  let closeTags = (code.match(/<\/[a-zA-Z]/g) || []).length;
  console.log('Open tags (estimated):', openTags);
  console.log('Close tags (estimated):', closeTags);
} catch (e) {
  console.error(e);
}
