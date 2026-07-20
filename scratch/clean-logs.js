const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js')) results.push(file);
    }
  });
  return results;
}

const files = walk('i:/legal-case-management-final/legal-case-management-backend/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  const newContent = content.split('\n').map(line => {
    if (line.includes('console.log') && (
        line.includes('[PDF_') || 
        line.includes('[CONTROLLER_STREAM_LOG]') || 
        line.includes('[COURT_FORMS]') ||
        line.includes('[Cron]') ||
        line.includes('[Calendar Cron]')
    )) {
      changed = true;
      return '// ' + line;
    }
    return line;
  }).join('\n');

  if (changed) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Cleaned:', file);
  }
});
