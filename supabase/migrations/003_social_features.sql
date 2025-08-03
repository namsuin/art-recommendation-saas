-- Week 6: 소셜 기능을 위한 데이터베이스 스키마
-- 생성일: 2025-08-02

-- 1. 사용자 프로필 확장
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS artworks_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT NOW();

-- 2. 팔로우 관계 테이블
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- 3. 작품 좋아요 테이블
CREATE TABLE IF NOT EXISTS artwork_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    artwork_id UUID,
    artwork_title TEXT,
    artwork_artist TEXT,
    artwork_image_url TEXT,
    source_platform TEXT DEFAULT 'local', -- 'local', 'met', 'artsy', 'behance'
    external_artwork_id TEXT, -- 외부 플랫폼의 작품 ID
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, artwork_id, source_platform)
);

-- 4. 북마크 컬렉션
CREATE TABLE IF NOT EXISTS bookmark_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. 북마크 아이템
CREATE TABLE IF NOT EXISTS bookmark_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES bookmark_collections(id) ON DELETE CASCADE,
    artwork_id UUID,
    artwork_title TEXT,
    artwork_artist TEXT,
    artwork_image_url TEXT,
    source_platform TEXT DEFAULT 'local',
    external_artwork_id TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. 커뮤니티 포스트
CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    artwork_id UUID,
    source_platform TEXT,
    external_artwork_id TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. 포스트 좋아요
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- 8. 댓글 시스템
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. 댓글 좋아요
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, comment_id)
);

-- 10. 알림 시스템
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'follow', 'like', 'comment', 'mention'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- 추가 데이터 (포스트 ID, 사용자 ID 등)
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_artwork_likes_user ON artwork_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_artwork_likes_artwork ON artwork_likes(artwork_id, source_platform);
CREATE INDEX IF NOT EXISTS idx_bookmark_items_collection ON bookmark_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- 12. RLS (Row Level Security) 정책
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 팔로우 관계 정책
CREATE POLICY "Users can view all follows" ON user_follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follows" ON user_follows FOR ALL USING (auth.uid() = follower_id);

-- 좋아요 정책
CREATE POLICY "Users can view all likes" ON artwork_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own likes" ON artwork_likes FOR ALL USING (auth.uid() = user_id);

-- 북마크 정책
CREATE POLICY "Users can view public collections" ON bookmark_collections FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage their own collections" ON bookmark_collections FOR ALL USING (auth.uid() = user_id);

-- 북마크 아이템 정책
CREATE POLICY "Users can view public collection items" ON bookmark_items FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM bookmark_collections bc 
        WHERE bc.id = bookmark_items.collection_id 
        AND (bc.is_public = true OR bc.user_id = auth.uid())
    )
);
CREATE POLICY "Users can manage their own bookmark items" ON bookmark_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM bookmark_collections bc 
        WHERE bc.id = bookmark_items.collection_id 
        AND bc.user_id = auth.uid()
    )
);

-- 커뮤니티 포스트 정책
CREATE POLICY "Users can view all posts" ON community_posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON community_posts FOR DELETE USING (auth.uid() = user_id);

-- 포스트 좋아요 정책
CREATE POLICY "Users can view all post likes" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own post likes" ON post_likes FOR ALL USING (auth.uid() = user_id);

-- 댓글 정책
CREATE POLICY "Users can view all comments" ON post_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON post_comments FOR DELETE USING (auth.uid() = user_id);

-- 댓글 좋아요 정책
CREATE POLICY "Users can view all comment likes" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own comment likes" ON comment_likes FOR ALL USING (auth.uid() = user_id);

-- 알림 정책
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- 13. 트리거 함수들 (카운터 업데이트)
CREATE OR REPLACE FUNCTION update_user_followers_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
        UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
        UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE post_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE post_comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 14. 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_user_followers_count ON user_follows;
CREATE TRIGGER trigger_update_user_followers_count
    AFTER INSERT OR DELETE ON user_follows
    FOR EACH ROW EXECUTE FUNCTION update_user_followers_count();

DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON post_likes;
CREATE TRIGGER trigger_update_post_likes_count
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

DROP TRIGGER IF EXISTS trigger_update_post_comments_count ON post_comments;
CREATE TRIGGER trigger_update_post_comments_count
    AFTER INSERT OR DELETE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes;
CREATE TRIGGER trigger_update_comment_likes_count
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- 15. 기본 북마크 컬렉션 생성 함수
CREATE OR REPLACE FUNCTION create_default_bookmark_collection()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO bookmark_collections (user_id, name, description, is_public)
    VALUES (NEW.id, '즐겨찾기', '기본 북마크 컬렉션', false);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 사용자 생성 시 기본 북마크 컬렉션 자동 생성
DROP TRIGGER IF EXISTS trigger_create_default_bookmark_collection ON users;
CREATE TRIGGER trigger_create_default_bookmark_collection
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_default_bookmark_collection();

-- 16. 전체 텍스트 검색을 위한 함수 (PostgreSQL 검색 오류 해결)
CREATE OR REPLACE FUNCTION search_artworks_by_keywords(
    search_keywords TEXT[],
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    artist TEXT,
    image_url TEXT,
    similarity_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.artist,
        a.image_url,
        GREATEST(
            -- 제목 매칭
            CASE 
                WHEN a.title ILIKE ANY(ARRAY['%' || unnest(search_keywords) || '%']) THEN 0.8
                ELSE 0.0
            END,
            -- 작가 매칭
            CASE 
                WHEN a.artist ILIKE ANY(ARRAY['%' || unnest(search_keywords) || '%']) THEN 0.7
                ELSE 0.0
            END,
            -- 키워드 매칭 (기존 keywords 배열이 있다면)
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM unnest(search_keywords) AS sk
                    WHERE a.keywords @> ARRAY[sk] OR ARRAY[sk] && a.keywords
                ) THEN 0.9
                ELSE 0.0
            END
        ) AS similarity_score
    FROM artworks a
    WHERE (
        a.title ILIKE ANY(ARRAY['%' || unnest(search_keywords) || '%']) OR
        a.artist ILIKE ANY(ARRAY['%' || unnest(search_keywords) || '%']) OR
        (a.keywords IS NOT NULL AND a.keywords && search_keywords)
    )
    ORDER BY similarity_score DESC, a.created_at DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;