const fs = require('fs');
const path = require('path');

console.log('Restoring generateStaticParams...\n');

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
  if (!fs.existsSync(backupDir)) {
    console.log('❌ No backup directory found');
    process.exit(1);
  }

  files.forEach((file, index) => {
    const filePath = path.join(__dirname, '..', file);
    const backupPath = path.join(backupDir, `file${index}.tsx`);

    if (!fs.existsSync(backupPath)) {
      console.log(`⚠️  Backup not found: ${file}`);
      return;
    }

    // Restore from backup
    const backupContent = fs.readFileSync(backupPath, 'utf8');
    fs.writeFileSync(filePath, backupContent);
    console.log(`✓ Restored: ${file}`);
  });

  console.log(`\n✅ Restored ${files.length} files`);

  // Clean up backup directory
  fs.rmSync(backupDir, { recursive: true, force: true });
  console.log('✓ Removed backup directory');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
