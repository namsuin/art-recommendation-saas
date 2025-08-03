# AI Art Recommendation SaaS

AI 기반 예술 작품 추천 서비스 - 4개의 AI 모델 앙상블을 통한 정확한 작품 분석 및 추천

## 🎯 프로젝트 개요

사용자가 이미지를 업로드하면 다중 AI 시스템이 분석하여 유사한 예술 작품을 추천하는 SaaS 서비스입니다.

### 주요 기능
- 🤖 **멀티 AI 분석**: Google Vision AI, Replicate CLIP, Clarifai, Local CLIP 모델 앙상블
- 🎨 **정확한 추천**: 벡터 유사도 기반 작품 추천 (90%+ 정확도 목표)
- 📱 **실시간 처리**: WebSocket을 통한 실시간 분석 진행 상황 표시
- 💾 **확장 가능**: PostgreSQL + pgvector를 활용한 고성능 벡터 검색
- 🔐 **보안**: Supabase Auth 기반 사용자 인증 및 Row Level Security

## 🛠 기술 스택

### Frontend
- **Bun + React + TypeScript**: 모던 웹 프론트엔드
- **Tailwind CSS**: 반응형 UI 디자인
- **WebSocket**: 실시간 업데이트

### Backend
- **Bun.serve()**: 고성능 서버 (Express 대신)
- **TypeScript**: 타입 안전성
- **WebSocket**: 실시간 통신

### Database & Storage
- **Supabase**: PostgreSQL + Auth + Storage
- **pgvector**: 벡터 유사도 검색
- **Row Level Security**: 데이터 보안

### AI Services
1. **Google Vision AI**: 객체, 색상, 구성 분석
2. **Replicate CLIP**: 의미적 이해 및 스타일 분석  
3. **Clarifai**: 예술적 스타일, 분위기, 기법 감지
4. **Local CLIP**: 커스텀 아트 특화 분석

## 🚀 설치 및 실행

### 1. 의존성 설치
```bash
bun install
```

### 2. 환경 변수 설정
`.env` 파일 생성:
```env
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Services
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_KEY_FILE=path/to/service-account.json
REPLICATE_API_TOKEN=your-replicate-token
CLARIFAI_API_KEY=your-clarifai-key
```

### 3. 개발 서버 실행
```bash
bun run dev
```

서버가 http://localhost:3000 에서 실행됩니다.

## 📡 주요 API

- `GET /api/health` - 서비스 상태 확인
- `GET /api/ai/test` - AI 서비스 테스트
- `POST /api/analyze` - 이미지 분석 및 추천
- `GET /api/artworks` - 작품 목록 조회

## 🤖 AI 앙상블 시스템

4개의 AI 서비스가 병렬로 실행되어 가중평균으로 결합:
- Google Vision AI (25%)
- Replicate CLIP (30%)  
- Clarifai (25%)
- Local CLIP (20%)

## 📁 프로젝트 구조

```
art-recommendation-saas/
├── frontend/              # React 프론트엔드
├── backend/               # Bun 백엔드
├── ai-service/           # AI 분석 서비스
└── shared/               # 공통 타입 정의
```

## 🆕 Week 5 신규 기능

### 다중 이미지 분석 시스템
- **최대 50장 동시 분석**: 여러 이미지의 공통점 찾기
- **티어별 가격**: 3장 무료, 4-10장 $5, 11장+ $10
- **공통 키워드 추출**: AI가 자동으로 공통 테마 발견
- **Progressive 분석**: 실시간 진행 상황 표시

### 외부 플랫폼 통합
- **Artsy API**: 세계적인 미술품 플랫폼 검색
- **Behance API**: 디지털 아트 포트폴리오 검색
- **출처 표시**: 모든 작품에 원본 링크 제공

### 사용법
1. 메인 페이지에서 "다중 이미지 분석" 모드 선택
2. 드래그 앤 드롭으로 여러 이미지 업로드
3. 3장까지는 무료, 추가 이미지는 결제 필요
4. 분석 완료 후 공통 키워드와 추천 작품 확인

## 📈 프로젝트 진행 현황

### ✅ 완료된 기능
- Week 1: 기본 AI 분석 시스템
- Week 2: 사용자 인증, 업로드 제한
- Week 3: Stripe 결제, 관리자 대시보드
- Week 4: React Native 모바일 앱
- Week 5: 다중 이미지 분석, 외부 플랫폼 통합

### 🚧 개발 예정
- Week 6: 소셜 기능, 커뮤니티
- Week 7: 성능 최적화, 배포 준비

---
Built with ❤️ using Bun, React, Supabase, and AI
