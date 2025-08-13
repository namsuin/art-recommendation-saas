#!/usr/bin/env bun
/**
 * Deployment validation script for Render
 * Checks if all critical components are working
 */

console.log('🔍 Validating deployment environment...');

// Check Bun runtime
console.log(`✅ Bun version: ${Bun.version}`);

// Check Node.js compatibility
console.log(`✅ Node.js compatibility: ${process.version}`);

// Check environment variables
const requiredEnvs = ['PORT'];
const optionalEnvs = ['NODE_ENV', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];

console.log('\n📋 Environment Variables:');
requiredEnvs.forEach(env => {
  if (process.env[env]) {
    console.log(`✅ ${env}: ${process.env[env]}`);
  } else {
    console.error(`❌ ${env}: MISSING (REQUIRED)`);
    process.exit(1);
  }
});

optionalEnvs.forEach(env => {
  if (process.env[env]) {
    console.log(`✅ ${env}: ${env === 'NODE_ENV' ? process.env[env] : '[SET]'}`);
  } else {
    console.log(`⚠️  ${env}: Not set (optional)`);
  }
});

// Check if critical files exist
const criticalFiles = [
  './server.ts',
  './package.json',
  './frontend/index.html'
];

console.log('\n📁 Critical Files:');
for (const file of criticalFiles) {
  try {
    const fileObj = Bun.file(file);
    const exists = await fileObj.exists();
    if (exists) {
      console.log(`✅ ${file}: Found`);
    } else {
      console.error(`❌ ${file}: Missing`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ ${file}: Error checking - ${error.message}`);
  }
}

// Test port binding
console.log('\n🔌 Testing port binding...');
const port = parseInt(process.env.PORT || '3000');
const hostname = '0.0.0.0';

try {
  // Try to bind to the port
  const testServer = Bun.serve({
    port,
    hostname,
    fetch() {
      return new Response('OK');
    }
  });
  
  console.log(`✅ Can bind to ${hostname}:${port}`);
  testServer.stop();
} catch (error) {
  if (error.message.includes('port') || error.message.includes('EADDRINUSE')) {
    // Port is in use, which is expected in development
    console.log(`⚠️  Port ${port} is in use (this is normal if server is running)`);
  } else {
    console.error(`❌ Cannot bind to ${hostname}:${port} - ${error.message}`);
    process.exit(1);
  }
}

console.log('\n🎉 All deployment validations passed!');
console.log('Ready to start server...');