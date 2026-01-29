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
    const lines = content.split('\n');

    // Backup original
    const backupPath = path.join(backupDir, `file${index}.tsx`);
    fs.writeFileSync(backupPath, content);

    // Filter out lines related to generateStaticParams and dynamicParams
    const newLines = [];
    let skipUntilCloseBrace = false;
    let commentBlockSkip = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check for comment block before generateStaticParams
      if (trimmed.startsWith('// For Capacitor') ||
          trimmed.includes('// The actual') ||
          trimmed.includes('// Return a placeholder')) {
        commentBlockSkip = true;
        continue;
      }

      // Skip dynamicParams line
      if (trimmed === 'export const dynamicParams = true') {
        continue;
      }

      // Start of generateStaticParams function
      if (trimmed.startsWith('export async function generateStaticParams')) {
        skipUntilCloseBrace = true;
        continue;
      }

      // Skip lines until we find the closing brace of the function
      if (skipUntilCloseBrace) {
        if (trimmed === '}') {
          skipUntilCloseBrace = false;
        }
        continue;
      }

      // Skip if in comment block
      if (commentBlockSkip) {
        // Check if we've passed the comments
        if (trimmed === 'export const dynamicParams = true' ||
            trimmed.startsWith('export async function generateStaticParams')) {
          // This line will be caught by the conditions above
          continue;
        }
        commentBlockSkip = false;
      }

      newLines.push(line);
    }

    // Remove trailing empty lines (but keep at least one)
    while (newLines.length > 1 && newLines[newLines.length - 1].trim() === '') {
      newLines.pop();
    }

    // Write modified content
    const newContent = newLines.join('\n');
    fs.writeFileSync(filePath, newContent);
    console.log(`✓ Processed: ${file}`);
  });

  console.log(`\n✅ Removed generateStaticParams from ${files.length} files`);
  console.log(`   Backups saved to: ${backupDir}`);

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
