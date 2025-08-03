# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com)에 접속하여 계정을 생성합니다.
2. 새 프로젝트를 생성합니다:
   - Project name: `art-recommendation-saas`
   - Database Password: 강력한 비밀번호 설정
   - Region: Seoul (또는 가장 가까운 지역)

## 2. API 키 설정

1. Supabase 대시보드에서 `Settings → API` 메뉴로 이동합니다.
2. 다음 정보를 복사합니다:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...`
   - **service_role key**: `eyJhbGc...` (⚠️ 보안 주의!)

3. `.env` 파일을 열어 복사한 값들을 붙여넣습니다:
   ```bash
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

## 3. 데이터베이스 스키마 생성

### 방법 1: SQL Editor 사용 (권장)
1. Supabase 대시보드에서 `SQL Editor` 메뉴로 이동
2. `New query` 버튼 클릭
3. `supabase/migrations/001_initial_schema.sql` 파일의 내용을 복사하여 붙여넣기
4. `Run` 버튼을 클릭하여 실행

### 방법 2: 터미널에서 실행
```bash
# Supabase CLI 설치 (아직 설치하지 않은 경우)
brew install supabase/tap/supabase

# 프로젝트 연결
supabase link --project-ref your-project-ref

# 마이그레이션 실행
supabase db push
```

## 4. Storage 버킷 생성

1. Supabase 대시보드에서 `Storage` 메뉴로 이동
2. `New bucket` 버튼 클릭
3. 다음 버킷들을 생성:
   - **user-uploads**: 사용자 업로드 이미지
     - Public: No
     - File size limit: 10MB
     - Allowed file types: image/*
   
   - **artworks**: 작품 이미지
     - Public: Yes
     - File size limit: 50MB
     - Allowed file types: image/*
   
   - **ai-generations**: AI 생성 이미지
     - Public: Yes
     - File size limit: 10MB
     - Allowed file types: image/*

## 5. Authentication 설정

1. `Authentication → Providers` 메뉴로 이동
2. Email provider가 활성화되어 있는지 확인
3. 필요시 추가 설정:
   - Confirm email: 활성화 (프로덕션 환경)
   - Auto-confirm email: 활성화 (개발 환경)

## 6. Edge Functions 설정 (선택사항)

일일 업로드 카운트 리셋을 위한 크론 작업:

1. `Edge Functions` 메뉴로 이동
2. 새 함수 생성: `reset-daily-uploads`
3. 다음 코드 추가:

```typescript
import { createClient } from '@supabase/supabase-js'

export const handler = async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { error } = await supabase.rpc('reset_daily_upload_counts')
  
  if (error) {
    console.error('Error resetting upload counts:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

4. 크론 스케줄 설정: `0 0 * * *` (매일 자정)

## 7. 서버 재시작

설정이 완료되면 서버를 재시작합니다:

```bash
# 기존 서버 종료
pkill -f "bun backend/simple-server.ts"

# 서버 재시작
bun run dev
```

## 8. 연결 테스트

브라우저에서 다음 URL에 접속하여 테스트:
- Health Check: http://localhost:3000/api/health
- Test Page: http://localhost:3000/test-api

Supabase가 성공적으로 연결되면 health check에서 `"supabase": "connected"`가 표시됩니다.

## 문제 해결

### 연결 오류가 발생하는 경우:
1. `.env` 파일의 URL과 키가 정확한지 확인
2. Supabase 프로젝트가 활성화되어 있는지 확인
3. 네트워크 연결 상태 확인

### 테이블 생성 오류가 발생하는 경우:
1. pgvector extension이 활성화되어 있는지 확인
2. SQL 구문 오류가 없는지 확인
3. 권한 문제가 없는지 확인