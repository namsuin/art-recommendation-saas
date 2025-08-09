-- 다중 이미지 분석 관련 테이블 생성
-- 005_multi_image_analysis_schema.sql

-- 다중 이미지 분석 결과 저장 테이블
CREATE TABLE IF NOT EXISTS multi_image_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  image_count INTEGER NOT NULL,
  individual_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  common_keywords JSONB,
  recommendations JSONB DEFAULT '[]'::jsonb,
  processing_time INTEGER, -- milliseconds
  tier TEXT NOT NULL DEFAULT 'free', -- 'free', 'standard', 'premium'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 다중 이미지 분석 진행 상황 추적 테이블 (Progressive 모드용)
CREATE TABLE IF NOT EXISTS multi_image_analysis_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL,
  image_index INTEGER NOT NULL,
  analysis_result JSONB NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, batch_id, image_index)
);

-- 다중 이미지 분석 결제 기록 테이블
CREATE TABLE IF NOT EXISTS multi_image_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL, -- 'Standard Pack', 'Premium Pack'
  amount INTEGER NOT NULL, -- cents (USD)
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  payment_intent_id TEXT, -- Stripe payment intent ID
  session_id TEXT, -- Stripe session ID
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE multi_image_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_image_analysis_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_image_payments ENABLE ROW LEVEL SECURITY;

-- multi_image_analyses 정책
CREATE POLICY "Users can view their own multi-image analyses" ON multi_image_analyses
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert their own multi-image analyses" ON multi_image_analyses
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins can view all multi-image analyses" ON multi_image_analyses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- multi_image_analysis_progress 정책
CREATE POLICY "Users can manage their own analysis progress" ON multi_image_analysis_progress
  FOR ALL USING (user_id = auth.uid());

-- multi_image_payments 정책
CREATE POLICY "Users can view their own payments" ON multi_image_payments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own payments" ON multi_image_payments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own payments" ON multi_image_payments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all payments" ON multi_image_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_multi_image_analyses_user_id ON multi_image_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_multi_image_analyses_created_at ON multi_image_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_multi_image_analyses_tier ON multi_image_analyses(tier);

CREATE INDEX IF NOT EXISTS idx_multi_image_progress_user_batch ON multi_image_analysis_progress(user_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_multi_image_progress_completed_at ON multi_image_analysis_progress(completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_multi_image_payments_user_id ON multi_image_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_multi_image_payments_status ON multi_image_payments(status);
CREATE INDEX IF NOT EXISTS idx_multi_image_payments_created_at ON multi_image_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_multi_image_payments_tier ON multi_image_payments(tier);

-- 트리거: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- multi_image_analyses 테이블용 트리거
DROP TRIGGER IF EXISTS update_multi_image_analyses_updated_at ON multi_image_analyses;
CREATE TRIGGER update_multi_image_analyses_updated_at
    BEFORE UPDATE ON multi_image_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- multi_image_payments 테이블용 트리거
DROP TRIGGER IF EXISTS update_multi_image_payments_updated_at ON multi_image_payments;
CREATE TRIGGER update_multi_image_payments_updated_at
    BEFORE UPDATE ON multi_image_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();