-- ================================================
-- Migration: Add User Roles and Artist Information
-- Date: 2025-08-11
-- Description: Adds role system and artist-specific fields to users table
-- ================================================

-- 1. Create user role enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'artist', 'admin');
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'user_role type already exists, skipping';
END $$;

-- 2. Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- 3. Add artist-specific columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_portfolio_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_website_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_experience TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_specialties TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_instagram TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS artist_twitter TEXT;

-- 4. Add upload tracking columns if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS upload_count_today INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS upload_count_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day');

-- 5. Create artist verification requests table
CREATE TABLE IF NOT EXISTS artist_verification_requests (
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
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_artist_verified ON users(artist_verified);
CREATE INDEX IF NOT EXISTS idx_artist_verification_requests_user_id ON artist_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_verification_requests_status ON artist_verification_requests(status);

-- 7. Add RLS policies for artist verification requests
ALTER TABLE artist_verification_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own verification requests
CREATE POLICY "Users can view own verification requests" ON artist_verification_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can create their own verification requests
CREATE POLICY "Users can create own verification requests" ON artist_verification_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all verification requests
CREATE POLICY "Admins can view all verification requests" ON artist_verification_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy: Admins can update verification requests
CREATE POLICY "Admins can update verification requests" ON artist_verification_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- 8. Update existing user to artist (for artprison@kakao.com)
UPDATE users 
SET role = 'artist',
    display_name = COALESCE(display_name, 'artprison')
WHERE email = 'artprison@kakao.com';

-- 9. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Create trigger for artist_verification_requests
DROP TRIGGER IF EXISTS update_artist_verification_requests_updated_at ON artist_verification_requests;
CREATE TRIGGER update_artist_verification_requests_updated_at 
    BEFORE UPDATE ON artist_verification_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Grant necessary permissions
GRANT ALL ON artist_verification_requests TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ================================================
-- Migration Complete
-- To apply this migration:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
-- ================================================