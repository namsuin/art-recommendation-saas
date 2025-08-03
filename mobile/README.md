# AI Art Recommendation Mobile App

React Native 모바일 앱 (Expo 기반)

## 🚀 빠른 시작

### 필수 요구사항
- Node.js (v16 이상)
- Bun (권장) 또는 npm/yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS 시뮬레이터 (macOS) 또는 Android Studio

### 설치 및 실행

1. **의존성 설치**
   ```bash
   bun install
   ```

2. **환경 변수 설정**
   ```bash
   cp .env.example .env
   # .env 파일을 편집하여 실제 값들을 입력하세요
   ```

3. **개발 서버 시작**
   ```bash
   bun start
   # 또는
   expo start
   ```

4. **플랫폼별 실행**
   ```bash
   # iOS (macOS에서만)
   bun run ios
   
   # Android
   bun run android
   
   # 웹 브라우저
   bun run web
   ```

## 📱 주요 기능

### 🎨 AI 이미지 분석
- 카메라 촬영 또는 갤러리에서 이미지 선택
- 4개 AI 모델을 활용한 종합 분석
- 실시간 분석 결과 표시

### 🖼️ 개인화된 추천
- 사용자 취향 기반 작품 추천
- 유사도 점수 및 추천 이유 제공
- 추천 히스토리 관리

### 🛒 구매 대행 서비스
- 간편한 구매 요청 폼
- 실시간 구매 상태 추적
- 푸시 알림을 통한 상태 업데이트

### 🔔 푸시 알림
- 분석 완료 알림
- 구매 요청 상태 변경 알림
- 일일 사용량 알림
- 주간 리마인더

### 👤 사용자 관리
- Supabase 기반 인증
- 프로필 관리
- 구독 상태 확인
- 사용량 모니터링

## 🏗️ 아키텍처

### 기술 스택
- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **Navigation**: React Navigation v6
- **UI Library**: React Native Paper
- **State Management**: React Context
- **Authentication**: Supabase Auth
- **Notifications**: Expo Notifications
- **Camera**: Expo Camera + Image Picker

### 프로젝트 구조
```
mobile/
├── src/
│   ├── screens/          # 화면 컴포넌트
│   ├── services/         # API 및 서비스 레이어
│   ├── components/       # 재사용 가능한 컴포넌트
│   └── types/           # TypeScript 타입 정의
├── assets/              # 이미지, 아이콘 등 정적 자산
├── app.json            # Expo 설정
├── eas.json            # EAS Build 설정
└── package.json        # 의존성 및 스크립트
```

## 🔧 개발 환경 설정

### VS Code 확장 프로그램 (권장)
- React Native Tools
- TypeScript Hero
- Prettier
- ESLint
- Expo Tools

### 디버깅
- Flipper (React Native 디버깅)
- React Developer Tools
- Expo Dev Tools

## 📦 빌드 및 배포

### EAS Build 사용 (권장)

1. **EAS CLI 설치**
   ```bash
   npm install -g @expo/cli
   ```

2. **프로젝트 설정**
   ```bash
   eas build:configure
   ```

3. **빌드 실행**
   ```bash
   # 개발용 빌드
   eas build --profile development
   
   # 프리뷰 빌드 (내부 테스트용)
   eas build --profile preview
   
   # 프로덕션 빌드
   eas build --profile production
   ```

4. **앱 스토어 제출**
   ```bash
   eas submit
   ```

### 로컬 빌드 (선택사항)

1. **Android APK**
   ```bash
   expo build:android
   ```

2. **iOS IPA** (macOS에서만)
   ```bash
   expo build:ios
   ```

## 🌐 환경 변수

### 필수 환경 변수
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase 익명 키
- `EXPO_PUBLIC_API_BASE_URL`: 백엔드 API 기본 URL

### 선택적 환경 변수
- `EXPO_PUBLIC_EXPO_PROJECT_ID`: Expo 프로젝트 ID (푸시 알림용)
- `EXPO_PUBLIC_ENVIRONMENT`: 환경 (development/staging/production)

## 🧪 테스트

```bash
# 단위 테스트
bun test

# E2E 테스트 (Detox)
bun run e2e:ios
bun run e2e:android
```

## 📝 주요 화면

### 1. 인증 화면 (`LoginScreen`, `RegisterScreen`)
- 이메일/비밀번호 로그인
- 소셜 로그인 지원 준비
- 회원가입 및 이메일 인증

### 2. 메인 화면 (`HomeScreen`)
- 사용량 현황 대시보드
- 빠른 액션 버튼
- 최근 추천 작품 미리보기

### 3. 카메라 화면 (`CameraScreen`)
- 실시간 카메라 촬영
- 갤러리에서 이미지 선택
- 이미지 미리보기 및 분석 시작

### 4. 분석 결과 화면 (`AnalysisScreen`)
- AI 분석 결과 표시
- 추천 작품 목록
- 구매 요청 버튼

### 5. 구매 화면 (`PurchaseScreen`)
- 구매 요청 폼
- 연락처 정보 입력
- 긴급도 선택

### 6. 히스토리 화면 (`HistoryScreen`)
- 분석 히스토리
- 구매 요청 현황
- 필터링 및 검색

### 7. 프로필 화면 (`ProfileScreen`)
- 사용자 정보 관리
- 구독 상태 확인
- 알림 설정

## 🔐 보안 고려사항

- API 키는 환경 변수로 관리
- 사용자 인증은 Supabase RLS 정책 적용
- 이미지 업로드 시 파일 타입 및 크기 검증
- 민감한 정보는 디바이스 키체인에 안전하게 저장

## 🚀 성능 최적화

- 이미지 레이지 로딩
- API 응답 캐싱
- 불필요한 리렌더링 방지
- 메모리 누수 방지

## 📞 지원 및 문의

- 이슈 리포팅: GitHub Issues
- 문서: 프로젝트 Wiki
- 연락처: 개발팀 이메일

---

**Built with ❤️ using React Native, Expo, and TypeScript**