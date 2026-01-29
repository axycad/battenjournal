const fs = require('fs');
const path = require('path');

console.log('Removing generateStaticParams for Capacitor build...\n');

const files = [
  'src/app/[locale]/(app)/case/[caseId]/data/page.tsx',
  'src/app/[locale]/(app)/case/[caseId]/data/export/page.tsx',
  'src/app/[locale]/unsubscribe/[token]/page.tsx',
  'src/app/[locale]/invite/[token]/page.tsx',
  'src/app/[locale]/(app)/case/[caseId]/messages/[threadId]/page.tsx',
  'src/app/[locale]/layout.tsx',
  'src/app/[locale]/(auth)/reset-password/[token]/page.tsx',
  'src/app/[locale]/(app)/case/[caseId]/trends/page.tsx',
  'src/app/[locale]/(app)/case/[caseId]/sharing/page.tsx',
  'src/app/[locale]/(app)/case/[caseId]/today/page.tsx',
  'src/app/[locale]/(app)/case/[caseId]/profile/page.tsx',
  'src/app/[locale]/(app)/case/[caseId]/settings/page.tsx',
  'src/app/[locale]/(app)/case/[caseId]/messages/page.tsx',
  'src/app/[locale]/(app)/case/[caseId]/emergency/page.tsx',
  'src/app/[locale]/(app)/case/[caseId]/medications/page.tsx',
  'src/app/[locale]/(app)/case/[caseId]/clinical/page.tsx',
  'src/app/[locale]/(app)/case/[caseId]/documents/page.tsx',
  'src/app/[locale]/(app)/case/[caseId]/appointments/page.tsx',
  'src/app/[locale]/(app)/case/[caseId]/page.tsx',
];

const backupDir = path.join(__dirname, '..', '.static-params-backup');

try {
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  files.forEach((file, index) => {
    const filePath = path.join(__dirname, '..', file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file}`);
      return;
    }

    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');

    // Backup original
    const backupPath = path.join(backupDir, `file${index}.tsx`);
    fs.writeFileSync(backupPath, content);

    // Remove generateStaticParams function and dynamicParams export
    let newContent = content;

    // Remove dynamicParams export
    newContent = newContent.replace(/export const dynamicParams = true\n*/g, '');

    // Remove generateStaticParams function (handles multi-line)
    newContent = newContent.replace(
      /export async function generateStaticParams\(\)[^}]*\{[^}]*\}\n*/g,
      ''
    );

    // Write modified content
    fs.writeFileSync(filePath, newContent);
    console.log(`✓ Processed: ${file}`);
  });

  console.log(`\n✅ Removed generateStaticParams from ${files.length} files`);
  console.log(`   Backups saved to: ${backupDir}`);

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
