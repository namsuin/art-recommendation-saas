#!/usr/bin/env bun

/**
 * Script to check if the database schema has the required columns and tables
 */

import { supabaseAdmin } from './backend/services/supabase-admin';

async function checkDatabaseSchema() {
    console.log('🔍 Database Schema Check');
    console.log('========================');
    console.log('');
    
    if (!supabaseAdmin) {
        console.error('❌ Supabase admin client not available');
        return;
    }
    
    try {
        // 1. Check if users table has the role column
        console.log('1. Checking users table columns...');
        const { data: usersColumns, error: usersError } = await supabaseAdmin
            .rpc('get_table_columns', { table_name: 'users' });
            
        if (usersError) {
            console.log('   Trying alternative method...');
            // Alternative: try to select with specific columns to see what exists
            const { data, error } = await supabaseAdmin
                .from('users')
                .select('id, email, display_name, role, artist_verified, artist_bio, artist_name')
                .limit(1);
                
            if (error) {
                console.error('❌ Error querying users table:', error.message);
                if (error.message.includes('role')) {
                    console.log('   → role column missing');
                }
                if (error.message.includes('artist_verified')) {
                    console.log('   → artist_verified column missing');
                }
                if (error.message.includes('artist_bio')) {
                    console.log('   → artist_bio column missing');
                }
                if (error.message.includes('artist_name')) {
                    console.log('   → artist_name column missing');
                }
            } else {
                console.log('✅ All checked columns exist in users table');
            }
        }
        console.log('');
        
        // 2. Check if artist_verification_requests table exists
        console.log('2. Checking artist_verification_requests table...');
        const { data: verificationData, error: verificationError } = await supabaseAdmin
            .from('artist_verification_requests')
            .select('id')
            .limit(1);
            
        if (verificationError) {
            console.error('❌ artist_verification_requests table does not exist:', verificationError.message);
        } else {
            console.log('✅ artist_verification_requests table exists');
        }
        console.log('');
        
        // 3. Check if user_role enum exists
        console.log('3. Checking user_role enum type...');
        const { data: enumData, error: enumError } = await supabaseAdmin
            .rpc('check_enum_type', { type_name: 'user_role' });
            
        if (enumError) {
            console.log('   Trying alternative method...');
            // Try to create a test query that would fail if enum doesn't exist
            const { error: testError } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('role', 'artist')
                .limit(1);
                
            if (testError && testError.message.includes('user_role')) {
                console.error('❌ user_role enum type does not exist');
            } else {
                console.log('✅ user_role enum type appears to exist');
            }
        }
        console.log('');
        
        // 4. Summary
        console.log('📋 SUMMARY');
        console.log('===========');
        console.log('Based on the errors from the signup process:');
        console.log('- ❌ artist_bio column missing from users table');
        console.log('- ❌ artist_verification_requests table missing');
        console.log('- ❌ Various artist-related columns missing from users table');
        console.log('');
        console.log('🔧 SOLUTION: Run the migration to add missing schema elements');
        console.log('Execute: bun run scripts/run-migration.ts');
        
    } catch (error) {
        console.error('💥 Schema check failed:', error);
    }
}

checkDatabaseSchema();