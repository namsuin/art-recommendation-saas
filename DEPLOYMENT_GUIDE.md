# 🚀 Art Recommendation SaaS 배포 가이드

## 📦 배포 준비 완료!

GitHub에 모든 코드가 저장되었습니다: https://github.com/namsuin/art-recommendation-saas

## 🎯 권장 배포 플랫폼

### 1. Render (추천) ⭐
1. [Render.com](https://render.com) 접속
2. "New +" → "Web Service" 클릭
3. GitHub 리포지토리 연결: `namsuin/art-recommendation-saas`
4. 설정:
   - **Name**: art-recommendation-saas
   - **Runtime**: Docker
   - **Branch**: main
5. 환경 변수 추가:
   ```
   GOOGLE_VISION_API_KEY=your_key
   CLARIFAI_API_KEY=your_key
   ADMIN_AUTH_CODE=your_code
   ```
6. "Create Web Service" 클릭

### 2. Railway (추천) ⭐
1. [Railway.app](https://railway.app) 접속
2. "New Project" → "Deploy from GitHub repo"
3. `namsuin/art-recommendation-saas` 선택
4. 환경 변수 설정 (Variables 탭)
5. 자동 배포 시작

### 3. Fly.io
```bash
# Fly CLI 설치 후
fly launch
fly secrets set GOOGLE_VISION_API_KEY=your_key
fly secrets set CLARIFAI_API_KEY=your_key
fly secrets set ADMIN_AUTH_CODE=your_code
fly deploy
```

## 🔧 환경 변수 설정

필수 환경 변수:
```env
# AI Services
GOOGLE_VISION_API_KEY=your_google_vision_key
CLARIFAI_API_KEY=your_clarifai_key

# Admin
ADMIN_AUTH_CODE=your_secure_admin_code

# Optional
NODE_ENV=production
PORT=3000
```

## 📝 배포 후 확인

1. **헬스체크**: `https://your-app.com/api/health`
2. **메인 페이지**: `https://your-app.com`
3. **관리자 대시보드**: `https://your-app.com/dashboard`
4. **관리자 로그인**: `https://your-app.com/admin`

## 🎨 주요 기능 테스트

1. **이미지 분석**: 메인 페이지에서 이미지 업로드
2. **회원가입/로그인**: `/signup`, `/login`
3. **관리자 기능**: 
   - `/admin`에서 ADMIN_AUTH_CODE 입력
   - 대시보드에서 작품 관리
   - 예술가 신청 승인

## 🆘 문제 해결

### Render/Railway 배포 실패 시
- Dockerfile이 정상적으로 빌드되는지 확인
- 환경 변수가 모두 설정되었는지 확인
- 포트 3000이 올바르게 설정되었는지 확인

### API 키 관련 오류
- Google Cloud Console에서 Vision API 활성화 확인
- Clarifai 대시보드에서 API 키 확인
- 환경 변수에 올바른 값이 설정되었는지 확인

## 📊 모니터링

- **Render**: Dashboard에서 로그 및 메트릭 확인
- **Railway**: Deployments 탭에서 실시간 로그 확인
- **애플리케이션 로그**: 구조화된 로깅 시스템이 자동으로 작동

## ✅ 배포 완료!

이제 프로덕션 환경에서 Art Recommendation SaaS를 사용할 수 있습니다!