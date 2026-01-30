const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

// Define replacement patterns
const replacements = [
  // Profile actions -> API
  { from: "@/actions/profile", to: "@/lib/api/profile" },

  // Event actions -> API
  { from: "@/actions/event", to: "@/lib/api/events" },

  // Case actions -> API
  { from: "@/actions/case", to: "@/lib/api/cases" },

  // Document actions -> API
  { from: "@/actions/document", to: "@/lib/api/documents" },

  // Messaging actions -> API
  { from: "@/actions/messaging", to: "@/lib/api/messaging" },

  // Invite actions -> API
  { from: "@/actions/invite", to: "@/lib/api/invites" },

  // Auth actions -> API
  { from: "@/actions/auth", to: "@/lib/api" },

  // Clinical notes actions -> API
  { from: "@/actions/clinical-notes", to: "@/lib/api/clinical" },

  // Flags actions -> API
  { from: "@/actions/flags", to: "@/lib/api/clinical" },

  // Tasks actions -> API
  { from: "@/actions/tasks", to: "@/lib/api/tasks" },

  // Watches actions -> API
  { from: "@/actions/watches", to: "@/lib/api/clinical" },

  // Audit actions -> API
  { from: "@/actions/audit", to: "@/lib/api" },

  // Email notifications actions -> API
  { from: "@/actions/email-notifications", to: "@/lib/api/notifications" },

  // Sharing actions -> API
  { from: "@/actions/sharing", to: "@/lib/api/invites" },
];

const basePath = path.join(__dirname, 'src', 'app', '[locale]');

// Find all TSX/TS files
console.log('Finding files with server action imports...');
try {
  const output = execSync(
    `find "${basePath}" -name "*.tsx" -o -name "*.ts" | xargs grep -l "from '@/actions"`,
    { encoding: 'utf-8' }
  );

  const files = output.trim().split('\n').filter(f => f);
  console.log(`Found ${files.length} files to update`);

  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    replacements.forEach(({ from, to }) => {
      const regex = new RegExp(from.replace(/\//g, '\\/'), 'g');
      if (regex.test(content)) {
        content = content.replace(regex, to);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✓ Updated: ${path.relative(basePath, file)}`);
    }
  });

  console.log('\n✅ Import paths updated successfully!');
} catch (error) {
  console.error('Error:', error.message);
}
