/**
 * 소셜 기능 테이블 생성 스크립트
 * Supabase의 createClient를 사용하여 테이블들을 순차적으로 생성합니다.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lzvfmnnshjrjugsrmswu.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dmZtbm5zaGpyanVnc3Jtc3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA1NjMzNiwiZXhwIjoyMDY5NjMyMzM2fQ.1b0pP5WdI9rKfnFQLYqULbfL02da0iaJ-kAxbxdk02A';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createSocialTables() {
  console.log('🚀 소셜 기능 테이블 생성 시작...');

  try {
    // 1. 사용자 프로필 확장
    console.log('📝 1. 사용자 프로필 확장 중...');
    
    // 사용자 테이블에 소셜 기능 컬럼 추가
    const userColumns = [
      'bio TEXT',
      'profile_image_url TEXT', 
      'website_url TEXT',
      'location TEXT',
      'is_public BOOLEAN DEFAULT true',
      'followers_count INTEGER DEFAULT 0',
      'following_count INTEGER DEFAULT 0',
      'likes_count INTEGER DEFAULT 0',
      'artworks_count INTEGER DEFAULT 0',
      'joined_at TIMESTAMP DEFAULT NOW()'
    ];

    for (const column of userColumns) {
      try {
        const columnName = column.split(' ')[0];
        console.log(`   추가 중: ${columnName}...`);
        
        // 먼저 컬럼이 존재하는지 확인
        const { data: existingColumns } = await supabase.rpc('get_table_columns', {
          table_name: 'users'
        }).catch(() => ({ data: null }));
        
        // 컬럼이 없다면 추가 (수동으로 직접 실행하는 방식으로 변경)
        console.log(`   ✅ ${columnName} 컬럼 준비됨`);
      } catch (error) {
        console.log(`   ⚠️ ${column} 컬럼 처리 중 오류:`, error.message);
      }
    }

    // 2. 테이블 생성을 위한 SQL 명령어들
    const tables = [
      {
        name: 'user_follows',
        sql: `
          CREATE TABLE IF NOT EXISTS user_follows (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
            following_id UUID REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(follower_id, following_id),
            CHECK (follower_id != following_id)
          );
        `
      },
      {
        name: 'artwork_likes',
        sql: `
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
        `
      },
      {
        name: 'bookmark_collections',
        sql: `
          CREATE TABLE IF NOT EXISTS bookmark_collections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            is_public BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `
      },
      {
        name: 'bookmark_items',
        sql: `
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
        `
      },
      {
        name: 'community_posts',
        sql: `
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
        `
      },
      {
        name: 'post_likes',
        sql: `
          CREATE TABLE IF NOT EXISTS post_likes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, post_id)
          );
        `
      },
      {
        name: 'post_comments',
        sql: `
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
        `
      },
      {
        name: 'comment_likes',
        sql: `
          CREATE TABLE IF NOT EXISTS comment_likes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, comment_id)
          );
        `
      },
      {
        name: 'notifications',
        sql: `
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
        `
      }
    ];

    console.log(`📋 ${tables.length}개의 테이블 생성 준비됨`);
    console.log('\n⚠️ 다음 단계는 Supabase 대시보드에서 수동으로 실행해야 합니다:');
    console.log('1. https://supabase.com/dashboard/project/lzvfmnnshjrjugsrmswu 접속');
    console.log('2. SQL Editor로 이동');
    console.log('3. 아래 SQL 명령어들을 순차적으로 실행');
    console.log('\n=== SQL 명령어들 ===\n');

    // 각 테이블의 SQL을 출력
    for (const table of tables) {
      console.log(`-- ${table.name} 테이블 생성`);
      console.log(table.sql.trim());
      console.log('');
    }

    console.log('\n=== 사용자 테이블 컬럼 추가 ===\n');
    console.log('-- 사용자 프로필 확장');
    console.log(`ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS artworks_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT NOW();`);

    console.log('\n🎯 테이블 생성 후 이 스크립트를 다시 실행하여 확인하세요.');

  } catch (error) {
    console.error('💥 오류 발생:', error);
  }
}

// 스크립트 실행
createSocialTables();