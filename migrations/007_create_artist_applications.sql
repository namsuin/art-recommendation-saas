-- Create artist_applications table for handling user-to-artist upgrade requests

CREATE TABLE IF NOT EXISTS artist_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  bio TEXT NOT NULL,
  portfolio_url TEXT,
  instagram_url TEXT,
  experience TEXT NOT NULL CHECK (experience IN ('beginner', 'intermediate', 'advanced', 'professional')),
  specialties TEXT[] NOT NULL DEFAULT '{}',
  statement TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_artist_applications_user_id ON artist_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_applications_status ON artist_applications(status);
CREATE INDEX IF NOT EXISTS idx_artist_applications_applied_at ON artist_applications(applied_at);

-- Add Row Level Security (RLS)
ALTER TABLE artist_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own applications
CREATE POLICY "Users can insert their own artist applications" ON artist_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own applications
CREATE POLICY "Users can view their own artist applications" ON artist_applications
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all applications
CREATE POLICY "Admins can view all artist applications" ON artist_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_artist_applications_updated_at 
  BEFORE UPDATE ON artist_applications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add a function to automatically upgrade user role after approval
CREATE OR REPLACE FUNCTION handle_artist_application_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to 'approved', update user role to 'artist'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE user_profiles 
    SET 
      role = 'artist',
      artist_name = NEW.artist_name,
      artist_bio = NEW.bio,
      artist_portfolio_url = NEW.portfolio_url,
      artist_instagram = NEW.instagram_url,
      updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Set reviewed timestamp
    NEW.reviewed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER artist_application_approval_trigger
  BEFORE UPDATE ON artist_applications
  FOR EACH ROW EXECUTE FUNCTION handle_artist_application_approval();