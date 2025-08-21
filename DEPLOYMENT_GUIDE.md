# 🚀 Art Recommendation SaaS - 통합 배포 가이드

## 📋 목차
1. [Render 배포](#render-배포)
2. [환경 변수 설정](#환경-변수-설정)
3. [문제 해결](#문제-해결)
4. [도메인 설정](#도메인-설정)

---

## Render 배포

### 1. GitHub 연동
1. [Render Dashboard](https://dashboard.render.com) 로그인
2. New → Web Service
3. GitHub 저장소 연결: `namsuin/art-recommendation-saas`
4. 브랜치: `main`

### 2. 서비스 설정
- **Name**: `art-recommendation-saas`
- **Region**: Singapore (아시아)
- **Branch**: main
- **Runtime**: Node
- **Build Command**: `bun install`
- **Start Command**: `bun server.ts`
- **Instance Type**: Free ($0/month) 또는 Starter ($7/month, 더 많은 메모리)

---

## 환경 변수 설정

### 필수 환경 변수

#### 1. GOOGLE_VISION_SERVICE_ACCOUNT_KEY
Google Vision API 서비스 계정 JSON (한 줄로):
```
{"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"your-service-account@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"...","universe_domain":"googleapis.com"}
```

**주의사항:**
- JSON을 한 줄로 붙여넣기
- 이스케이프 없이 그대로 복사
- 파일: `cedar-gift-467808-f9-8bf22ec56882.json`

#### 2. CLARIFAI_API_KEY
```
your-clarifai-api-key-here
```

#### 3. SUPABASE 설정 (선택)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-key
```

#### 4. 기타 설정
```
NODE_ENV=production
PORT=3000
ADMIN_AUTH_CODE=ADMIN2025SECRET
```

### 환경 변수 추가 방법
1. Render Dashboard → 서비스 선택
2. Environment 탭 클릭
3. Add Environment Variable
4. Key와 Value 입력
5. Save Changes → 자동 재배포

---

## 문제 해결

### 502 Bad Gateway 에러
**원인**: Google Vision API 초기화 실패

**해결책**:
1. 환경 변수 확인
   - `GOOGLE_VISION_SERVICE_ACCOUNT_KEY` 올바른 JSON 형식
   - 한 줄로 입력되었는지 확인
   
2. 메모리 부족
   - 무료 플랜: 512MB 제한
   - 유료 플랜으로 업그레이드 고려

3. 대안: Clarifai만 사용
   - Google Vision 환경 변수 제거
   - `CLARIFAI_API_KEY`만 유지

### 로그 확인
```bash
# Render Dashboard → Logs 탭
# 또는 CLI
render logs art-recommendation-saas --tail
```

### 테스트 엔드포인트
```bash
# 헬스체크
curl https://art-recommendation-saas.onrender.com/api/health

# 환경 변수 확인 (디버그 모드)
curl https://art-recommendation-saas.onrender.com/api/debug/env

# 이미지 분석 테스트
curl -X POST https://art-recommendation-saas.onrender.com/api/analyze \
  -F "image=@test.jpg" \
  -F "userId=test"
```

---

## 도메인 설정

### 사용자 정의 도메인 추가
1. Render Dashboard → Settings → Custom Domains
2. Add Custom Domain
3. 도메인 입력: `yourdomain.com`

### DNS 설정 (도메인 제공업체)
```
Type: CNAME
Name: @
Value: art-recommendation-saas.onrender.com
TTL: 300
```

### SSL 인증서
- Render가 자동으로 Let's Encrypt SSL 인증서 발급
- 24시간 내 자동 활성화

---

## 📚 추가 리소스
- [Render 공식 문서](https://render.com/docs)
- [Bun 배포 가이드](https://bun.sh/guides/deploy)
- GitHub Issues: [art-recommendation-saas/issues](https://github.com/namsuin/art-recommendation-saas/issues)

---

## 🔄 업데이트 내역
- 2025-08-21: Google Vision API 임시 파일 방식으로 수정
- 2025-08-20: 환경 변수 설정 가이드 추가
- 2025-08-11: 초기 배포 가이드 작성