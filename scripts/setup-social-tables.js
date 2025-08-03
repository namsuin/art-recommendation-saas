// 소셜 기능 테이블 생성 스크립트
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://lzvfmnnshjrjugsrmswu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dmZtbm5zaGpyanVnc3Jtc3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjQyNzkyNSwiZXhwIjoyMDUyMDAzOTI1fQ.qQa2BIuZm0d5l5sHzNY-hQ-P8-KgCzGaI-bJCNMKxAs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSocialTables() {
  console.log('🚀 소셜 기능 테이블 생성 시작...');

  try {
    // 1. 사용자 프로필 확장
    const profileExtension = `
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
    `;

    console.log('📝 사용자 프로필 확장 중...');
    const { error: profileError } = await supabase.rpc('exec_sql', { sql: profileExtension });
    if (profileError) console.log('프로필 확장 오류:', profileError);

    // 2. 커뮤니티 포스트 테이블
    const communityPostsTable = `
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
    `;

    console.log('📋 커뮤니티 포스트 테이블 생성 중...');
    const { error: postsError } = await supabase.rpc('exec_sql', { sql: communityPostsTable });
    if (postsError) console.log('포스트 테이블 오류:', postsError);

    // 3. 팔로우 관계 테이블
    const followsTable = `
      CREATE TABLE IF NOT EXISTS user_follows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
          following_id UUID REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(follower_id, following_id),
          CHECK (follower_id != following_id)
      );
    `;

    console.log('👥 팔로우 테이블 생성 중...');
    const { error: followsError } = await supabase.rpc('exec_sql', { sql: followsTable });
    if (followsError) console.log('팔로우 테이블 오류:', followsError);

    // 4. 알림 테이블
    const notificationsTable = `
      CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          data JSONB,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    console.log('🔔 알림 테이블 생성 중...');
    const { error: notificationError } = await supabase.rpc('exec_sql', { sql: notificationsTable });
    if (notificationError) console.log('알림 테이블 오류:', notificationError);

    // 5. 작품 좋아요 테이블
    const artworkLikesTable = `
      CREATE TABLE IF NOT EXISTS artwork_likes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          artwork_id UUID,
          artwork_title TEXT,
          artwork_artist TEXT,
          artwork_image_url TEXT,
          source_platform TEXT DEFAULT 'local',
          external_artwork_id TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, artwork_id, source_platform)
      );
    `;

    console.log('❤️  작품 좋아요 테이블 생성 중...');
    const { error: likesError } = await supabase.rpc('exec_sql', { sql: artworkLikesTable });
    if (likesError) console.log('좋아요 테이블 오류:', likesError);

    // 6. RLS 활성화
    const rlsSetup = `
      ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
      ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
      ALTER TABLE artwork_likes ENABLE ROW LEVEL SECURITY;
    `;

    console.log('🔒 보안 정책 설정 중...');
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: rlsSetup });
    if (rlsError) console.log('RLS 설정 오류:', rlsError);

    // 7. 정책 생성
    const policies = `
      CREATE POLICY IF NOT EXISTS "Users can view all posts" ON community_posts FOR SELECT USING (true);
      CREATE POLICY IF NOT EXISTS "Users can create posts" ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY IF NOT EXISTS "Users can update their own posts" ON community_posts FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY IF NOT EXISTS "Users can delete their own posts" ON community_posts FOR DELETE USING (auth.uid() = user_id);
      
      CREATE POLICY IF NOT EXISTS "Users can view all follows" ON user_follows FOR SELECT USING (true);
      CREATE POLICY IF NOT EXISTS "Users can manage their own follows" ON user_follows FOR ALL USING (auth.uid() = follower_id);
      
      CREATE POLICY IF NOT EXISTS "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY IF NOT EXISTS "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
      
      CREATE POLICY IF NOT EXISTS "Users can view all likes" ON artwork_likes FOR SELECT USING (true);
      CREATE POLICY IF NOT EXISTS "Users can manage their own likes" ON artwork_likes FOR ALL USING (auth.uid() = user_id);
    `;

    console.log('📋 보안 정책 생성 중...');
    const { error: policiesError } = await supabase.rpc('exec_sql', { sql: policies });
    if (policiesError) console.log('정책 생성 오류:', policiesError);

    console.log('✅ 소셜 기능 테이블 설정 완료!');

    // 테이블 생성 확인
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['community_posts', 'user_follows', 'notifications', 'artwork_likes']);

    if (tablesError) {
      console.error('테이블 확인 오류:', tablesError);
    } else {
      console.log('생성된 테이블:', tables);
    }

  } catch (error) {
    console.error('❌ 테이블 생성 실패:', error);
  }
}

// 스크립트 실행
createSocialTables();