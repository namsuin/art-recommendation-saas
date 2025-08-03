#!/usr/bin/env bun

// Development environment checker
import { validateEnvironment } from '../backend/utils/env-validator';

console.log('🔍 Checking development environment...\n');

const { isValid, warnings, errors } = validateEnvironment();

if (errors.length > 0) {
  console.log('❌ CRITICAL ERRORS:');
  errors.forEach(error => console.log(`  - ${error}`));
  console.log('\n💡 Create a .env file with the required variables:');
  console.log(`
# Minimum required for development:
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional AI services (at least one recommended):
GOOGLE_CLOUD_PROJECT_ID=your-project-id
REPLICATE_API_TOKEN=your-replicate-token
CLARIFAI_API_KEY=your-clarifai-key
`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  warnings.forEach(warning => console.log(`  - ${warning}`));
  console.log('\n💡 The server will start but some features may not work properly.');
  console.log('Consider adding the missing API keys for full functionality.\n');
}

console.log('✅ Environment check passed! Starting development server...\n');