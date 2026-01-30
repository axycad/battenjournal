const fs = require('fs');
const path = require('path');

const dirs = ['.', 'appointments', 'clinical', 'documents', 'emergency', 'medications', 'messages', 'profile', 'settings', 'sharing', 'today', 'trends'];
const basePath = path.join(__dirname, 'src', 'app', '[locale]', '(app)', 'case', '[caseId]');

dirs.forEach(dir => {
  const filePath = dir === '.' ? path.join(basePath, 'page.tsx') : path.join(basePath, dir, 'page.tsx');

  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace 'export default function' with 'export default async function'
    content = content.replace(/export default function /g, 'export default async function ');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${dir === '.' ? 'main page' : dir}`);
  }
});
