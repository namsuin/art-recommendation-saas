# 예술가 신청 시스템 설정 가이드

## 현재 상태
- **Mock 데이터 사용 중**: 실제 데이터베이스 테이블이 생성될 때까지 메모리 기반 Mock 데이터를 사용합니다.
- **기능 정상 작동**: 예술가 신청, 관리자 승인/거부 기능이 모두 작동합니다.

## Supabase 테이블 생성 (선택사항)

실제 데이터베이스를 사용하려면 Supabase Dashboard에서 다음 SQL을 실행하세요:

```sql
-- Create artist_applications table
CREATE TABLE IF NOT EXISTS artist_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  bio TEXT NOT NULL,
  portfolio_url TEXT,
  instagram_url TEXT,
  experience TEXT NOT NULL CHECK (experience IN ('beginner', 'intermediate', 'advanced', 'professional')),
  specialties TEXT[] NOT NULL DEFAULT '{}',
  statement TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_artist_applications_user_id ON artist_applications(user_id);
CREATE INDEX idx_artist_applications_status ON artist_applications(status);
CREATE INDEX idx_artist_applications_applied_at ON artist_applications(applied_at);

-- Enable RLS
ALTER TABLE artist_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert
CREATE POLICY "Anyone can insert artist applications" ON artist_applications
  FOR INSERT WITH CHECK (true);

-- Policy: Anyone can select (for admin dashboard)
CREATE POLICY "Anyone can view applications" ON artist_applications
  FOR SELECT USING (true);

-- Policy: Anyone can update (for admin approval)
CREATE POLICY "Anyone can update applications" ON artist_applications
  FOR UPDATE USING (true);
```

## Mock 데이터 특징

### 샘플 신청
- 예술가명: 김예술
- 경력: 전문가 (10년 이상)
- 전문 분야: 회화, 설치미술, 디지털아트
- 상태: 대기 중

### 제한사항
- 서버 재시작 시 데이터 초기화
- 최대 저장 가능한 신청 수: 메모리 제한 내에서 무제한

## 실제 데이터베이스로 전환하기

1. 위의 SQL을 Supabase Dashboard에서 실행
2. `server.ts`에서 Mock 관련 코드를 Supabase 호출로 변경:
   - `mockArtistApplications.create()` → `supabase.from('artist_applications').insert()`
   - `mockArtistApplications.getAll()` → `supabase.from('artist_applications').select()`
   - `mockArtistApplications.updateStatus()` → `supabase.from('artist_applications').update()`

## 테스트 방법

1. 일반 사용자로 로그인
2. "내 계정" → "⭐ 예술가 되기" 클릭
3. 신청서 작성 후 제출
4. 관리자 계정으로 로그인
5. `/admin-dashboard` → "🎨 예술가 신청" 탭
6. 신청 승인 또는 거부

## 현재 기능

✅ 예술가 신청 제출
✅ 관리자 대시보드에서 신청 목록 조회
✅ 신청 승인/거부 처리
✅ 승인 시 사용자 역할 자동 업그레이드 (Mock에서는 시뮬레이션)