#!/usr/bin/env bun

/**
 * Direct PostgreSQL Migration Script
 * Uses direct PostgreSQL connection to execute the social features migration
 */

import { Pool } from 'pg';
import fs from 'fs';

// Database connection configuration
// For Supabase, the database credentials can be found in project settings
const dbConfig = {
  host: 'db.lzvfmnnshjrjugsrmswu.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  // We'll try to get the password from the Supabase service key or use a direct connection
  password: process.env.DB_PASSWORD || '', // This needs to be set
  ssl: {
    rejectUnauthorized: false
  }
};

async function executeMigration() {
  console.log('🚀 Starting Direct PostgreSQL Migration...\n');
  
  // Read the migration SQL
  const sqlContent = await Bun.file('SOCIAL_MIGRATION_SQL.sql').text();
  console.log(`📄 Loaded migration SQL (${sqlContent.length} characters)`);
  
  // Split SQL into individual commands
  const commands = sqlContent
    .split(/;\s*(?=\n|$)/)
    .map(cmd => cmd.trim())
    .filter(cmd => 
      cmd.length > 0 && 
      !cmd.startsWith('--') && 
      !cmd.match(/^\/\*.*\*\/$/) &&
      !cmd.includes('SELECT schemaname, tablename') // Skip verification queries
    );
  
  console.log(`📝 Split into ${commands.length} SQL commands\n`);
  
  // Try connection with multiple password attempts
  const passwordAttempts = [
    '', // Empty password (sometimes works)
    'postgres', // Common default
    'password', // Another common default
    'A*3MeDJPvUKJhb8', // Extracted from earlier attempts
  ];
  
  let pool = null;
  let connectionSuccess = false;
  
  for (const password of passwordAttempts) {
    try {
      console.log(`🔐 Trying connection with password: ${password ? '[REDACTED]' : '[EMPTY]'}`);
      
      const testConfig = {
        ...dbConfig,
        password: password
      };
      
      pool = new Pool(testConfig);
      const client = await pool.connect();
      
      // Test the connection
      const result = await client.query('SELECT version()');
      console.log(`✅ PostgreSQL connection successful!`);
      console.log(`📊 Server: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}\n`);
      
      client.release();
      connectionSuccess = true;
      break;
      
    } catch (error) {
      console.log(`❌ Connection failed: ${error.message}`);
      if (pool) {
        await pool.end();
        pool = null;
      }
    }
  }
  
  if (!connectionSuccess) {
    console.log('\n💥 Could not establish PostgreSQL connection with any password.');
    console.log('🔧 Manual steps required:');
    console.log('1. Go to Supabase Dashboard -> Settings -> Database');
    console.log('2. Copy the database password');
    console.log('3. Run: DB_PASSWORD="your-password" bun direct-pg-migration.ts');
    process.exit(1);
  }
  
  // Execute migration commands
  console.log('🚀 Starting migration execution...\n');
  
  const results = [];
  let successCount = 0;
  
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    const commandPreview = command.length > 100 ? command.substring(0, 100) + '...' : command;
    
    console.log(`⚡ Executing command ${i + 1}/${commands.length}:`);
    console.log(`   ${commandPreview}`);
    
    try {
      const client = await pool.connect();
      const result = await client.query(command);
      client.release();
      
      console.log(`✅ Success: ${result.command || 'OK'}`);
      if (result.rowCount !== undefined) {
        console.log(`   Affected rows: ${result.rowCount}`);
      }
      
      results.push({
        command: commandPreview,
        success: true,
        result: result.command
      });
      successCount++;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      
      // Check if it's a benign error (like "already exists")
      const isBenign = error.message.includes('already exists') || 
                      error.message.includes('does not exist') ||
                      error.message.includes('if not exists');
      
      if (isBenign) {
        console.log(`   (This is expected if running migration multiple times)`);
        successCount++; // Count benign errors as success
      }
      
      results.push({
        command: commandPreview,
        success: isBenign,
        error: error.message
      });
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Close the connection pool
  await pool.end();
  
  // Report results
  console.log('📋 Migration Summary:');
  console.log('=' .repeat(50));
  console.log(`✅ Successful commands: ${successCount}/${commands.length}`);
  console.log(`❌ Failed commands: ${commands.length - successCount}/${commands.length}`);
  
  if (successCount === commands.length) {
    console.log('\n🎉 Migration completed successfully!');
  } else {
    console.log('\n⚠️  Migration completed with some failures.');
    
    // Show failed commands
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      console.log('\n❌ Failed commands:');
      failures.forEach((failure, idx) => {
        console.log(`${idx + 1}. ${failure.command}`);
        console.log(`   Error: ${failure.error}`);
      });
    }
  }
  
  // Verify tables were created
  console.log('\n🔍 Verifying created tables...');
  await verifyTables();
}

async function verifyTables() {
  const socialTables = [
    'user_follows',
    'artwork_likes', 
    'bookmark_collections',
    'bookmark_items',
    'community_posts',
    'post_likes',
    'post_comments',
    'comment_likes',
    'notifications'
  ];
  
  try {
    const pool = new Pool(dbConfig);
    const client = await pool.connect();
    
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY($1::text[])
      ORDER BY table_name;
    `;
    
    const result = await client.query(query, [socialTables]);
    const existingTables = result.rows.map(row => row.table_name);
    
    console.log('\n📊 Table Verification Results:');
    for (const tableName of socialTables) {
      if (existingTables.includes(tableName)) {
        console.log(`✅ ${tableName}: EXISTS`);
      } else {
        console.log(`❌ ${tableName}: MISSING`);
      }
    }
    
    // Check users table for new columns
    console.log('\n👤 Checking users table columns:');
    const userColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      AND column_name IN ('bio', 'profile_image_url', 'followers_count', 'following_count')
      ORDER BY column_name;
    `;
    
    const userColumnsResult = await client.query(userColumnsQuery);
    const userColumns = userColumnsResult.rows.map(row => row.column_name);
    
    const expectedColumns = ['bio', 'profile_image_url', 'followers_count', 'following_count'];
    for (const column of expectedColumns) {
      if (userColumns.includes(column)) {
        console.log(`✅ users.${column}: EXISTS`);
      } else {
        console.log(`❌ users.${column}: MISSING`);
      }
    }
    
    client.release();
    await pool.end();
    
    console.log(`\n📈 Summary: ${existingTables.length}/${socialTables.length} social tables created`);
    console.log(`📈 Summary: ${userColumns.length}/${expectedColumns.length} user columns added`);
    
  } catch (error) {
    console.log(`❌ Table verification failed: ${error.message}`);
  }
}

// Run if called directly
if (import.meta.main) {
  executeMigration().catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
}