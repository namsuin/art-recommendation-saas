#!/usr/bin/env bun

/**
 * Deployment Validation Script
 * Checks system compatibility and configuration before starting the server
 */

console.log('🔍 Starting deployment validation...\n');

// Check Bun version
console.log('📋 System Information:');
console.log(`  - Bun version: ${Bun.version}`);
console.log(`  - Node.js version: ${process.version}`);
console.log(`  - Platform: ${process.platform}`);
console.log(`  - Architecture: ${process.arch}`);
console.log(`  - Working directory: ${process.cwd()}`);

// Check environment
console.log('\n🌍 Environment Variables:');
console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`  - PORT: ${process.env.PORT || '3000'}`);
console.log(`  - SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ set' : '⚠️ not set (mock mode)'}`);
console.log(`  - CLARIFAI_API_KEY: ${process.env.CLARIFAI_API_KEY ? '✅ set' : '⚠️ not set'}`);
console.log(`  - GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID ? '✅ set' : '⚠️ not set'}`);

// Check critical files
console.log('\n📁 Critical Files:');
const criticalFiles = [
  'package.json',
  'server.ts',
  'backend/services/supabase.ts',
  'backend/services/ai-analysis.ts',
  'frontend/index.html',
  'shared/logger.ts'
];

let allFilesExist = true;
for (const file of criticalFiles) {
  try {
    const fileExists = await Bun.file(file).exists();
    console.log(`  - ${file}: ${fileExists ? '✅' : '❌'}`);
    if (!fileExists) allFilesExist = false;
  } catch (error) {
    console.log(`  - ${file}: ❌ (error checking)`);
    allFilesExist = false;
  }
}

// Check package.json
console.log('\n📦 Package Configuration:');
try {
  const pkg = await Bun.file('package.json').json();
  console.log(`  - Name: ${pkg.name}`);
  console.log(`  - Module: ${pkg.module}`);
  console.log(`  - Type: ${pkg.type}`);
  console.log(`  - Scripts.start: ${pkg.scripts?.start ? '✅' : '❌'}`);
} catch (error) {
  console.log('  - ❌ Error reading package.json');
  allFilesExist = false;
}

// Port binding test
console.log('\n🔌 Port Binding Test:');
const port = parseInt(process.env.PORT || '3000');
try {
  const testServer = Bun.serve({
    port: port,
    hostname: '0.0.0.0',
    fetch() {
      return new Response('Test OK', { status: 200 });
    },
  });
  
  console.log(`  - Port ${port} binding: ✅`);
  testServer.stop();
} catch (error) {
  console.log(`  - Port ${port} binding: ❌ ${error.message}`);
  allFilesExist = false;
}

// Summary
console.log('\n📊 Validation Summary:');
if (allFilesExist) {
  console.log('✅ All validation checks passed!');
  console.log('🚀 Ready to start server...\n');
  process.exit(0);
} else {
  console.log('❌ Some validation checks failed!');
  console.log('🔧 Please fix the issues above before deploying.\n');
  process.exit(1);
}