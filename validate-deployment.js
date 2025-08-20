#!/usr/bin/env bun

// Validate deployment environment
console.log('🔍 Validating deployment environment...');

// Check required environment variables
const requiredVars = [
  'PORT',
  'GOOGLE_VISION_SERVICE_ACCOUNT_KEY',
  'CLARIFAI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY'
];

const warnings = [];
const errors = [];

// Check environment variables
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    if (varName === 'PORT') {
      console.log(`⚠️  ${varName} not set, will use default port 3000`);
    } else {
      warnings.push(`${varName} is not configured`);
    }
  }
}

// Check for optional services
const optionalVars = [
  'REPLICATE_API_TOKEN',
  'STRIPE_SECRET_KEY'
];

for (const varName of optionalVars) {
  if (!process.env[varName]) {
    console.log(`ℹ️  Optional: ${varName} not configured`);
  }
}

// Display results
if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach(w => console.log(`  - ${w}`));
}

if (errors.length > 0) {
  console.log('\n❌ Errors:');
  errors.forEach(e => console.log(`  - ${e}`));
  process.exit(1);
}

console.log('✅ Deployment validation complete');
console.log('🚀 Starting server...\n');