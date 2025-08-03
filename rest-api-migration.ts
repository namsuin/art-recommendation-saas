#!/usr/bin/env bun

/**
 * REST API Migration Script
 * Uses Supabase REST API to create tables individually
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

// Individual SQL commands to create each table/feature
const migrationSteps = [
  {
    name: 'Add columns to users table',
    sql: `ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS bio TEXT,
          ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
          ADD COLUMN IF NOT EXISTS website_url TEXT,
          ADD COLUMN IF NOT EXISTS location TEXT,
          ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
          ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS artworks_count INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT NOW();`
  },
  {
    name: 'Create user_follows table',
    sql: `CREATE TABLE IF NOT EXISTS user_follows (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
            following_id UUID REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(follower_id, following_id),
            CHECK (follower_id != following_id)
          );`
  },
  {
    name: 'Create artwork_likes table',
    sql: `CREATE TABLE IF NOT EXISTS artwork_likes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            artwork_id UUID,
            artwork_title TEXT,
            artwork_artist TEXT,
            artwork_image_url TEXT,
            source_platform TEXT DEFAULT 'local',
            external_artwork_id TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, artwork_id, source_platform)
          );`
  },
  {
    name: 'Create bookmark_collections table',
    sql: `CREATE TABLE IF NOT EXISTS bookmark_collections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            is_public BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );`
  },
  {
    name: 'Create bookmark_items table',
    sql: `CREATE TABLE IF NOT EXISTS bookmark_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            collection_id UUID REFERENCES bookmark_collections(id) ON DELETE CASCADE,
            artwork_id UUID,
            artwork_title TEXT,
            artwork_artist TEXT,
            artwork_image_url TEXT,
            source_platform TEXT DEFAULT 'local',
            external_artwork_id TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          );`
  },
  {
    name: 'Create community_posts table',
    sql: `CREATE TABLE IF NOT EXISTS community_posts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            image_url TEXT,
            artwork_id UUID,
            source_platform TEXT,
            external_artwork_id TEXT,
            likes_count INTEGER DEFAULT 0,
            comments_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );`
  },
  {
    name: 'Create post_likes table',
    sql: `CREATE TABLE IF NOT EXISTS post_likes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, post_id)
          );`
  },
  {
    name: 'Create post_comments table',
    sql: `CREATE TABLE IF NOT EXISTS post_comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
            likes_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );`
  },
  {
    name: 'Create comment_likes table',
    sql: `CREATE TABLE IF NOT EXISTS comment_likes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, comment_id)
          );`
  },
  {
    name: 'Create notifications table',
    sql: `CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            data JSONB,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW()
          );`
  }
];

async function executeViaHTTPPost(sql: string, description: string) {
  console.log(`⚡ ${description}...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
      console.log(`✅ ${description} - SUCCESS`);
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ ${description} - FAILED: ${error}`);
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`❌ ${description} - ERROR: ${errorMessage}`);
    return false;
  }
}

async function executeViaSupabaseQuery(sql: string, description: string) {
  console.log(`⚡ ${description}...`);
  
  try {
    // Try using a generic query approach
    const { data, error } = await supabase.rpc('sql', { query: sql });
    
    if (error) {
      console.log(`❌ ${description} - FAILED: ${error.message}`);
      return false;
    } else {
      console.log(`✅ ${description} - SUCCESS`);
      return true;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`❌ ${description} - ERROR: ${errorMessage}`);
    return false;
  }
}

async function createExecuteFunction() {
  console.log('🔧 Attempting to create exec function in database...');
  
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec(sql_to_execute TEXT)
    RETURNS TEXT AS $$
    BEGIN
      EXECUTE sql_to_execute;
      RETURN 'SUCCESS';
    EXCEPTION WHEN OTHERS THEN
      RETURN 'ERROR: ' || SQLERRM;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql_to_execute: createFunctionSQL })
    });
    
    if (response.ok) {
      console.log('✅ exec function created successfully');
      return true;
    } else {
      console.log('❌ Could not create exec function');
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to create exec function');
    return false;
  }
}

async function executeViaExecFunction(sql: string, description: string) {
  console.log(`⚡ ${description}...`);
  
  try {
    const { data, error } = await supabase.rpc('exec', { 
      sql_to_execute: sql 
    });
    
    if (error) {
      console.log(`❌ ${description} - FAILED: ${error.message}`);
      return false;
    } else if (data && data.startsWith('ERROR:')) {
      console.log(`❌ ${description} - FAILED: ${data}`);
      return false;
    } else {
      console.log(`✅ ${description} - SUCCESS`);
      return true;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`❌ ${description} - ERROR: ${errorMessage}`);
    return false;
  }
}

async function verifyTables() {
  console.log('\n🔍 Verifying created tables...');
  
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
  
  const existingTables = [];
  const missingTables = [];
  
  for (const tableName of socialTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${tableName}: Missing or inaccessible`);
        missingTables.push(tableName);
      } else {
        console.log(`✅ ${tableName}: Exists and accessible`);
        existingTables.push(tableName);
      }
    } catch (err) {
      console.log(`❌ ${tableName}: Verification failed`);
      missingTables.push(tableName);
    }
  }
  
  console.log(`\n📊 Migration Results:`);
  console.log(`✅ Existing tables: ${existingTables.length}/${socialTables.length}`);
  console.log(`❌ Missing tables: ${missingTables.length}/${socialTables.length}`);
  
  return existingTables.length;
}

async function executeMigration() {
  console.log('🚀 Starting REST API Migration...\n');
  
  let successCount = 0;
  const totalSteps = migrationSteps.length;
  
  // Method 1: Try creating exec function first
  console.log('📋 Method 1: Trying with custom exec function...');
  const hasExecFunction = await createExecuteFunction();
  
  if (hasExecFunction) {
    for (const step of migrationSteps) {
      const success = await executeViaExecFunction(step.sql, step.name);
      if (success) successCount++;
    }
  }
  
  // Method 2: Try direct HTTP calls
  if (successCount === 0) {
    console.log('\n📋 Method 2: Trying direct HTTP calls...');
    successCount = 0;
    
    for (const step of migrationSteps) {
      const success = await executeViaHTTPPost(step.sql, step.name);
      if (success) successCount++;
    }
  }
  
  // Method 3: Try Supabase SDK calls
  if (successCount === 0) {
    console.log('\n📋 Method 3: Trying Supabase SDK calls...');
    successCount = 0;
    
    for (const step of migrationSteps) {
      const success = await executeViaSupabaseQuery(step.sql, step.name);
      if (success) successCount++;
    }
  }
  
  console.log('\n📋 Migration Summary:');
  console.log('=' .repeat(50));
  console.log(`✅ Successful steps: ${successCount}/${totalSteps}`);
  
  if (successCount === totalSteps) {
    console.log('🎉 Migration completed successfully!');
  } else if (successCount > 0) {
    console.log('⚠️  Migration partially completed.');
  } else {
    console.log('💥 Migration failed. Manual intervention required.');
    console.log('\n💡 Manual Steps:');
    console.log('1. Copy the SQL from SOCIAL_MIGRATION_SQL.sql');
    console.log('2. Open Supabase Dashboard -> SQL Editor');
    console.log('3. Paste and execute the SQL manually');
  }
  
  // Verify final state
  const createdTables = await verifyTables();
  
  if (createdTables >= 5) { // At least half the tables
    console.log('\n🎯 Sufficient tables created for basic social features!');
  }
}

if (import.meta.main) {
  executeMigration().catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
}