# Clarifai API 설정 가이드

## 1. Clarifai 계정 생성 및 API 키 획득

### 계정 생성
1. https://clarifai.com/ 방문
2. "Sign Up" 클릭하여 계정 생성
3. 이메일 인증 완료

### API 키 생성
1. 로그인 후 대시보드 접속
2. 좌측 메뉴에서 "API Keys" 클릭
3. "Create API Key" 버튼 클릭
4. 키 이름 입력: "art-recommendation-app"
5. Scopes 선택: "Predict" 체크
6. "Create" 버튼 클릭
7. **생성된 API 키 복사** (한 번만 표시됨!)

## 2. 환경변수 설정

`.env` 파일을 열고 다음 라인을 수정:

```bash
# Clarifai API
CLARIFAI_API_KEY=your_actual_api_key_here
```

**예시:**
```bash
CLARIFAI_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

## 3. 서버 재시작

환경변수 변경 후 서버 재시작:

```bash
# 기존 서버 종료
pkill -f "bun.*simple-server"

# 새 서버 시작  
bun --hot ./backend/simple-server.ts
```

## 4. 연동 확인

브라우저에서 다음 URL 접속하여 확인:
http://localhost:3000/api/health

응답에서 `ai_services.clarifai: true`가 나타나면 성공!

## 5. Clarifai 기능

Clarifai API가 활성화되면 다음 기능들이 향상됩니다:

### 향상된 이미지 분석
- **개념 인식**: 객체, 동물, 음식, 활동 등 5000+ 개념 자동 인식
- **색상 분석**: 주요 색상 팔레트 추출
- **감정 분석**: 이미지의 감정적 톤 분석
- **NSFW 필터링**: 부적절한 콘텐츠 자동 필터링

### 더 정확한 키워드 추출
기존: `["artwork", "visual-art", "creative"]`
Clarifai 연동 후: `["landscape", "mountain", "sunset", "nature", "photography", "scenic"]`

### 더 나은 작품 추천
- 이미지 내용 기반 정확한 매칭
- 색상 팔레트 기반 추천
- 감정/분위기 기반 추천

## 무료 요금제 한도

Clarifai 무료 계정:
- **월 1,000회** API 호출 무료
- 추가 사용 시 유료 요금제 필요

## 문제 해결

### API 키 오류
- API 키가 올바른지 확인
- Scopes에 "Predict" 권한이 있는지 확인

### 패키지 오류  
```bash
bun add clarifai-nodejs-grpc
```

### 네트워크 오류
- 방화벽이 Clarifai API 접속을 차단하지 않는지 확인
- 프록시 설정 확인