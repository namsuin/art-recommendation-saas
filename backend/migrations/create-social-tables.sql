-- 작품 공유 테이블
CREATE TABLE IF NOT EXISTS artwork_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artwork_id VARCHAR NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  privacy_level VARCHAR(20) DEFAULT 'public' CHECK (privacy_level IN ('public', 'followers', 'private')),
  share_type VARCHAR(20) DEFAULT 'discovery' CHECK (share_type IN ('discovery', 'collection', 'review')),
  metadata JSONB DEFAULT '{}',
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 작품 리뷰 테이블
CREATE TABLE IF NOT EXISTS artwork_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artwork_id VARCHAR NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  pros TEXT[] DEFAULT '{}',
  cons TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  helpful_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  verified_purchase BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, artwork_id) -- 사용자당 작품별 하나의 리뷰만
);

-- 사용자 팔로우 관계 테이블
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id) -- 자기 자신 팔로우 방지
);

-- 소셜 상호작용 테이블 (좋아요, 북마크, 공유 등)
CREATE TABLE IF NOT EXISTS social_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('share', 'review', 'user', 'comment')),
  target_id VARCHAR NOT NULL,
  interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('like', 'bookmark', 'share', 'report')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id, interaction_type) -- 동일 상호작용 중복 방지
);

-- 댓글 테이블
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('share', 'review')),
  target_id VARCHAR NOT NULL,
  content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 500),
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  mentions TEXT[] DEFAULT '{}', -- @username mentions
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 갤러리/컬렉션 테이블
CREATE TABLE IF NOT EXISTS user_galleries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url VARCHAR(500),
  is_public BOOLEAN DEFAULT TRUE,
  artwork_ids TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 해시태그 테이블
CREATE TABLE IF NOT EXISTS hashtags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tag VARCHAR(100) UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 해시태그-콘텐츠 관계 테이블
CREATE TABLE IF NOT EXISTS content_hashtags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hashtag_id UUID REFERENCES hashtags(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('share', 'review', 'gallery')),
  content_id VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(hashtag_id, content_type, content_id)
);

-- 사용자 관심사 테이블
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_type VARCHAR(50) NOT NULL, -- 'style', 'artist', 'color', 'theme' 등
  interest_value VARCHAR(255) NOT NULL,
  score FLOAT DEFAULT 1.0, -- 관심도 점수
  source VARCHAR(50) DEFAULT 'implicit', -- 'explicit', 'implicit', 'imported'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, interest_type, interest_value)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_artwork_shares_user_id ON artwork_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_artwork_shares_artwork_id ON artwork_shares(artwork_id);
CREATE INDEX IF NOT EXISTS idx_artwork_shares_privacy ON artwork_shares(privacy_level);
CREATE INDEX IF NOT EXISTS idx_artwork_shares_created_at ON artwork_shares(created_at);
CREATE INDEX IF NOT EXISTS idx_artwork_shares_tags ON artwork_shares USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_artwork_shares_like_count ON artwork_shares(like_count);

CREATE INDEX IF NOT EXISTS idx_artwork_reviews_user_id ON artwork_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_artwork_reviews_artwork_id ON artwork_reviews(artwork_id);
CREATE INDEX IF NOT EXISTS idx_artwork_reviews_rating ON artwork_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_artwork_reviews_created_at ON artwork_reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_artwork_reviews_helpful_count ON artwork_reviews(helpful_count);
CREATE INDEX IF NOT EXISTS idx_artwork_reviews_verified ON artwork_reviews(verified_purchase);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON user_follows(created_at);

CREATE INDEX IF NOT EXISTS idx_social_interactions_user_id ON social_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_target ON social_interactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_type ON social_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_social_interactions_created_at ON social_interactions(created_at);

CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_mentions ON comments USING GIN(mentions);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_user_galleries_user_id ON user_galleries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_galleries_public ON user_galleries(is_public);
CREATE INDEX IF NOT EXISTS idx_user_galleries_created_at ON user_galleries(created_at);
CREATE INDEX IF NOT EXISTS idx_user_galleries_view_count ON user_galleries(view_count);

CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_usage ON hashtags(usage_count);

CREATE INDEX IF NOT EXISTS idx_content_hashtags_hashtag ON content_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_content_hashtags_content ON content_hashtags(content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_type ON user_interests(interest_type);
CREATE INDEX IF NOT EXISTS idx_user_interests_score ON user_interests(score);

-- RLS 정책 설정
ALTER TABLE artwork_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

-- 공유 정책
CREATE POLICY "Users can manage their own shares" ON artwork_shares
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public shares are viewable by all" ON artwork_shares
  FOR SELECT USING (privacy_level = 'public');

CREATE POLICY "Followers can view followers-only shares" ON artwork_shares
  FOR SELECT USING (
    privacy_level = 'followers' AND
    EXISTS (
      SELECT 1 FROM user_follows 
      WHERE follower_id = auth.uid() AND following_id = user_id
    )
  );

-- 리뷰 정책
CREATE POLICY "Users can manage their own reviews" ON artwork_reviews
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "All reviews are publicly viewable" ON artwork_reviews
  FOR SELECT USING (true);

-- 팔로우 정책
CREATE POLICY "Users can manage their follows" ON user_follows
  FOR ALL USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- 상호작용 정책
CREATE POLICY "Users can manage their own interactions" ON social_interactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Interactions are viewable for counting" ON social_interactions
  FOR SELECT USING (true);

-- 댓글 정책
CREATE POLICY "Users can manage their own comments" ON comments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Comments are publicly viewable" ON comments
  FOR SELECT USING (true);

-- 알림 정책
CREATE POLICY "Users can only access their own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- 갤러리 정책
CREATE POLICY "Users can manage their own galleries" ON user_galleries
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public galleries are viewable by all" ON user_galleries
  FOR SELECT USING (is_public = true);

-- 해시태그 정책
CREATE POLICY "Hashtags are publicly readable" ON hashtags
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create hashtags" ON hashtags
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 콘텐츠-해시태그 정책
CREATE POLICY "Content hashtags are publicly readable" ON content_hashtags
  FOR SELECT USING (true);

CREATE POLICY "Users can manage hashtags for their content" ON content_hashtags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM artwork_shares 
      WHERE id::text = content_id AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM artwork_reviews 
      WHERE id::text = content_id AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_galleries 
      WHERE id::text = content_id AND user_id = auth.uid()
    )
  );

-- 관심사 정책
CREATE POLICY "Users can manage their own interests" ON user_interests
  FOR ALL USING (auth.uid() = user_id);

-- 트리거 함수들
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 업데이트 시간 자동 갱신 트리거
CREATE TRIGGER update_artwork_shares_updated_at
  BEFORE UPDATE ON artwork_shares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artwork_reviews_updated_at
  BEFORE UPDATE ON artwork_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_galleries_updated_at
  BEFORE UPDATE ON user_galleries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_interests_updated_at
  BEFORE UPDATE ON user_interests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 상호작용 카운트 업데이트 함수
CREATE OR REPLACE FUNCTION update_interaction_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 카운트 증가
    CASE NEW.target_type
      WHEN 'share' THEN
        CASE NEW.interaction_type
          WHEN 'like' THEN
            UPDATE artwork_shares SET like_count = like_count + 1 WHERE id::text = NEW.target_id;
          WHEN 'bookmark' THEN
            UPDATE artwork_shares SET bookmark_count = bookmark_count + 1 WHERE id::text = NEW.target_id;
          WHEN 'share' THEN
            UPDATE artwork_shares SET share_count = share_count + 1 WHERE id::text = NEW.target_id;
        END CASE;
      WHEN 'review' THEN
        CASE NEW.interaction_type
          WHEN 'like' THEN
            UPDATE artwork_reviews SET like_count = like_count + 1 WHERE id::text = NEW.target_id;
        END CASE;
      WHEN 'comment' THEN
        CASE NEW.interaction_type
          WHEN 'like' THEN
            UPDATE comments SET like_count = like_count + 1 WHERE id::text = NEW.target_id;
        END CASE;
    END CASE;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- 카운트 감소
    CASE OLD.target_type
      WHEN 'share' THEN
        CASE OLD.interaction_type
          WHEN 'like' THEN
            UPDATE artwork_shares SET like_count = GREATEST(like_count - 1, 0) WHERE id::text = OLD.target_id;
          WHEN 'bookmark' THEN
            UPDATE artwork_shares SET bookmark_count = GREATEST(bookmark_count - 1, 0) WHERE id::text = OLD.target_id;
          WHEN 'share' THEN
            UPDATE artwork_shares SET share_count = GREATEST(share_count - 1, 0) WHERE id::text = OLD.target_id;
        END CASE;
      WHEN 'review' THEN
        CASE OLD.interaction_type
          WHEN 'like' THEN
            UPDATE artwork_reviews SET like_count = GREATEST(like_count - 1, 0) WHERE id::text = OLD.target_id;
        END CASE;
      WHEN 'comment' THEN
        CASE OLD.interaction_type
          WHEN 'like' THEN
            UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id::text = OLD.target_id;
        END CASE;
    END CASE;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 상호작용 카운트 트리거
CREATE TRIGGER social_interactions_count_trigger
  AFTER INSERT OR DELETE ON social_interactions
  FOR EACH ROW EXECUTE FUNCTION update_interaction_counts();

-- 댓글 카운트 업데이트 함수
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 댓글 수 증가
    CASE NEW.target_type
      WHEN 'share' THEN
        UPDATE artwork_shares SET comment_count = comment_count + 1 WHERE id::text = NEW.target_id;
      WHEN 'review' THEN
        UPDATE artwork_reviews SET comment_count = comment_count + 1 WHERE id::text = NEW.target_id;
    END CASE;
    
    -- 대댓글인 경우 부모 댓글의 답글 수 증가
    IF NEW.parent_comment_id IS NOT NULL THEN
      UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- 댓글 수 감소
    CASE OLD.target_type
      WHEN 'share' THEN
        UPDATE artwork_shares SET comment_count = GREATEST(comment_count - 1, 0) WHERE id::text = OLD.target_id;
      WHEN 'review' THEN
        UPDATE artwork_reviews SET comment_count = GREATEST(comment_count - 1, 0) WHERE id::text = OLD.target_id;
    END CASE;
    
    -- 대댓글인 경우 부모 댓글의 답글 수 감소
    IF OLD.parent_comment_id IS NOT NULL THEN
      UPDATE comments SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.parent_comment_id;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 댓글 카운트 트리거
CREATE TRIGGER comments_count_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_counts();

-- 해시태그 사용량 업데이트 함수
CREATE OR REPLACE FUNCTION update_hashtag_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hashtags SET usage_count = usage_count + 1 WHERE id = NEW.hashtag_id;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE hashtags SET usage_count = GREATEST(usage_count - 1, 0) WHERE id = OLD.hashtag_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 해시태그 사용량 트리거
CREATE TRIGGER hashtag_usage_trigger
  AFTER INSERT OR DELETE ON content_hashtags
  FOR EACH ROW EXECUTE FUNCTION update_hashtag_usage();

-- 뷰 생성
CREATE OR REPLACE VIEW user_social_stats AS
SELECT 
  u.id as user_id,
  u.display_name,
  u.avatar_url,
  COALESCE(followers.count, 0) as followers_count,
  COALESCE(following.count, 0) as following_count,
  COALESCE(shares.count, 0) as shares_count,
  COALESCE(reviews.count, 0) as reviews_count,
  COALESCE(total_likes.count, 0) as total_likes_received,
  u.created_at as joined_at
FROM auth.users u
LEFT JOIN (
  SELECT following_id, COUNT(*) as count
  FROM user_follows
  GROUP BY following_id
) followers ON u.id = followers.following_id
LEFT JOIN (
  SELECT follower_id, COUNT(*) as count
  FROM user_follows
  GROUP BY follower_id
) following ON u.id = following.follower_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as count
  FROM artwork_shares
  GROUP BY user_id
) shares ON u.id = shares.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as count
  FROM artwork_reviews
  GROUP BY user_id
) reviews ON u.id = reviews.user_id
LEFT JOIN (
  SELECT 
    COALESCE(share_likes.user_id, review_likes.user_id) as user_id,
    COALESCE(share_likes.count, 0) + COALESCE(review_likes.count, 0) as count
  FROM (
    SELECT s.user_id, COUNT(si.id) as count
    FROM artwork_shares s
    LEFT JOIN social_interactions si ON si.target_id = s.id::text AND si.target_type = 'share' AND si.interaction_type = 'like'
    GROUP BY s.user_id
  ) share_likes
  FULL OUTER JOIN (
    SELECT r.user_id, COUNT(si.id) as count
    FROM artwork_reviews r
    LEFT JOIN social_interactions si ON si.target_id = r.id::text AND si.target_type = 'review' AND si.interaction_type = 'like'
    GROUP BY r.user_id
  ) review_likes ON share_likes.user_id = review_likes.user_id
) total_likes ON u.id = total_likes.user_id;

-- 트렌딩 콘텐츠 뷰
CREATE OR REPLACE VIEW trending_content AS
SELECT 
  'share' as content_type,
  s.id,
  s.title,
  s.user_id,
  u.display_name as user_name,
  u.avatar_url as user_avatar,
  s.like_count,
  s.comment_count,
  s.share_count,
  s.created_at,
  (s.like_count * 3 + s.comment_count * 2 + s.share_count * 4) as trending_score
FROM artwork_shares s
JOIN auth.users u ON s.user_id = u.id
WHERE s.privacy_level = 'public'
  AND s.created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
  'review' as content_type,
  r.id,
  r.title,
  r.user_id,
  u.display_name as user_name,
  u.avatar_url as user_avatar,
  r.like_count,
  r.comment_count,
  0 as share_count,
  r.created_at,
  (r.like_count * 2 + r.comment_count * 3 + r.helpful_count * 4) as trending_score
FROM artwork_reviews r
JOIN auth.users u ON r.user_id = u.id
WHERE r.created_at > NOW() - INTERVAL '7 days'
ORDER BY trending_score DESC;

COMMENT ON TABLE artwork_shares IS '사용자가 공유한 작품들 (발견, 컬렉션, 리뷰 타입)';
COMMENT ON TABLE artwork_reviews IS '작품에 대한 사용자 리뷰 (평점, 장단점 포함)';
COMMENT ON TABLE user_follows IS '사용자 간 팔로우 관계';
COMMENT ON TABLE social_interactions IS '소셜 상호작용 (좋아요, 북마크, 공유 등)';
COMMENT ON TABLE comments IS '공유글과 리뷰에 대한 댓글 시스템';
COMMENT ON TABLE notifications IS '사용자 알림 (팔로우, 좋아요, 멘션 등)';
COMMENT ON TABLE user_galleries IS '사용자 갤러리/컬렉션';
COMMENT ON TABLE hashtags IS '해시태그 마스터 테이블';
COMMENT ON TABLE content_hashtags IS '콘텐츠와 해시태그 연결 테이블';
COMMENT ON TABLE user_interests IS '사용자 관심사 프로파일링';