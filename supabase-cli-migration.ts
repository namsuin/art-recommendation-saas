#!/usr/bin/env bun

/**
 * Supabase CLI Migration Script
 * Uses Supabase CLI to execute the migration if available
 */

import { $ } from 'bun';

async function checkSupabaseCLI() {
  try {
    const result = await $`supabase --version`.quiet();
    console.log(`✅ Supabase CLI found: ${result.stdout.toString().trim()}`);
    return true;
  } catch (error) {
    console.log('❌ Supabase CLI not found');
    console.log('📦 Install with: npm install -g supabase');
    return false;
  }
}

async function executeMigrationViaSupabaseCLI() {
  console.log('🚀 Starting Supabase CLI Migration...\n');
  
  // Check if Supabase CLI is available
  const hasSupabaseCLI = await checkSupabaseCLI();
  if (!hasSupabaseCLI) {
    return false;
  }
  
  try {
    // Copy the migration to the supabase/migrations directory
    const migrationContent = await Bun.file('SOCIAL_MIGRATION_SQL.sql').text();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const migrationFileName = `${timestamp}_social_features.sql`;
    const migrationPath = `supabase/migrations/${migrationFileName}`;
    
    await Bun.write(migrationPath, migrationContent);
    console.log(`📝 Created migration file: ${migrationPath}`);
    
    // Link to the Supabase project
    console.log('🔗 Linking to Supabase project...');
    await $`supabase link --project-ref lzvfmnnshjrjugsrmswu`.env({
      SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || ''
    });
    
    // Run the migration
    console.log('⚡ Executing migration...');
    const result = await $`supabase db push`.env({
      SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || ''
    });
    
    console.log('✅ Migration executed via Supabase CLI');
    console.log(result.stdout.toString());
    
    return true;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`❌ Supabase CLI migration failed: ${errorMessage}`);
    return false;
  }
}

async function installSupabaseCLI() {
  console.log('📦 Installing Supabase CLI...');
  try {
    await $`npm install -g supabase`;
    console.log('✅ Supabase CLI installed successfully');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`❌ Failed to install Supabase CLI: ${errorMessage}`);
    console.log('🔧 Please install manually: npm install -g supabase');
    return false;
  }
}

async function main() {
  let success = await executeMigrationViaSupabaseCLI();
  
  if (!success) {
    console.log('\n🔄 Attempting to install Supabase CLI...');
    const installed = await installSupabaseCLI();
    if (installed) {
      success = await executeMigrationViaSupabaseCLI();
    }
  }
  
  if (!success) {
    console.log('\n💡 Alternative approaches:');
    console.log('1. Use the Supabase Dashboard SQL Editor');
    console.log('2. Run: bun direct-pg-migration.ts (with database password)');
    console.log('3. Use: bun execute-social-migration.ts (multi-method approach)');
  }
}

if (import.meta.main) {
  main();
}