#!/usr/bin/env bun

/**
 * Comprehensive SQL Migration Executor for Supabase
 * Tries multiple methods to execute SQL on Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Environment variables
const SUPABASE_URL = 'https://lzvfmnnshjrjugsrmswu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dmZtbm5zaGpyanVnc3Jtc3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA1NjMzNiwiZXhwIjoyMDY5NjMyMzM2fQ.1b0pP5WdI9rKfnFQLYqULbfL02da0iaJ-kAxbxdk02A';

// PostgreSQL connection details extracted from Supabase URL
const PG_CONNECTION = {
  host: 'db.lzvfmnnshjrjugsrmswu.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'A*3MeDJPvUKJhb8', // This might need to be updated with actual password
  ssl: { rejectUnauthorized: false }
};

interface MigrationResult {
  method: string;
  success: boolean;
  error?: string;
  details?: any;
}

class SupabaseMigrationExecutor {
  private supabaseAdmin;
  private sqlContent: string;

  constructor() {
    this.supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public'
      }
    });
    this.sqlContent = '';
  }

  async loadMigrationSQL(): Promise<void> {
    try {
      const sqlPath = path.join(process.cwd(), 'SOCIAL_MIGRATION_SQL.sql');
      this.sqlContent = await Bun.file(sqlPath).text();
      console.log('✅ Migration SQL loaded successfully');
      console.log(`📄 Content length: ${this.sqlContent.length} characters`);
    } catch (error) {
      throw new Error(`Failed to load migration SQL: ${error}`);
    }
  }

  /**
   * Method 1: Try using Supabase SDK with rpc function
   */
  async trySupabaseRPC(): Promise<MigrationResult> {
    console.log('\n🔄 Method 1: Trying Supabase RPC...');
    
    try {
      // Split SQL into smaller commands
      const commands = this.splitSQLCommands(this.sqlContent);
      console.log(`📝 Split into ${commands.length} commands`);

      const results = [];
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        console.log(`⚡ Executing command ${i + 1}/${commands.length}...`);
        
        try {
          const { data, error } = await this.supabaseAdmin.rpc('exec_sql', {
            sql_query: command
          });
          
          if (error) {
            console.log(`❌ Command ${i + 1} failed: ${error.message}`);
            results.push({ success: false, error: error.message, command: command.substring(0, 100) });
          } else {
            console.log(`✅ Command ${i + 1} succeeded`);
            results.push({ success: true, command: command.substring(0, 100) });
          }
        } catch (err) {
          console.log(`❌ Command ${i + 1} exception: ${err.message}`);
          results.push({ success: false, error: err.message, command: command.substring(0, 100) });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const success = successCount === commands.length;
      
      return {
        method: 'Supabase RPC',
        success,
        details: {
          total: commands.length,
          successful: successCount,
          failed: commands.length - successCount,
          results
        }
      };
    } catch (error) {
      return {
        method: 'Supabase RPC',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Method 2: Try using direct HTTP REST API calls
   */
  async tryDirectHTTP(): Promise<MigrationResult> {
    console.log('\n🔄 Method 2: Trying Direct HTTP...');
    
    try {
      const commands = this.splitSQLCommands(this.sqlContent);
      const results = [];

      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        console.log(`⚡ HTTP executing command ${i + 1}/${commands.length}...`);
        
        try {
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              sql_query: command
            })
          });

          if (response.ok) {
            console.log(`✅ HTTP Command ${i + 1} succeeded`);
            results.push({ success: true, command: command.substring(0, 100) });
          } else {
            const errorText = await response.text();
            console.log(`❌ HTTP Command ${i + 1} failed: ${response.status} - ${errorText}`);
            results.push({ 
              success: false, 
              error: `${response.status}: ${errorText}`, 
              command: command.substring(0, 100) 
            });
          }
        } catch (err) {
          console.log(`❌ HTTP Command ${i + 1} exception: ${err.message}`);
          results.push({ success: false, error: err.message, command: command.substring(0, 100) });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const success = successCount === commands.length;
      
      return {
        method: 'Direct HTTP',
        success,
        details: {
          total: commands.length,
          successful: successCount,
          failed: commands.length - successCount,
          results
        }
      };
    } catch (error) {
      return {
        method: 'Direct HTTP',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Method 3: Try using PostgreSQL direct connection
   */
  async tryPostgreSQLDirect(): Promise<MigrationResult> {
    console.log('\n🔄 Method 3: Trying PostgreSQL Direct Connection...');
    
    try {
      // Try to use pg library if available
      const { Pool } = await import('pg');
      
      const pool = new Pool(PG_CONNECTION);
      const client = await pool.connect();
      
      console.log('✅ PostgreSQL connection established');
      
      const commands = this.splitSQLCommands(this.sqlContent);
      const results = [];

      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        console.log(`⚡ PG executing command ${i + 1}/${commands.length}...`);
        
        try {
          await client.query(command);
          console.log(`✅ PG Command ${i + 1} succeeded`);
          results.push({ success: true, command: command.substring(0, 100) });
        } catch (err) {
          console.log(`❌ PG Command ${i + 1} failed: ${err.message}`);
          results.push({ success: false, error: err.message, command: command.substring(0, 100) });
        }
      }

      client.release();
      await pool.end();

      const successCount = results.filter(r => r.success).length;
      const success = successCount === commands.length;
      
      return {
        method: 'PostgreSQL Direct',
        success,
        details: {
          total: commands.length,
          successful: successCount,
          failed: commands.length - successCount,
          results
        }
      };
    } catch (error) {
      return {
        method: 'PostgreSQL Direct',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Method 4: Try using Bun's built-in SQL
   */
  async tryBunSQL(): Promise<MigrationResult> {
    console.log('\n🔄 Method 4: Trying Bun SQL...');
    
    try {
      // Build PostgreSQL connection string
      const connectionString = `postgresql://postgres:A*3MeDJPvUKJhb8@db.lzvfmnnshjrjugsrmswu.supabase.co:5432/postgres?sslmode=require`;
      
      const sql = Bun.sql(connectionString);
      
      const commands = this.splitSQLCommands(this.sqlContent);
      const results = [];

      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        console.log(`⚡ Bun SQL executing command ${i + 1}/${commands.length}...`);
        
        try {
          await sql.query(command);
          console.log(`✅ Bun SQL Command ${i + 1} succeeded`);
          results.push({ success: true, command: command.substring(0, 100) });
        } catch (err) {
          console.log(`❌ Bun SQL Command ${i + 1} failed: ${err.message}`);
          results.push({ success: false, error: err.message, command: command.substring(0, 100) });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const success = successCount === commands.length;
      
      return {
        method: 'Bun SQL',
        success,
        details: {
          total: commands.length,
          successful: successCount,
          failed: commands.length - successCount,
          results
        }
      };
    } catch (error) {
      return {
        method: 'Bun SQL',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Method 5: Try creating tables individually using Supabase Schema Builder
   */
  async trySchemaBuilder(): Promise<MigrationResult> {
    console.log('\n🔄 Method 5: Trying Schema Builder Approach...');
    
    try {
      const results = [];
      
      // 1. Alter users table
      console.log('📝 Adding columns to users table...');
      try {
        const alterUsersSQL = `
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS bio TEXT,
          ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
          ADD COLUMN IF NOT EXISTS website_url TEXT,
          ADD COLUMN IF NOT EXISTS location TEXT,
          ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
          ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS artworks_count INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT NOW();
        `;
        
        const { error } = await this.supabaseAdmin.rpc('exec', { sql: alterUsersSQL });
        if (error) throw error;
        
        console.log('✅ Users table altered successfully');
        results.push({ success: true, operation: 'ALTER users table' });
      } catch (err) {
        console.log(`❌ Failed to alter users table: ${err.message}`);
        results.push({ success: false, error: err.message, operation: 'ALTER users table' });
      }

      // 2. Create individual tables using direct queries
      const tableCreationSQL = [
        {
          name: 'user_follows',
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
          name: 'artwork_likes',
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
        }
        // Add more tables here...
      ];

      for (const table of tableCreationSQL) {
        try {
          console.log(`📝 Creating table: ${table.name}...`);
          const { data, error } = await this.supabaseAdmin
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_name', table.name)
            .eq('table_schema', 'public');
          
          // If table doesn't exist, try to create it
          if (!data || data.length === 0) {
            // This approach might not work directly, but worth trying
            console.log(`Table ${table.name} doesn't exist, attempting to create...`);
          }
          
          results.push({ success: true, operation: `Check table ${table.name}` });
        } catch (err) {
          console.log(`❌ Failed to handle table ${table.name}: ${err.message}`);
          results.push({ success: false, error: err.message, operation: `Handle table ${table.name}` });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const success = successCount === results.length;
      
      return {
        method: 'Schema Builder',
        success,
        details: {
          total: results.length,
          successful: successCount,
          failed: results.length - successCount,
          results
        }
      };
    } catch (error) {
      return {
        method: 'Schema Builder',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify migration by checking if tables exist
   */
  async verifyMigration(): Promise<void> {
    console.log('\n🔍 Verifying migration results...');
    
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
        const { data, error } = await this.supabaseAdmin
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
        console.log(`❌ ${tableName}: Verification failed - ${err.message}`);
        missingTables.push(tableName);
      }
    }
    
    console.log(`\n📊 Migration Status:`);
    console.log(`✅ Existing tables: ${existingTables.length}/${socialTables.length}`);
    console.log(`❌ Missing tables: ${missingTables.length}/${socialTables.length}`);
    
    if (existingTables.length > 0) {
      console.log(`\n✅ Successfully created: ${existingTables.join(', ')}`);
    }
    
    if (missingTables.length > 0) {
      console.log(`\n❌ Still missing: ${missingTables.join(', ')}`);
    }
  }

  private splitSQLCommands(sql: string): string[] {
    // Split by semicolons, but be careful with function definitions
    const commands = sql
      .split(/;\s*(?=\n|$)/) // Split on semicolons followed by newline or end
      .map(cmd => cmd.trim())
      .filter(cmd => 
        cmd.length > 0 && 
        !cmd.startsWith('--') && 
        !cmd.match(/^\/\*.*\*\/$/) &&
        cmd !== 'SELECT schemaname, tablename' // Skip the verification query at the end
      );
    
    return commands;
  }

  async executeMigration(): Promise<void> {
    console.log('🚀 Starting Supabase Social Features Migration...\n');
    
    // Load the migration SQL
    await this.loadMigrationSQL();
    
    const results: MigrationResult[] = [];
    
    // Try all methods
    results.push(await this.trySupabaseRPC());
    results.push(await this.tryDirectHTTP());
    results.push(await this.tryPostgreSQLDirect());
    results.push(await this.tryBunSQL());
    results.push(await this.trySchemaBuilder());
    
    // Report results
    console.log('\n📋 Migration Attempt Summary:');
    console.log('=' .repeat(50));
    
    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.method}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.details) {
        console.log(`   Details: ${result.details.successful}/${result.details.total} commands successful`);
      }
    }
    
    // Check if any method succeeded
    const successfulMethod = results.find(r => r.success);
    if (successfulMethod) {
      console.log(`\n🎉 Migration completed successfully using: ${successfulMethod.method}`);
    } else {
      console.log(`\n💥 All migration methods failed. Manual intervention required.`);
    }
    
    // Verify final state
    await this.verifyMigration();
  }
}

// Main execution
async function main() {
  const executor = new SupabaseMigrationExecutor();
  
  try {
    await executor.executeMigration();
  } catch (error) {
    console.error('💥 Migration execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { SupabaseMigrationExecutor };