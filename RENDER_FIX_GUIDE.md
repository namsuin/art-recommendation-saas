# Render 502 에러 즉시 해결 가이드

## 문제 원인
로컬과 Render의 환경 변수 설정 차이:
- **로컬**: `GOOGLE_CLOUD_KEY_FILE` (파일 경로)
- **Render**: `GOOGLE_VISION_SERVICE_ACCOUNT_KEY` (JSON 문자열)

## 즉시 해결 방법

### 1단계: Render Dashboard 접속
1. https://dashboard.render.com 로그인
2. `art-recommendation-saas` 서비스 선택
3. 왼쪽 메뉴에서 **Environment** 클릭

### 2단계: 환경 변수 추가

#### 필수 환경 변수 1: GOOGLE_VISION_SERVICE_ACCOUNT_KEY

Google Cloud Console에서 서비스 계정 키를 다운로드했다면, 그 JSON 파일의 **전체 내용**을 복사하여 환경 변수로 추가:

```
Key: GOOGLE_VISION_SERVICE_ACCOUNT_KEY
Value: {"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

**주의사항:**
- JSON을 한 줄로 붙여넣기 (줄바꿈 없이)
- 따옴표나 백슬래시 이스케이프 불필요
- 전체 JSON 객체를 그대로 복사

#### 필수 환경 변수 2: CLARIFAI_API_KEY
```
Key: CLARIFAI_API_KEY
Value: e4a8368f76fc4f65912ea6a2e15da489
```

#### 선택 환경 변수 (이미 있을 수 있음)
```
SUPABASE_URL=https://lzvfmnnshjrjugsrmswu.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dmZtbm5zaGpyanVnc3Jtc3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA1NjMzNiwiZXhwIjoyMDY5NjMyMzM2fQ.1b0pP5WdI9rKfnFQLYqULbfL02da0iaJ-kAxbxdk02A
NODE_ENV=production
```

### 3단계: 저장 및 재배포
1. **Save Changes** 클릭
2. 자동으로 재배포 시작 (2-3분 소요)
3. 배포 완료 후 테스트

### 4단계: 테스트
```bash
# 헬스체크
curl https://art-recommendation-saas.onrender.com/api/health

# 이미지 분석 테스트 (작은 이미지 사용)
curl -X POST https://art-recommendation-saas.onrender.com/api/analyze \
  -F "image=@test.jpg" \
  -F "userId=test"
```

## 코드 수정 사항 (이미 완료)
`ai-service/integrations/google-vision.ts` 파일이 수정되어 이제 두 가지 방식 모두 지원:
1. `GOOGLE_VISION_SERVICE_ACCOUNT_KEY` (Render용 - JSON 문자열)
2. `GOOGLE_CLOUD_KEY_FILE` (로컬용 - 파일 경로)

## 확인 사항
- ✅ 코드가 환경 변수에서 JSON 직접 읽기 지원
- ⏳ Render에 환경 변수 설정 필요
- ⏳ 재배포 후 테스트 필요

## 문제 지속 시
1. Render Logs 탭에서 에러 메시지 확인
2. 메모리 부족인 경우 유료 플랜 고려 (무료: 512MB → 유료: 2GB+)
3. 타임아웃인 경우 이미지 크기 제한 추가 고려