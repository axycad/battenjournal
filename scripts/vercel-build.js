#!/usr/bin/env node
const { execSync } = require('child_process');

function run(command, options = {}) {
  const { continueOnError = false, timeout = null } = options;

  try {
    console.log(`\n🔄 Running: ${command}`);
    const execOptions = {
      stdio: 'inherit',
      ...(timeout && { timeout })
    };
    execSync(command, execOptions);
    return true;
  } catch (error) {
    if (continueOnError) {
      console.log(`⚠️  Command failed but continuing: ${command}`);
      console.log(`   Error: ${error.message}`);
      return false;
    }
    throw error;
  }
}

console.log('📦 Starting Vercel build process...\n');

// Step 1: Generate Prisma Client (required)
console.log('Step 1: Generate Prisma Client');
run('prisma generate');

// Step 2: Deploy migrations (optional - may timeout on Neon pooler)
console.log('\nStep 2: Deploy database migrations');
const migrationSuccess = run('prisma migrate deploy', {
  continueOnError: true,
  timeout: 30000 // 30 second timeout
});

if (!migrationSuccess) {
  console.log('\n⚠️  Migration deployment skipped due to timeout or error.');
  console.log('   This is often OK if migrations were already applied.');
  console.log('   If you have new migrations, please run them manually or retry the deployment.\n');
}

// Step 3: Build Next.js app (required)
console.log('\nStep 3: Build Next.js application');
run('next build');

console.log('\n✅ Build complete!');
