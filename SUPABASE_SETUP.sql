-- =================================
-- Art Recommendation SaaS
-- 완전한 Supabase 설정 스크립트
-- =================================

-- 이 스크립트를 Supabase SQL Editor에서 실행하세요
-- Dashboard → SQL Editor → New Query → 아래 내용 복사/붙여넣기 → Run

-- 1. Extensions 활성화 (필요한 경우)
-- CREATE EXTENSION IF NOT EXISTS "pgvector"; -- 벡터 검색용 (선택사항)

-- =================================
-- 기본 테이블 생성
-- =================================

-- 1. Users 테이블 (Supabase Auth와 연동)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    
    -- 역할 시스템
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'artist', 'admin')),
    artist_verified BOOLEAN DEFAULT FALSE,
    artist_bio TEXT,
    artist_portfolio_url TEXT,
    
    -- 구독 정보
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
    
    -- 업로드 제한
    upload_count_today INTEGER DEFAULT 0,
    upload_count_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 day',
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Artworks 테이블 (일반 작품 정보)
CREATE TABLE IF NOT EXISTS public.artworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    description TEXT,
    keywords TEXT[] DEFAULT '{}',
    price DECIMAL(10, 2),
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Registered Artworks 테이블 (등록된 작품 - 승인 시스템 포함)
CREATE TABLE IF NOT EXISTS public.registered_artworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 기본 정보
    title VARCHAR(500) NOT NULL,
    artist_name VARCHAR(255) NOT NULL,
    artist_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
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
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'archived')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES public.users(id),
    rejection_reason TEXT,
    
    -- 메타데이터
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- AI 분석 데이터 (자동 생성)
    ai_analysis JSONB
);

-- 4. User Uploads 테이블 (사용자 업로드 이미지)
CREATE TABLE IF NOT EXISTS public.user_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    analysis_keywords TEXT[] DEFAULT '{}',
    analysis_result JSONB, -- AI 분석 전체 결과
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Recommendations 테이블 (추천 기록)
CREATE TABLE IF NOT EXISTS public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    upload_id UUID REFERENCES public.user_uploads(id) ON DELETE CASCADE,
    artwork_id UUID REFERENCES public.artworks(id) ON DELETE CASCADE,
    registered_artwork_id UUID REFERENCES public.registered_artworks(id) ON DELETE CASCADE,
    similarity_score REAL,
    reasoning TEXT[],
    clicked BOOLEAN DEFAULT false,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Artist Applications 테이블 (예술가 신청)
CREATE TABLE IF NOT EXISTS public.artist_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- 신청자 정보
    real_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    contact_email VARCHAR(255),
    
    -- 포트폴리오
    portfolio_url TEXT,
    instagram_url TEXT,
    website_url TEXT,
    
    -- 신청 내용
    artist_statement TEXT,
    experience_years INTEGER,
    education TEXT,
    exhibitions TEXT,
    
    -- 상태 관리
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Artwork Likes 테이블
CREATE TABLE IF NOT EXISTS public.artwork_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artwork_id UUID REFERENCES public.registered_artworks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(artwork_id, user_id)
);

-- =================================
-- 인덱스 생성 (성능 최적화)
-- =================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

CREATE INDEX IF NOT EXISTS idx_registered_artworks_artist_id ON public.registered_artworks(artist_id);
CREATE INDEX IF NOT EXISTS idx_registered_artworks_status ON public.registered_artworks(status);
CREATE INDEX IF NOT EXISTS idx_registered_artworks_category ON public.registered_artworks(category);
CREATE INDEX IF NOT EXISTS idx_registered_artworks_created_at ON public.registered_artworks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_uploads_user_id ON public.user_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_uploads_created_at ON public.user_uploads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON public.recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_applications_user_id ON public.artist_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_applications_status ON public.artist_applications(status);

-- =================================
-- 함수 생성
-- =================================

-- 새 사용자 생성시 자동으로 users 테이블에 추가
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 예술가 승인 함수
CREATE OR REPLACE FUNCTION approve_artist_application(application_id UUID, admin_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 신청 상태 업데이트
    UPDATE public.artist_applications
    SET 
        status = 'approved',
        reviewed_by = admin_id,
        reviewed_at = NOW()
    WHERE id = application_id;
    
    -- 사용자 역할을 예술가로 업그레이드
    UPDATE public.users
    SET 
        role = 'artist',
        artist_verified = TRUE
    WHERE id = (SELECT user_id FROM public.artist_applications WHERE id = application_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================
-- 트리거 생성
-- =================================

-- 새 사용자 생성 트리거
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at 트리거들
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artworks_updated_at 
    BEFORE UPDATE ON public.artworks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registered_artworks_updated_at 
    BEFORE UPDATE ON public.registered_artworks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artist_applications_updated_at 
    BEFORE UPDATE ON public.artist_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =================================
-- Row Level Security (RLS) 설정
-- =================================

-- 테이블별 RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registered_artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artwork_likes ENABLE ROW LEVEL SECURITY;

-- Users 정책
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- User Uploads 정책
CREATE POLICY "Users can view own uploads" ON public.user_uploads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own uploads" ON public.user_uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Recommendations 정책
CREATE POLICY "Users can view own recommendations" ON public.recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create recommendations" ON public.recommendations
    FOR INSERT WITH CHECK (true);

-- Registered Artworks 정책
CREATE POLICY "Anyone can view approved artworks" ON public.registered_artworks
    FOR SELECT
    USING (status = 'approved' OR auth.uid() = artist_id OR 
           EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Artists can create their own artworks" ON public.registered_artworks
    FOR INSERT
    WITH CHECK (auth.uid() = artist_id AND 
                EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('artist', 'admin')));

CREATE POLICY "Artists can update their own artworks" ON public.registered_artworks
    FOR UPDATE
    USING (auth.uid() = artist_id OR 
           EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Artist Applications 정책
CREATE POLICY "Users can create their own applications" ON public.artist_applications
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own applications" ON public.artist_applications
    FOR SELECT
    USING (auth.uid() = user_id OR 
           EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Only admins can update applications" ON public.artist_applications
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Artwork Likes 정책
CREATE POLICY "Users can manage their own likes" ON public.artwork_likes
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view likes count" ON public.artwork_likes
    FOR SELECT
    USING (true);

-- =================================
-- 초기 데이터 (선택사항)
-- =================================

-- Artworks 테이블은 public read-only로 설정 (RLS 비활성화)
ALTER TABLE public.artworks DISABLE ROW LEVEL SECURITY;

-- =================================
-- 완료 메시지
-- =================================

-- 스크립트 실행 완료를 확인하기 위한 간단한 조회
SELECT 
    'Supabase 설정 완료!' as message,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('users', 'artworks', 'registered_artworks', 'user_uploads', 'recommendations', 'artist_applications', 'artwork_likes');