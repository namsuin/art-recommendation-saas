#!/usr/bin/env bun
import { supabase } from '../backend/services/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  try {
    console.log('🏗️ Running database migration...');
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/004_user_roles_artwork_management.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    if (!supabase) {
      console.error('❌ No Supabase connection available');
      process.exit(1);
    }
    
    console.log('📝 Executing migration SQL...');
    
    // Split SQL into individual statements (rough approach)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        try {
          const { error } = await supabase.rpc('execute_sql', { sql_statement: statement });
          if (error) {
            console.error(`❌ Error in statement ${i + 1}:`, error);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`❌ Error executing statement ${i + 1}:`, err);
          // Continue with other statements
        }
      }
    }
    
    console.log('🎉 Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();