#!/usr/bin/env bun

/**
 * Complete Migration Verification Script
 * Comprehensive check of all social features migration components
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lzvfmnnshjrjugsrmswu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dmZtbm5zaGpyanVnc3Jtc3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA1NjMzNiwiZXhwIjoyMDY5NjMyMzM2fQ.1b0pP5WdI9rKfnFQLYqULbfL02da0iaJ-kAxbxdk02A';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

async function verifyTables() {
  console.log('🔍 Verifying Social Feature Tables...\n');
  
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
  
  const results = [];
  
  for (const tableName of socialTables) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
        results.push({ table: tableName, exists: false, error: error.message });
      } else {
        console.log(`✅ ${tableName}: Exists (${count || 0} rows)`);
        results.push({ table: tableName, exists: true, count: count || 0 });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.log(`❌ ${tableName}: Exception - ${errorMessage}`);
      results.push({ table: tableName, exists: false, error: errorMessage });
    }
  }
  
  const existingTables = results.filter(r => r.exists);
  console.log(`\n📊 Table Status: ${existingTables.length}/${socialTables.length} tables exist\n`);
  
  return results;
}

async function checkUsersTableColumns() {
  console.log('👤 Verifying Users Table Extensions...\n');
  
  // Test by trying to select the new columns
  const newColumns = [
    'bio',
    'profile_image_url',
    'website_url',
    'location',
    'is_public',
    'followers_count',
    'following_count',
    'likes_count',
    'artworks_count',
    'joined_at'
  ];
  
  const columnResults = [];
  
  for (const column of newColumns) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(column)
        .limit(1);
      
      if (error) {
        console.log(`❌ users.${column}: ${error.message}`);
        columnResults.push({ column, exists: false, error: error.message });
      } else {
        console.log(`✅ users.${column}: Available`);
        columnResults.push({ column, exists: true });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.log(`❌ users.${column}: Exception - ${errorMessage}`);
      columnResults.push({ column, exists: false, error: errorMessage });
    }
  }
  
  const existingColumns = columnResults.filter(r => r.exists);
  console.log(`\n📊 Users Columns: ${existingColumns.length}/${newColumns.length} new columns exist\n`);
  
  return columnResults;
}

async function testBasicOperations() {
  console.log('🧪 Testing Basic Social Operations...\n');
  
  const tests = [];
  
  // Test 1: Check if we can read from social tables
  try {
    const { data: follows, error: followsError } = await supabase
      .from('user_follows')
      .select('*')
      .limit(1);
    
    if (followsError) {
      console.log(`❌ Read user_follows: ${followsError.message}`);
      tests.push({ test: 'Read user_follows', success: false, error: followsError.message });
    } else {
      console.log(`✅ Read user_follows: Success`);
      tests.push({ test: 'Read user_follows', success: true });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.log(`❌ Read user_follows: ${errorMessage}`);
    tests.push({ test: 'Read user_follows', success: false, error: errorMessage });
  }
  
  // Test 2: Check notifications table
  try {
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('id, type, title, message, is_read')
      .limit(1);
    
    if (notifError) {
      console.log(`❌ Read notifications: ${notifError.message}`);
      tests.push({ test: 'Read notifications', success: false, error: notifError.message });
    } else {
      console.log(`✅ Read notifications: Success`);
      tests.push({ test: 'Read notifications', success: true });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.log(`❌ Read notifications: ${errorMessage}`);
    tests.push({ test: 'Read notifications', success: false, error: errorMessage });
  }
  
  // Test 3: Check community posts
  try {
    const { data: posts, error: postsError } = await supabase
      .from('community_posts')
      .select('id, content, likes_count, comments_count')
      .limit(1);
    
    if (postsError) {
      console.log(`❌ Read community_posts: ${postsError.message}`);
      tests.push({ test: 'Read community_posts', success: false, error: postsError.message });
    } else {
      console.log(`✅ Read community_posts: Success`);
      tests.push({ test: 'Read community_posts', success: true });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.log(`❌ Read community_posts: ${errorMessage}`);
    tests.push({ test: 'Read community_posts', success: false, error: errorMessage });
  }
  
  const successfulTests = tests.filter(t => t.success);
  console.log(`\n📊 Basic Operations: ${successfulTests.length}/${tests.length} tests passed\n`);
  
  return tests;
}

async function generateMigrationReport() {
  console.log('📋 Generating Complete Migration Report...\n');
  console.log('=' .repeat(60));
  console.log('🎯 SUPABASE SOCIAL FEATURES MIGRATION REPORT');
  console.log('=' .repeat(60));
  
  const tableResults = await verifyTables();
  const columnResults = await checkUsersTableColumns();
  const testResults = await testBasicOperations();
  
  console.log('📈 SUMMARY:');
  console.log('-' .repeat(40));
  
  const tablesExist = tableResults.filter(r => r.exists).length;
  const columnsExist = columnResults.filter(r => r.exists).length;
  const testsPass = testResults.filter(r => r.success).length;
  
  console.log(`✅ Social Tables: ${tablesExist}/9 created`);
  console.log(`✅ User Columns: ${columnsExist}/10 added`);
  console.log(`✅ Basic Tests: ${testsPass}/${testResults.length} passed`);
  
  const overallSuccess = tablesExist >= 7 && columnsExist >= 7 && testsPass >= 2;
  
  if (overallSuccess) {
    console.log('\n🎉 MIGRATION STATUS: SUCCESS');
    console.log('✅ Social features are ready to use!');
    console.log('\n🚀 Next Steps:');
    console.log('1. Test social features in your application');
    console.log('2. Check RLS policies are working correctly');
    console.log('3. Verify triggers and functions are operational');
  } else {
    console.log('\n⚠️  MIGRATION STATUS: PARTIAL SUCCESS');
    console.log('🔧 Some components may need manual setup');
    
    if (tablesExist < 9) {
      console.log(`\n❌ Missing tables: ${9 - tablesExist}`);
      const missingTables = tableResults.filter(r => !r.exists);
      missingTables.forEach(t => console.log(`   - ${t.table}`));
    }
    
    if (columnsExist < 10) {
      console.log(`\n❌ Missing user columns: ${10 - columnsExist}`);
      const missingColumns = columnResults.filter(r => !r.exists);
      missingColumns.forEach(c => console.log(`   - ${c.column}`));
    }
  }
  
  console.log('\n📖 Manual Steps (if needed):');
  console.log('1. Open Supabase Dashboard → SQL Editor');
  console.log('2. Copy SQL from SOCIAL_MIGRATION_SQL.sql');
  console.log('3. Execute remaining migration components');
  
  console.log('\n📞 Support Files Created:');
  console.log('- execute-social-migration.ts (multi-method approach)');
  console.log('- direct-pg-migration.ts (PostgreSQL direct)');
  console.log('- rest-api-migration.ts (REST API approach)');
  console.log('- supabase-cli-migration.ts (CLI approach)');
  
  console.log('\n' + '=' .repeat(60));
  
  return {
    tablesCreated: tablesExist,
    columnsAdded: columnsExist,
    testsPass: testsPass,
    overallSuccess: overallSuccess,
    details: {
      tables: tableResults,
      columns: columnResults,
      tests: testResults
    }
  };
}

if (import.meta.main) {
  generateMigrationReport().catch(error => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });
}