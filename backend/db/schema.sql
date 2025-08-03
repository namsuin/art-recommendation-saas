-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('free', 'premium');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'incomplete');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_tier subscription_tier DEFAULT 'free',
    upload_count_today INTEGER DEFAULT 0,
    last_upload_reset DATE DEFAULT CURRENT_DATE
);

-- Artworks table with vector embeddings
CREATE TABLE artworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    description TEXT,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    embeddings VECTOR(512), -- CLIP embeddings dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    price DECIMAL(10,2),
    available BOOLEAN DEFAULT true,
    admin_user_id UUID REFERENCES users(id)
);

-- Taste groups for user preferences
CREATE TABLE taste_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    embeddings VECTOR(512), -- Aggregated embeddings from user uploads
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_default BOOLEAN DEFAULT false,
    
    CONSTRAINT unique_default_per_user UNIQUE (user_id, is_default) WHERE is_default = true
);

-- User image uploads
CREATE TABLE user_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    analysis_keywords TEXT[] NOT NULL DEFAULT '{}',
    analysis_embeddings VECTOR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    taste_group_id UUID REFERENCES taste_groups(id)
);

-- Generated recommendations
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    upload_id UUID NOT NULL REFERENCES user_uploads(id) ON DELETE CASCADE,
    artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    similarity_score DECIMAL(5,4) NOT NULL, -- 0.0000 to 1.0000
    reasoning TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    clicked BOOLEAN DEFAULT false,
    clicked_at TIMESTAMP WITH TIME ZONE
);

-- Subscription management
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    status subscription_status NOT NULL DEFAULT 'active',
    tier subscription_tier NOT NULL DEFAULT 'free',
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage analytics for monitoring and billing
CREATE TABLE usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    images_analyzed INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    storage_used BIGINT DEFAULT 0, -- bytes
    recommendations_generated INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- Indexes for performance
CREATE INDEX idx_artworks_embeddings ON artworks USING ivfflat (embeddings vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_user_uploads_embeddings ON user_uploads USING ivfflat (analysis_embeddings vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_taste_groups_embeddings ON taste_groups USING ivfflat (embeddings vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_artworks_keywords ON artworks USING GIN (keywords);
CREATE INDEX idx_artworks_available ON artworks (available);
CREATE INDEX idx_artworks_created_at ON artworks (created_at DESC);

CREATE INDEX idx_user_uploads_user_id ON user_uploads (user_id);
CREATE INDEX idx_user_uploads_created_at ON user_uploads (created_at DESC);

CREATE INDEX idx_recommendations_user_id ON recommendations (user_id);
CREATE INDEX idx_recommendations_similarity ON recommendations (similarity_score DESC);
CREATE INDEX idx_recommendations_created_at ON recommendations (created_at DESC);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_subscription_tier ON users (subscription_tier);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION vector_similarity_search(
    query_embedding VECTOR(512),
    similarity_threshold FLOAT DEFAULT 0.5,
    match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
    SELECT 
        artworks.id,
        1 - (artworks.embeddings <=> query_embedding) AS similarity
    FROM artworks
    WHERE 
        artworks.embeddings IS NOT NULL 
        AND artworks.available = true
        AND (1 - (artworks.embeddings <=> query_embedding)) >= similarity_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_artworks_updated_at BEFORE UPDATE ON artworks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_taste_groups_updated_at BEFORE UPDATE ON taste_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE taste_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own taste groups" ON taste_groups FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own uploads" ON user_uploads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own recommendations" ON recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own recommendation clicks" ON recommendations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own analytics" ON usage_analytics FOR SELECT USING (auth.uid() = user_id);

-- Artworks are publicly readable
CREATE POLICY "Artworks are publicly readable" ON artworks FOR SELECT TO anon, authenticated USING (available = true);

-- Storage bucket for artwork images
INSERT INTO storage.buckets (id, name, public) VALUES ('artwork-images', 'artwork-images', true);

-- Purchase requests table
CREATE TABLE purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    delivery_address TEXT,
    message TEXT,
    urgency TEXT CHECK (urgency IN ('low', 'medium', 'high')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('pending', 'processing', 'contacted', 'completed', 'cancelled')) DEFAULT 'pending',
    estimated_price DECIMAL(10,2),
    final_price DECIMAL(10,2),
    admin_note TEXT,
    cancellation_reason TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase request status history for tracking changes
CREATE TABLE purchase_request_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES users(id),
    admin_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for purchase requests
CREATE INDEX idx_purchase_requests_user_id ON purchase_requests (user_id);
CREATE INDEX idx_purchase_requests_artwork_id ON purchase_requests (artwork_id);
CREATE INDEX idx_purchase_requests_status ON purchase_requests (status);
CREATE INDEX idx_purchase_requests_created_at ON purchase_requests (created_at DESC);
CREATE INDEX idx_purchase_requests_urgency ON purchase_requests (urgency);

-- Apply updated_at triggers
CREATE TRIGGER update_purchase_requests_updated_at BEFORE UPDATE ON purchase_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies for purchase requests
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_request_status_history ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own purchase requests
CREATE POLICY "Users can view own purchase requests" ON purchase_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create purchase requests" ON purchase_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own purchase requests" ON purchase_requests FOR UPDATE USING (auth.uid() = user_id);

-- Users can view their own status history
CREATE POLICY "Users can view own purchase status history" ON purchase_request_status_history FOR SELECT 
USING (purchase_request_id IN (SELECT id FROM purchase_requests WHERE user_id = auth.uid()));

-- Storage policies
CREATE POLICY "Anyone can view artwork images" ON storage.objects FOR SELECT USING (bucket_id = 'artwork-images');
CREATE POLICY "Authenticated users can upload images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'artwork-images');
CREATE POLICY "Users can delete own uploads" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'artwork-images' AND auth.uid()::text = (storage.foldername(name))[1]);