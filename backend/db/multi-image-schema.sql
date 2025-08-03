-- 다중 이미지 분석 결과 저장
CREATE TABLE IF NOT EXISTS multi_image_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_count INTEGER NOT NULL,
  individual_results JSONB NOT NULL, -- 각 이미지별 분석 결과
  common_keywords JSONB, -- 공통 키워드 분석
  recommendations JSONB, -- 추천 작품 목록
  processing_time INTEGER, -- 처리 시간 (ms)
  tier VARCHAR(50), -- 사용된 결제 티어
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 다중 이미지 분석 진행 상황 (Progressive 분석용)
CREATE TABLE IF NOT EXISTS multi_image_analysis_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_id VARCHAR(255) NOT NULL,
  image_index INTEGER NOT NULL,
  analysis_result JSONB NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(batch_id, image_index)
);

-- 다중 이미지 분석 결제 기록
CREATE TABLE IF NOT EXISTS multi_image_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id VARCHAR(255) UNIQUE,
  tier VARCHAR(50) NOT NULL,
  max_images INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 외부 플랫폼 검색 캐시
CREATE TABLE IF NOT EXISTS external_search_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keywords TEXT[] NOT NULL,
  platform VARCHAR(50) NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 hour'
);

-- 인덱스 생성
CREATE INDEX idx_multi_image_analyses_user_id ON multi_image_analyses(user_id);
CREATE INDEX idx_multi_image_analyses_created_at ON multi_image_analyses(created_at DESC);
CREATE INDEX idx_multi_image_payments_user_id ON multi_image_payments(user_id);
CREATE INDEX idx_multi_image_payments_status ON multi_image_payments(status);
CREATE INDEX idx_multi_image_payments_expires_at ON multi_image_payments(expires_at);
CREATE INDEX idx_external_search_cache_keywords ON external_search_cache USING GIN(keywords);
CREATE INDEX idx_external_search_cache_expires_at ON external_search_cache(expires_at);

-- 만료된 결제 기록 자동 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_payments()
RETURNS void AS $$
BEGIN
  UPDATE multi_image_payments
  SET status = 'expired'
  WHERE status = 'completed' 
    AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- 외부 검색 캐시 자동 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM external_search_cache
  WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- RLS 정책 설정
ALTER TABLE multi_image_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_image_analysis_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_image_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_search_cache ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 분석 결과만 볼 수 있음
CREATE POLICY "Users can view own multi-image analyses" ON multi_image_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own multi-image analyses" ON multi_image_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 분석 진행 상황만 볼 수 있음
CREATE POLICY "Users can view own analysis progress" ON multi_image_analysis_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own analysis progress" ON multi_image_analysis_progress
  FOR ALL USING (auth.uid() = user_id);

-- 사용자는 자신의 결제 기록만 볼 수 있음
CREATE POLICY "Users can view own payments" ON multi_image_payments
  FOR SELECT USING (auth.uid() = user_id);

-- 캐시는 모든 인증된 사용자가 읽을 수 있음
CREATE POLICY "Authenticated users can read cache" ON external_search_cache
  FOR SELECT TO authenticated USING (true);

-- 서버만 캐시를 쓸 수 있음 (service role)
CREATE POLICY "Service role can manage cache" ON external_search_cache
  FOR ALL TO service_role USING (true);