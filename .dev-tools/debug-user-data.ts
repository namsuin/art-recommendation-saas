#!/usr/bin/env bun

/**
 * Debug script to check user data in Supabase
 * Usage: bun run debug-user-data.ts
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugUserData() {
  console.log('🔍 Debugging User Data for artprison@kakao.com\n');
  console.log('=' .repeat(60));

  try {
    // 1. Check auth.users table
    console.log('\n📋 Checking auth.users table:');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
    } else {
      const user = authUsers.users.find(u => u.email === 'artprison@kakao.com');
      if (user) {
        console.log('✅ User found in auth.users:');
        console.log('  - ID:', user.id);
        console.log('  - Email:', user.email);
        console.log('  - Created:', new Date(user.created_at).toLocaleString());
        console.log('  - Email Confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
        console.log('  - Metadata:', JSON.stringify(user.user_metadata, null, 2));
      } else {
        console.log('❌ User not found in auth.users');
      }
    }

    // 2. Check public.users table
    console.log('\n📋 Checking public.users table:');
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'artprison@kakao.com')
      .single();

    if (publicError) {
      console.error('❌ Error fetching public user:', publicError.message);
    } else if (publicUser) {
      console.log('✅ User found in public.users:');
      console.log('  - ID:', publicUser.id);
      console.log('  - Email:', publicUser.email);
      console.log('  - Display Name:', publicUser.display_name || 'Not set');
      console.log('  - Role:', publicUser.role || 'NOT SET (this is the problem!)');
      console.log('  - Artist Verified:', publicUser.artist_verified || false);
      console.log('  - Artist Name:', publicUser.artist_name || 'Not set');
      console.log('  - Artist Bio:', publicUser.artist_bio || 'Not set');
      console.log('  - Portfolio URL:', publicUser.artist_portfolio_url || 'Not set');
      console.log('  - Instagram:', publicUser.artist_instagram || 'Not set');
      console.log('  - Subscription Tier:', publicUser.subscription_tier);
      console.log('  - Created:', new Date(publicUser.created_at).toLocaleString());
    } else {
      console.log('❌ User not found in public.users');
    }

    // 3. Check database schema
    console.log('\n📋 Checking database schema for users table:');
    
    // Try to query with role field to see if it exists
    const { error: roleCheckError } = await supabase
      .from('users')
      .select('role')
      .limit(1);
    
    if (roleCheckError && roleCheckError.message.includes('column')) {
      console.log('❌ CRITICAL: "role" column does NOT exist in users table!');
      console.log('   This is why the user role is not saving.');
    } else {
      console.log('✅ "role" column exists in users table');
    }

    // 4. Check artist verification requests
    console.log('\n📋 Checking artist_verification_requests:');
    const { data: verificationRequests, error: verError } = await supabase
      .from('artist_verification_requests')
      .select('*')
      .eq('email', 'artprison@kakao.com');

    if (verError) {
      if (verError.message.includes('relation') || verError.message.includes('does not exist')) {
        console.log('❌ Table "artist_verification_requests" does not exist!');
      } else {
        console.error('❌ Error:', verError.message);
      }
    } else if (verificationRequests && verificationRequests.length > 0) {
      console.log('✅ Verification requests found:', verificationRequests.length);
      verificationRequests.forEach((req: any, index: number) => {
        console.log(`\n  Request ${index + 1}:`);
        console.log('    - Status:', req.status);
        console.log('    - Artist Name:', req.artist_name);
        console.log('    - Created:', new Date(req.created_at).toLocaleString());
      });
    } else {
      console.log('⚠️  No verification requests found');
    }

    // 5. Diagnosis
    console.log('\n' + '=' .repeat(60));
    console.log('🔍 DIAGNOSIS:\n');
    
    if (!publicUser || !publicUser.role) {
      console.log('❌ PROBLEM IDENTIFIED: User role is not set in database!');
      console.log('\n📝 SOLUTION:');
      console.log('1. Run the migration script: migrations/006_add_user_roles.sql');
      console.log('2. Go to Supabase Dashboard → SQL Editor');
      console.log('3. Copy and paste the migration script');
      console.log('4. Click "Run" to execute');
      console.log('\nOr run this quick fix SQL:');
      console.log(`
UPDATE users 
SET role = 'artist',
    display_name = 'artprison'
WHERE email = 'artprison@kakao.com';
      `);
    } else if (publicUser.role === 'user') {
      console.log('⚠️  User exists but role is set to "user" instead of "artist"');
      console.log('\n📝 FIX:');
      console.log(`
UPDATE users 
SET role = 'artist'
WHERE email = 'artprison@kakao.com';
      `);
    } else {
      console.log('✅ User role is correctly set to:', publicUser.role);
      console.log('   If still not showing in UI, try:');
      console.log('   1. Clear browser cache');
      console.log('   2. Log out and log in again');
      console.log('   3. Check browser console for errors');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the debug script
debugUserData().then(() => {
  console.log('\n✅ Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});