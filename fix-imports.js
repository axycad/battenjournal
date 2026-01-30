const fs = require('fs');
const path = require('path');

const dirs = ['appointments', 'clinical', 'documents', 'medications', 'messages', 'profile', 'settings', 'sharing', 'today', 'trends'];
const basePath = path.join(__dirname, 'src', 'app', '[locale]', '(app)', 'case', '[caseId]');

dirs.forEach(dir => {
  const filePath = path.join(basePath, dir, 'page.tsx');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const imports = [];
    const exports = [];

    for (const line of lines) {
      if (line.startsWith('import ')) {
        imports.push(line);
      } else if (line.trim()) {
        exports.push(line);
      } else if (exports.length > 0) {
        exports.push(line); // Keep empty lines within exports
      }
    }

    const fixed = [...imports, '', ...exports].join('\n');
    fs.writeFileSync(filePath, fixed, 'utf8');
    console.log(`Fixed ${dir}`);
  }
});
