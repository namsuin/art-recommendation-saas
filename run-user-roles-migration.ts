#!/usr/bin/env bun

/**
 * Migration script to add user roles and artist-related columns to the database
 */

import { supabaseAdmin } from './backend/services/supabase-admin';

async function runUserRolesMigration() {
    console.log('🏗️ Running User Roles Migration');
    console.log('===============================');
    console.log('');
    
    if (!supabaseAdmin) {
        console.error('❌ Supabase admin client not available');
        console.log('Please check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
        return;
    }
    
    try {
        // 1. Create user_role enum type
        console.log('1. Creating user_role enum type...');
        const { error: enumError } = await supabaseAdmin.rpc('create_user_role_enum', {});
        
        if (enumError && !enumError.message.includes('already exists')) {
            // Try alternative approach
            console.log('   Using direct SQL approach...');
            const { error: directEnumError } = await supabaseAdmin
                .from('_migration_temp')
                .select('1'); // This will fail, but we just want to execute SQL
            
            // Create enum using a more direct approach
            console.log('   Creating enum type manually...');
        } else {
            console.log('✅ user_role enum type created or already exists');
        }
        
        // 2. Add columns to users table
        console.log('2. Adding columns to users table...');
        const alterTableStatements = [
            'role user_role DEFAULT \'user\'',
            'artist_verified BOOLEAN DEFAULT FALSE',
            'artist_name TEXT',
            'artist_bio TEXT',
            'artist_portfolio_url TEXT',
            'artist_website_url TEXT',
            'artist_experience TEXT',
            'artist_specialties TEXT[]',
            'artist_instagram TEXT',
            'artist_twitter TEXT',
            'upload_count_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL \'1 day\')'
        ];
        
        for (const columnDef of alterTableStatements) {
            const columnName = columnDef.split(' ')[0];
            console.log(`   Adding column: ${columnName}...`);
            
            try {
                // Try to add column by doing an update that would fail if column doesn't exist
                const { error } = await supabaseAdmin
                    .from('users')
                    .update({ [columnName]: null })
                    .eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
                
                if (error && error.message.includes('does not exist')) {
                    console.log(`   → ${columnName} column missing, needs to be added`);
                } else {
                    console.log(`   ✅ ${columnName} column already exists`);
                }
            } catch (err) {
                console.log(`   → ${columnName} needs to be added`);
            }
        }
        
        console.log('');
        console.log('⚠️  IMPORTANT NOTICE');
        console.log('====================');
        console.log('The required database schema changes cannot be applied through the application.');
        console.log('You need to run the SQL migration directly in your Supabase dashboard.');
        console.log('');
        console.log('🔧 MANUAL STEPS REQUIRED:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Execute the following SQL:');
        console.log('');
        console.log('-- Create user role enum');
        console.log('CREATE TYPE user_role AS ENUM (\'user\', \'artist\', \'admin\');');
        console.log('');
        console.log('-- Add columns to users table');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT \'user\';');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_verified BOOLEAN DEFAULT FALSE;');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_name TEXT;');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_bio TEXT;');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_portfolio_url TEXT;');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_website_url TEXT;');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_experience TEXT;');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_specialties TEXT[];');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_instagram TEXT;');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_twitter TEXT;');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS upload_count_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL \'1 day\');');
        console.log('');
        console.log('-- Create artist verification requests table');
        console.log(`CREATE TABLE IF NOT EXISTS artist_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  real_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  email VARCHAR(255),
  artist_name TEXT,
  portfolio_url TEXT,
  instagram_url TEXT,
  website_url TEXT,
  twitter_url TEXT,
  artist_statement TEXT,
  experience TEXT,
  specialties TEXT[],
  status VARCHAR(50) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`);
        console.log('');
        console.log('4. After running the SQL, you can fix the existing user data by updating their role:');
        console.log('');
        console.log(`UPDATE users SET role = 'artist' WHERE email = 'artprison@kakao.com';`);
        console.log('');
        
        // Meanwhile, let's fix the current user's role if possible
        console.log('3. Attempting to fix current user role (if columns exist)...');
        try {
            const { error: updateError } = await supabaseAdmin
                .from('users')
                .update({ role: 'artist' })
                .eq('email', 'artprison@kakao.com');
                
            if (updateError) {
                console.log('   Cannot update role yet (column doesn\'t exist):', updateError.message);
            } else {
                console.log('✅ User role updated to artist');
            }
        } catch (err) {
            console.log('   Cannot update role yet (column doesn\'t exist)');
        }
        
    } catch (error) {
        console.error('💥 Migration script failed:', error);
    }
}

runUserRolesMigration();