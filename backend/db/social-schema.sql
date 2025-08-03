-- 사용자 갤러리 프로필
CREATE TABLE IF NOT EXISTS user_galleries (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT true,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  artworks_count INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 갤러리 작품
CREATE TABLE IF NOT EXISTS gallery_artworks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  analysis_keywords TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 팔로우 관계
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id)
);

-- 작품 좋아요
CREATE TABLE IF NOT EXISTS artwork_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES gallery_artworks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, artwork_id)
);

-- 갤러리 컬렉션
CREATE TABLE IF NOT EXISTS gallery_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT true,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 컬렉션-작품 연결
CREATE TABLE IF NOT EXISTS collection_artworks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES gallery_collections(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES gallery_artworks(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(collection_id, artwork_id)
);

-- 작품 리뷰
CREATE TABLE IF NOT EXISTS artwork_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES gallery_artworks(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  reported_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, artwork_id)
);

-- 리뷰 도움됨 평가
CREATE TABLE IF NOT EXISTS review_helpful (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES artwork_reviews(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, review_id)
);

-- 리뷰 신고
CREATE TABLE IF NOT EXISTS review_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES artwork_reviews(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, review_id)
);

-- 댓글 시스템
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK(target_type IN ('artwork', 'collection', 'review')),
  target_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 댓글 좋아요
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, comment_id)
);

-- 인덱스 생성
CREATE INDEX idx_user_galleries_public ON user_galleries(is_public, total_likes DESC, artworks_count DESC);
CREATE INDEX idx_gallery_artworks_user_public ON gallery_artworks(user_id, is_public, created_at DESC);
CREATE INDEX idx_gallery_artworks_public_trending ON gallery_artworks(is_public, likes_count DESC, views_count DESC, created_at DESC);
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id, created_at DESC);
CREATE INDEX idx_user_follows_following ON user_follows(following_id, created_at DESC);
CREATE INDEX idx_artwork_likes_artwork ON artwork_likes(artwork_id);
CREATE INDEX idx_artwork_likes_user ON artwork_likes(user_id, created_at DESC);
CREATE INDEX idx_artwork_reviews_artwork ON artwork_reviews(artwork_id, created_at DESC);
CREATE INDEX idx_artwork_reviews_user ON artwork_reviews(user_id, created_at DESC);
CREATE INDEX idx_artwork_reviews_rating ON artwork_reviews(artwork_id, rating);
CREATE INDEX idx_comments_target ON comments(target_type, target_id, created_at DESC);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id, created_at DESC);

-- 함수들
-- 작품 좋아요 수 증가
CREATE OR REPLACE FUNCTION increment_artwork_likes(artwork_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE gallery_artworks 
  SET likes_count = likes_count + 1 
  WHERE id = artwork_id;
END;
$$ LANGUAGE plpgsql;

-- 작품 좋아요 수 감소
CREATE OR REPLACE FUNCTION decrement_artwork_likes(artwork_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE gallery_artworks 
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = artwork_id;
END;
$$ LANGUAGE plpgsql;

-- 작품 조회수 증가
CREATE OR REPLACE FUNCTION increment_artwork_views(artwork_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE gallery_artworks 
  SET views_count = views_count + 1 
  WHERE id = artwork_id;
END;
$$ LANGUAGE plpgsql;

-- 팔로워 수 업데이트
CREATE OR REPLACE FUNCTION update_follower_count(user_id UUID, increment_value INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE user_galleries 
  SET followers_count = GREATEST(followers_count + increment_value, 0)
  WHERE user_id = user_id;
END;
$$ LANGUAGE plpgsql;

-- 팔로잉 수 업데이트
CREATE OR REPLACE FUNCTION update_following_count(user_id UUID, increment_value INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE user_galleries 
  SET following_count = GREATEST(following_count + increment_value, 0)
  WHERE user_id = user_id;
END;
$$ LANGUAGE plpgsql;

-- 리뷰 신고 수 증가
CREATE OR REPLACE FUNCTION increment_review_reports(review_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE artwork_reviews 
  SET reported_count = reported_count + 1 
  WHERE id = review_id;
END;
$$ LANGUAGE plpgsql;

-- 댓글 좋아요 수 업데이트 트리거
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comment_likes_count
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- 댓글 답글 수 업데이트 트리거
CREATE OR REPLACE FUNCTION update_comment_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
    UPDATE comments SET replies_count = replies_count + 1 WHERE id = NEW.parent_comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
    UPDATE comments SET replies_count = GREATEST(replies_count - 1, 0) WHERE id = OLD.parent_comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comment_replies_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_replies_count();

-- RLS 정책 설정
ALTER TABLE user_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- 갤러리 정책
CREATE POLICY "Public galleries are viewable by everyone" ON user_galleries
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own gallery" ON user_galleries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own gallery" ON user_galleries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gallery" ON user_galleries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 작품 정책
CREATE POLICY "Public artworks are viewable by everyone" ON gallery_artworks
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own artworks" ON gallery_artworks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own artworks" ON gallery_artworks
  FOR ALL USING (auth.uid() = user_id);

-- 팔로우 정책
CREATE POLICY "Users can view all follows" ON user_follows
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own follows" ON user_follows
  FOR ALL USING (auth.uid() = follower_id);

-- 좋아요 정책
CREATE POLICY "Users can view all artwork likes" ON artwork_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own artwork likes" ON artwork_likes
  FOR ALL USING (auth.uid() = user_id);

-- 리뷰 정책
CREATE POLICY "Everyone can view reviews" ON artwork_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own reviews" ON artwork_reviews
  FOR ALL USING (auth.uid() = user_id);

-- 댓글 정책
CREATE POLICY "Everyone can view comments" ON comments
  FOR SELECT USING (NOT is_deleted);

CREATE POLICY "Users can manage own comments" ON comments
  FOR ALL USING (auth.uid() = user_id);

-- 댓글 좋아요 정책
CREATE POLICY "Users can view comment likes" ON comment_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own comment likes" ON comment_likes
  FOR ALL USING (auth.uid() = user_id);