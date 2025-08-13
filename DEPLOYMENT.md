# 🚀 Art Recommendation SaaS - 배포 가이드

## 📋 배포 전 체크리스트

- [x] 서버 정상 작동 확인
- [x] 환경변수 설정 파일 준비 (.env.example)
- [x] Docker 설정 완료
- [ ] Supabase 프로젝트 생성
- [ ] AI API 키 준비
- [ ] 도메인 준비 (선택사항)

## 🔧 로컬 테스트

```bash
# 1. 의존성 설치
bun install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일 편집하여 실제 값 입력

# 3. 서버 실행
bun run start

# 4. 브라우저에서 확인
open http://localhost:3000
```

## 🌐 배포 옵션

### 1. Render (추천 - 무료)

1. [Render](https://render.com) 가입
2. GitHub 저장소 연결
3. "New Web Service" 생성
4. 환경변수 설정:
   - Dashboard → Environment → Add Environment Variable
5. 자동 배포 완료!

### 2. Railway

1. [Railway](https://railway.app) 가입
2. GitHub 저장소 연결
3. 환경변수 설정
4. 배포 시작

```bash
# Railway CLI 사용
railway login
railway link
railway up
```

### 3. Fly.io

```bash
# Fly CLI 설치
curl -L https://fly.io/install.sh | sh

# 앱 생성
fly launch

# 환경변수 설정
fly secrets set SUPABASE_URL="your_url"
fly secrets set SUPABASE_ANON_KEY="your_key"

# 배포
fly deploy
```

### 4. Docker (자체 서버)

```bash
# Docker 이미지 빌드
docker build -t art-recommendation-saas .

# 컨테이너 실행
docker run -p 3000:3000 \
  -e SUPABASE_URL="your_url" \
  -e SUPABASE_ANON_KEY="your_key" \
  art-recommendation-saas
```

## 🔑 필수 환경변수

### Supabase (데이터베이스)
1. [Supabase](https://supabase.com) 프로젝트 생성
2. Settings → API에서 키 복사:
   - `SUPABASE_URL`: Project URL
   - `SUPABASE_ANON_KEY`: anon public key
   - `SUPABASE_SERVICE_ROLE_KEY`: service_role key

### AI Services (최소 1개 필요)

#### Google Vision
1. [Google Cloud Console](https://console.cloud.google.com)
2. Vision API 활성화
3. 서비스 계정 키 생성
4. `GOOGLE_CLOUD_PROJECT_ID` 설정

#### Clarifai
1. [Clarifai](https://clarifai.com) 가입
2. Personal Access Token 생성
3. `CLARIFAI_API_KEY` 설정

## 📊 배포 후 확인

1. **헬스체크**: `https://your-domain.com/api/health`
2. **메인 페이지**: `https://your-domain.com`
3. **관리자 대시보드**: `https://your-domain.com/admin-dashboard`

## 🐛 트러블슈팅

### 서버가 시작되지 않음
- 환경변수 확인
- 포트 충돌 확인
- 로그 확인: `docker logs [container-id]`

### AI 기능이 작동하지 않음
- API 키 유효성 확인
- API 사용량 한도 확인
- 네트워크 연결 확인

### 데이터베이스 연결 실패
- Supabase URL/키 확인
- Supabase 프로젝트 상태 확인
- RLS 정책 확인

## 📞 지원

문제가 있으시면 이슈를 생성해주세요!

---

**현재 상태**: ✅ 배포 준비 완료!