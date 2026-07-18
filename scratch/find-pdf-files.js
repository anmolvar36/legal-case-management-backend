const fs = require('fs');
const path = require('path');

function findPdfs(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (!item.includes('node_modules') && !item.includes('.git')) {
          findPdfs(full, results);
        }
      } else if (item.toLowerCase().endsWith('.pdf')) {
        results.push({ path: full, size: stat.size });
      }
    } catch {}
  }
  return results;
}

const rootDir = path.join(__dirname, '..');
const pdfs = findPdfs(rootDir);
console.log('All PDF files found in backend workspace:');
pdfs.forEach(p => console.log(`- ${p.path} (${p.size} bytes)`));
