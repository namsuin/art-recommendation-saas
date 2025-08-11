import { supabase } from './backend/services/supabase';
import fs from 'fs';

async function runMigration() {
  try {
    const migrationSQL = fs.readFileSync('./migrations/007_create_artist_applications.sql', 'utf8');
    
    console.log('🔄 Running artist applications table migration...');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
    } else {
      console.log('✅ Migration completed successfully!');
    }
  } catch (error) {
    console.error('❌ Error running migration:', error);
  }
}

runMigration();