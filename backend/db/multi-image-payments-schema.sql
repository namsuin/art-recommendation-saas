-- 다중 이미지 분석 결제 테이블 생성
CREATE TABLE IF NOT EXISTS multi_image_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tier VARCHAR(50) NOT NULL, -- 'standard', 'premium'
    image_count INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL, -- 금액 (센트 단위)
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    
    -- 인덱스
    INDEX idx_multi_image_payments_user_id (user_id),
    INDEX idx_multi_image_payments_payment_intent (payment_intent_id),
    INDEX idx_multi_image_payments_status (status),
    INDEX idx_multi_image_payments_created_at (created_at)
);

-- RLS 활성화
ALTER TABLE multi_image_payments ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 결제 기록만 볼 수 있음
CREATE POLICY "Users can view own payment records" ON multi_image_payments
    FOR SELECT USING (auth.uid() = user_id);

-- 관리자는 모든 결제 기록을 볼 수 있음 (추후 필요시)
-- CREATE POLICY "Admins can view all payment records" ON multi_image_payments
--     FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- 결제 성공률 및 통계를 위한 뷰 생성
CREATE OR REPLACE VIEW payment_statistics AS
SELECT 
    DATE_TRUNC('day', created_at) as payment_date,
    tier,
    COUNT(*) as total_attempts,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_payments,
    SUM(CASE WHEN status = 'completed' THEN amount_cents ELSE 0 END) as total_revenue_cents,
    AVG(CASE WHEN status = 'completed' THEN image_count END) as avg_images_per_success
FROM multi_image_payments
GROUP BY DATE_TRUNC('day', created_at), tier
ORDER BY payment_date DESC, tier;

-- 사용자별 결제 통계 뷰
CREATE OR REPLACE VIEW user_payment_summary AS
SELECT 
    user_id,
    COUNT(*) as total_payments,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_payments,
    SUM(CASE WHEN status = 'completed' THEN amount_cents ELSE 0 END) as total_spent_cents,
    SUM(CASE WHEN status = 'completed' THEN image_count ELSE 0 END) as total_images_analyzed,
    MAX(created_at) as last_payment_at
FROM multi_image_payments
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- 댓글 추가
COMMENT ON TABLE multi_image_payments IS '다중 이미지 분석을 위한 일회성 결제 기록';
COMMENT ON COLUMN multi_image_payments.payment_intent_id IS 'Stripe PaymentIntent ID';
COMMENT ON COLUMN multi_image_payments.tier IS '결제 티어 (standard: 4-10장, premium: 11+장)';
COMMENT ON COLUMN multi_image_payments.amount_cents IS '결제 금액 (센트 단위, USD)';
COMMENT ON COLUMN multi_image_payments.status IS '결제 상태';
COMMENT ON COLUMN multi_image_payments.metadata IS '추가 메타데이터 (Stripe에서 오는 정보 등)';