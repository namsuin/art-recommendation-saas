#!/usr/bin/env bun
import { supabase } from '../backend/services/supabase';

async function createArtworkTable() {
  try {
    console.log('🏗️ Creating registered_artworks table...');
    
    if (!supabase) {
      console.error('❌ No Supabase connection available');
      process.exit(1);
    }
    
    // First, let's check if the table exists
    const { data: existingTable } = await supabase
      .from('registered_artworks')
      .select('id')
      .limit(1);
    
    if (existingTable) {
      console.log('✅ Table already exists!');
      return;
    }
    
    console.log('📝 Table does not exist, creating it...');
    
    // Create the table with a simplified structure for testing
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS registered_artworks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        artist_name VARCHAR(255) NOT NULL,
        artist_id UUID,
        description TEXT,
        year_created INTEGER,
        image_url TEXT NOT NULL,
        category VARCHAR(100),
        medium VARCHAR(255),
        style VARCHAR(255),
        width_cm NUMERIC,
        height_cm NUMERIC,
        depth_cm NUMERIC,
        price_krw NUMERIC,
        is_for_sale BOOLEAN DEFAULT FALSE,
        keywords TEXT[],
        tags TEXT[],
        status VARCHAR(50) DEFAULT 'draft',
        submitted_at TIMESTAMP WITH TIME ZONE,
        approved_at TIMESTAMP WITH TIME ZONE,
        approved_by UUID,
        rejection_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    // Since we can't execute raw SQL directly, let's try to insert a test record to trigger table creation
    // This is a workaround - we'll catch the "table doesn't exist" error
    
    console.log('🎯 Attempting to create table via insertion...');
    
    // Test data
    const testArtwork = {
      title: 'Test Artwork',
      artist_name: 'Test Artist', 
      artist_id: '04acf223-1234-5678-9abc-def012345678',
      description: 'A test artwork',
      year_created: 2023,
      image_url: 'https://example.com/test.jpg',
      category: 'painting',
      medium: 'oil',
      style: 'modern',
      width_cm: 50,
      height_cm: 70,
      price_krw: 1000000,
      is_for_sale: true,
      keywords: ['test'],
      tags: ['test'],
      status: 'draft'
    };
    
    const { data, error } = await supabase
      .from('registered_artworks')
      .insert(testArtwork)
      .select('*');
    
    if (error) {
      console.error('❌ Error creating/inserting:', error);
      console.log('🔧 This likely means the table needs to be created manually in Supabase dashboard');
      console.log('📋 Please run the migration SQL from: supabase/migrations/004_user_roles_artwork_management.sql');
    } else {
      console.log('✅ Table exists and test record created:', data);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

createArtworkTable();