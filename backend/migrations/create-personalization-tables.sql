-- 사용자 상호작용 테이블
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id VARCHAR NOT NULL,
  interaction_type VARCHAR NOT NULL CHECK (interaction_type IN ('view', 'click', 'purchase_request', 'favorite')),
  style VARCHAR NOT NULL,
  mood VARCHAR NOT NULL,
  colors TEXT[] NOT NULL DEFAULT '{}',
  rating INTEGER NOT NULL DEFAULT 1 CHECK (rating >= 1 AND rating <= 5),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 프로필 테이블 (집계된 선호도)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  preferred_styles JSONB DEFAULT '{}',
  preferred_moods JSONB DEFAULT '{}',
  preferred_colors JSONB DEFAULT '{}',
  color_preferences JSONB DEFAULT '{
    "temperature": "neutral",
    "brightness": 50,
    "saturation": 50,
    "contrast": 50
  }',
  total_interactions INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 추천 실험 로그 테이블 (A/B 테스트용)
CREATE TABLE IF NOT EXISTS recommendation_experiments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  experiment_type VARCHAR NOT NULL CHECK (experiment_type IN ('content_only', 'collaborative_only', 'hybrid')),
  recommended_artworks TEXT[] NOT NULL DEFAULT '{}',
  click_through_rate FLOAT DEFAULT 0,
  conversion_rate FLOAT DEFAULT 0,
  session_id VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 유사 사용자 관계 테이블 (협업 필터링 최적화용)
CREATE TABLE IF NOT EXISTS user_similarities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id_1 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  similarity_score FLOAT NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  common_interactions INTEGER DEFAULT 0,
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2)
);

-- 개인화 추천 성능 통계 테이블
CREATE TABLE IF NOT EXISTS personalization_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  total_recommendations INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  average_rating FLOAT DEFAULT 0,
  top_performing_method VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_artwork_id ON user_interactions(artwork_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_rating ON user_interactions(rating);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_updated ON user_profiles(last_updated);

CREATE INDEX IF NOT EXISTS idx_recommendation_experiments_user_id ON recommendation_experiments(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_experiments_type ON recommendation_experiments(experiment_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_experiments_created_at ON recommendation_experiments(created_at);

CREATE INDEX IF NOT EXISTS idx_user_similarities_user1 ON user_similarities(user_id_1);
CREATE INDEX IF NOT EXISTS idx_user_similarities_user2 ON user_similarities(user_id_2);
CREATE INDEX IF NOT EXISTS idx_user_similarities_score ON user_similarities(similarity_score);

CREATE INDEX IF NOT EXISTS idx_personalization_metrics_user_id ON personalization_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_personalization_metrics_period ON personalization_metrics(period_start, period_end);

-- RLS 정책 설정
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_metrics ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 데이터만 접근 가능
CREATE POLICY "Users can only access their own interactions" ON user_interactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own profile" ON user_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own experiments" ON recommendation_experiments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access similarities involving them" ON user_similarities
  FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can only access their own metrics" ON personalization_metrics
  FOR ALL USING (auth.uid() = user_id);

-- 관리자 정책 (선택적)
CREATE POLICY "Admins can access all data" ON user_interactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can access all profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 트리거 함수: 사용자 프로필 자동 생성
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거: 새 사용자 생성 시 프로필 자동 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- 트리거 함수: 상호작용 시 프로필 업데이트
CREATE OR REPLACE FUNCTION update_user_profile_on_interaction()
RETURNS TRIGGER AS $$
BEGIN
  -- 프로필의 total_interactions 증가
  UPDATE user_profiles 
  SET 
    total_interactions = total_interactions + 1,
    last_updated = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거: 상호작용 시 프로필 업데이트
CREATE TRIGGER on_user_interaction_created
  AFTER INSERT ON user_interactions
  FOR EACH ROW EXECUTE FUNCTION update_user_profile_on_interaction();

-- 뷰: 사용자별 상호작용 통계
CREATE OR REPLACE VIEW user_interaction_stats AS
SELECT 
  user_id,
  COUNT(*) as total_interactions,
  COUNT(CASE WHEN interaction_type = 'view' THEN 1 END) as views,
  COUNT(CASE WHEN interaction_type = 'click' THEN 1 END) as clicks,
  COUNT(CASE WHEN interaction_type = 'favorite' THEN 1 END) as favorites,
  COUNT(CASE WHEN interaction_type = 'purchase_request' THEN 1 END) as purchases,
  AVG(rating) as average_rating,
  MAX(created_at) as last_interaction
FROM user_interactions
GROUP BY user_id;

-- 뷰: 인기 스타일/분위기 분석
CREATE OR REPLACE VIEW popular_styles_moods AS
SELECT 
  style,
  mood,
  COUNT(*) as interaction_count,
  AVG(rating) as average_rating,
  COUNT(DISTINCT user_id) as unique_users
FROM user_interactions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY style, mood
ORDER BY interaction_count DESC;

-- 뷰: 협업 필터링을 위한 사용자-작품 매트릭스 요약
CREATE OR REPLACE VIEW user_artwork_matrix AS
SELECT 
  user_id,
  artwork_id,
  AVG(rating) as avg_rating,
  COUNT(*) as interaction_count,
  MAX(created_at) as last_interaction
FROM user_interactions
GROUP BY user_id, artwork_id
HAVING COUNT(*) >= 1; -- 최소 1회 상호작용

COMMENT ON TABLE user_interactions IS '사용자의 작품 상호작용 기록 (클릭, 조회, 좋아요, 구매요청 등)';
COMMENT ON TABLE user_profiles IS '사용자별 집계된 선호도 프로필 (스타일, 분위기, 색상 선호도)';
COMMENT ON TABLE recommendation_experiments IS 'A/B 테스트를 위한 추천 실험 로그';
COMMENT ON TABLE user_similarities IS '협업 필터링을 위한 사용자 간 유사도 매트릭스';
COMMENT ON TABLE personalization_metrics IS '개인화 추천 시스템의 성능 지표';