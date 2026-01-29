const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building for Capacitor...\n');

const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');
const apiBackupDir = path.join(__dirname, '..', 'src', 'app', '_api_backup');
const actionsDir = path.join(__dirname, '..', 'src', 'actions');
const actionsBackupDir = path.join(__dirname, '..', 'src', '_actions_backup');
const appActionsDir = path.join(__dirname, '..', 'src', 'app', 'actions');
const appActionsBackupDir = path.join(__dirname, '..', 'src', 'app', '_actions_backup');

try {
  // Step 1: Temporarily rename directories with server actions
  console.log('1. Temporarily moving server-side directories...');
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, apiBackupDir);
    console.log('   ✓ API directory moved');
  }
  if (fs.existsSync(actionsDir)) {
    fs.renameSync(actionsDir, actionsBackupDir);
    console.log('   ✓ Actions directory moved');
  }
  if (fs.existsSync(appActionsDir)) {
    fs.renameSync(appActionsDir, appActionsBackupDir);
    console.log('   ✓ App actions directory moved');
  }

  // Step 2: Build with static export
  console.log('\n2. Building static export...');
  execSync('npm run build', {
    stdio: 'inherit',
    env: { ...process.env, CAPACITOR_BUILD: 'true' }
  });
  console.log('   ✓ Static export complete');

  // Step 3: Restore directories
  console.log('\n3. Restoring directories...');
  if (fs.existsSync(apiBackupDir)) {
    fs.renameSync(apiBackupDir, apiDir);
    console.log('   ✓ API directory restored');
  }
  if (fs.existsSync(actionsBackupDir)) {
    fs.renameSync(actionsBackupDir, actionsDir);
    console.log('   ✓ Actions directory restored');
  }
  if (fs.existsSync(appActionsBackupDir)) {
    fs.renameSync(appActionsBackupDir, appActionsDir);
    console.log('   ✓ App actions directory restored');
  }

  console.log('\n✅ Capacitor build complete!');
  console.log('   Output directory: out/');
  console.log('\nNext steps:');
  console.log('   - Run: npx cap sync');
  console.log('   - Run: npx cap open ios (or android)');

} catch (error) {
  // Restore directories if build fails
  console.error('\n❌ Build failed:', error.message);

  if (fs.existsSync(apiBackupDir)) {
    console.log('\nRestoring API directory...');
    fs.renameSync(apiBackupDir, apiDir);
    console.log('✓ API directory restored');
  }
  if (fs.existsSync(actionsBackupDir)) {
    console.log('Restoring actions directory...');
    fs.renameSync(actionsBackupDir, actionsDir);
    console.log('✓ Actions directory restored');
  }
  if (fs.existsSync(appActionsBackupDir)) {
    console.log('Restoring app actions directory...');
    fs.renameSync(appActionsBackupDir, appActionsDir);
    console.log('✓ App actions directory restored');
  }

  process.exit(1);
}
