const fs = require('fs');
const path = require('path');

console.log('Setting generateStaticParams to return empty arrays...\n');

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

    //Read file content
    const content = fs.readFileSync(filePath, 'utf8');

    // Backup original
    const backupPath = path.join(backupDir, `file${index}.tsx`);
    fs.writeFileSync(backupPath, content);

    // Replace the return value of generateStaticParams to return []
    let newContent = content;

    // Replace placeholder returns with empty array
    newContent = newContent.replace(
      /return \[\{ caseId: '_placeholder_' \}\]/g,
      'return []'
    );
    newContent = newContent.replace(
      /return \[\{ token: '_placeholder_' \}\]/g,
      'return []'
    );
    newContent = newContent.replace(
      /return \[\{ threadId: '_placeholder_' \}\]/g,
      'return []'
    );
    newContent = newContent.replace(
      /return \[\{ locale: '_placeholder_' \}\]/g,
      'return []'
    );

    // Write modified content
    fs.writeFileSync(filePath, newContent);
    console.log(`✓ Processed: ${file}`);
  });

  console.log(`\n✅ Modified generateStaticParams in ${files.length} files`);
  console.log(`   Backups saved to: ${backupDir}`);

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
