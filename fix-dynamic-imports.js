const fs = require('fs');
const path = require('path');

const dirs = ['appointments', 'clinical', 'documents', 'emergency', 'medications', 'profile', 'settings', 'sharing', 'today', 'trends'];
const basePath = path.join(__dirname, 'src', 'app', '[locale]', '(app)', 'case', '[caseId]');

// Also fix the main case page
const casePagePath = path.join(basePath, 'page.tsx');
if (fs.existsSync(casePagePath)) {
  fs.writeFileSync(casePagePath, `import dynamic from 'next/dynamic'

const CaseClient = dynamic(() => import('./case-client'), { ssr: false })

export const dynamicParams = true

export async function generateStaticParams() {
  return [{ caseId: '_placeholder_' }]
}

export default function CasePage() {
  return <CaseClient />
}
`, 'utf8');
  console.log('Fixed main case page');
}

dirs.forEach(dir => {
  const filePath = path.join(basePath, dir, 'page.tsx');
  const clientName = dir.charAt(0).toUpperCase() + dir.slice(1) + 'Client';
  const fileName = dir + '-client';

  if (fs.existsSync(filePath)) {
    const content = `import dynamic from 'next/dynamic'

const ${clientName} = dynamic(() => import('./${fileName}'), { ssr: false })

export const dynamicParams = true

export async function generateStaticParams() {
  return [{ caseId: '_placeholder_' }]
}

export default function ${clientName.replace('Client', 'Page')}() {
  return <${clientName} />
}
`;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${dir}`);
  }
});
