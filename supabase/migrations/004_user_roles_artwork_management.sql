-- 사용자 역할 타입 생성
CREATE TYPE user_role AS ENUM ('user', 'artist', 'admin');

-- 사용자 프로필 테이블 수정 (역할 추가)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user',
ADD COLUMN IF NOT EXISTS artist_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS artist_bio TEXT,
ADD COLUMN IF NOT EXISTS artist_portfolio_url TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 작품 상태 타입 생성
CREATE TYPE artwork_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'archived');

-- 작품 테이블 생성 (예술가와 관리자가 등록하는 작품)
CREATE TABLE IF NOT EXISTS registered_artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 기본 정보
  title VARCHAR(500) NOT NULL,
  artist_name VARCHAR(255) NOT NULL,
  artist_id UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  year_created INTEGER,
  
  -- 이미지 정보
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- 작품 분류
  category VARCHAR(100), -- 회화, 조각, 사진, 디지털아트 등
  medium VARCHAR(255), -- 유화, 수채화, 청동, 대리석 등
  style VARCHAR(255), -- 인상주의, 현대미술, 추상화 등
  
  -- 크기 정보
  width_cm NUMERIC,
  height_cm NUMERIC,
  depth_cm NUMERIC,
  
  -- 가격 정보 (선택사항)
  price_krw NUMERIC,
  is_for_sale BOOLEAN DEFAULT FALSE,
  is_sold BOOLEAN DEFAULT FALSE,
  
  -- 키워드와 태그
  keywords TEXT[], -- AI 분석용 키워드
  tags TEXT[], -- 사용자 정의 태그
  
  -- 상태 관리
  status artwork_status DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  
  -- 메타데이터
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- AI 분석 데이터 (자동 생성)
  ai_analysis JSONB,
  embedding vector(1536), -- 벡터 임베딩 for 유사도 검색
  
  -- 검색 최적화
  search_vector tsvector
);

-- 작품 좋아요 테이블
CREATE TABLE IF NOT EXISTS artwork_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID NOT NULL REFERENCES registered_artworks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(artwork_id, user_id)
);

-- 작품 조회 기록 테이블
CREATE TABLE IF NOT EXISTS artwork_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID NOT NULL REFERENCES registered_artworks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET
);

-- 예술가 인증 요청 테이블
CREATE TABLE IF NOT EXISTS artist_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 인증 정보
  real_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  email VARCHAR(255),
  
  -- 포트폴리오
  portfolio_url TEXT,
  instagram_url TEXT,
  website_url TEXT,
  
  -- 증명 서류
  certification_documents JSONB, -- 학위증, 전시 이력 등
  artist_statement TEXT,
  
  -- 상태
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_registered_artworks_artist_id ON registered_artworks(artist_id);
CREATE INDEX IF NOT EXISTS idx_registered_artworks_status ON registered_artworks(status);
CREATE INDEX IF NOT EXISTS idx_registered_artworks_category ON registered_artworks(category);
CREATE INDEX IF NOT EXISTS idx_registered_artworks_created_at ON registered_artworks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registered_artworks_search ON registered_artworks USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_registered_artworks_tags ON registered_artworks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_registered_artworks_keywords ON registered_artworks USING GIN(keywords);

-- 전문 검색을 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_artwork_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('korean', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('korean', COALESCE(NEW.artist_name, '')), 'B') ||
    setweight(to_tsvector('korean', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_artwork_search_vector_trigger
BEFORE INSERT OR UPDATE ON registered_artworks
FOR EACH ROW
EXECUTE FUNCTION update_artwork_search_vector();

-- Row Level Security (RLS) 정책
ALTER TABLE registered_artworks ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 승인된 작품 조회 가능
CREATE POLICY "Anyone can view approved artworks" ON registered_artworks
  FOR SELECT
  USING (status = 'approved' OR auth.uid() = artist_id OR 
         EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 예술가는 자신의 작품만 생성 가능
CREATE POLICY "Artists can create their own artworks" ON registered_artworks
  FOR INSERT
  WITH CHECK (auth.uid() = artist_id AND 
              EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('artist', 'admin')));

-- 예술가는 자신의 작품만 수정 가능
CREATE POLICY "Artists can update their own artworks" ON registered_artworks
  FOR UPDATE
  USING (auth.uid() = artist_id OR 
         EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 관리자는 모든 작품 삭제 가능, 예술가는 자신의 작품만 삭제 가능
CREATE POLICY "Artists can delete their own artworks" ON registered_artworks
  FOR DELETE
  USING (auth.uid() = artist_id OR 
         EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 좋아요 테이블 RLS
ALTER TABLE artwork_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own likes" ON artwork_likes
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view likes" ON artwork_likes
  FOR SELECT
  USING (true);

-- 조회 기록 테이블 RLS
ALTER TABLE artwork_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create views" ON artwork_views
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins can view all records" ON artwork_views
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 예술가 인증 요청 테이블 RLS
ALTER TABLE artist_verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own verification requests" ON artist_verification_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests" ON artist_verification_requests
  FOR SELECT
  USING (auth.uid() = user_id OR 
         EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Only admins can update verification requests" ON artist_verification_requests
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 관리자 계정 생성 함수 (초기 설정용)
CREATE OR REPLACE FUNCTION create_admin_user(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET role = 'admin' 
  WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 작품 승인 함수
CREATE OR REPLACE FUNCTION approve_artwork(artwork_id UUID, admin_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE registered_artworks
  SET 
    status = 'approved',
    approved_at = NOW(),
    approved_by = admin_id
  WHERE id = artwork_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 작품 거부 함수
CREATE OR REPLACE FUNCTION reject_artwork(artwork_id UUID, admin_id UUID, reason TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE registered_artworks
  SET 
    status = 'rejected',
    rejection_reason = reason,
    approved_by = admin_id,
    approved_at = NOW()
  WHERE id = artwork_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;