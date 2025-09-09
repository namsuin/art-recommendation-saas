Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";

// import .css files directly and it works
import './index.css';

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

# 🎨 Art Recommendation SaaS - 최신 상태

## 🚀 서버 상태 (2025-09-09)
- **메인 서버**: `server.ts` (메모리 최적화 완료)
- **포트**: 3000
- **상태**: 프로덕션 배포 중 ✅
- **시작 명령어**: `bun run dev` (개발), `bun run start` (프로덕션)
- **GTM 설치**: ✅ GTM-KXJJQWWN

## ✅ 완료된 핵심 기능

### 🔐 역할 기반 인증 시스템
- 사용자/예술가/관리자 역할 분리
- 회원가입 시 역할 선택 (`/signup`)
- **예술가 신청 및 승인 시스템**: 완전 구현 ✨
- 관리자 인증 코드: 환경 변수 `ADMIN_AUTH_CODE`에서 설정
- Mock 데이터베이스 대체 시스템 (Supabase 불필요)

### 🎨 예술가 승인 워크플로우 (신규 완성)
- 일반 사용자 → 예술가 신청 제출
- 관리자 대시보드에서 신청 검토 및 승인/거부
- 승인 시 자동 역할 업그레이드 (user → artist)
- 실시간 프로필 업데이트 및 UI 반영
- 완전한 Mock 시스템으로 동작 (데이터베이스 불필요)

### 🖼️ 작품 관리 시스템  
- 예술가 작품 등록 시스템
- 관리자 승인/거부 워크플로우
- 승인된 작품 추천 시스템 통합
- 데이터베이스 RLS 정책 적용

### 🤖 AI 분석 & 추천
- 단일/다중 이미지 분석
- 공통 키워드 추출
- 등록된 작품 우선 추천
- 외부 박물관 API 연동

### 📊 관리자 대시보드
- 통계 및 수익 차트
- 사용자 현황 관리
- **예술가 신청 관리 탭** (완전 구현)
- 승인/거부 처리 with 실시간 업데이트

## ✅ 기술 부채 완전 정리 (최종 완료)
### 🗄️ 데이터베이스 최적화 
- ✅ **34,537개 작품 데이터 압축** - 24MB → 2.4MB (90% 압축률)
- ✅ **실시간 압축 해제** - Bun.gunzipSync() 사용
- ✅ **프로덕션 배포 완료** - art-recommendation-saas.onrender.com
- ✅ **Trouv.art 연동 완료** - www.trouv.art/dashboard

### 🧹 파일 시스템 정리
- ✅ **테스트 파일 제거** - frontend/test-dashboard.html
- ✅ **시스템 파일 정리** - .DS_Store 파일 삭제
- ✅ **AI 모델 캐시** - 234MB (로컬 캐시, gitignore 적용)
- ✅ **다국어 지원 완료** - Multiple Upload 페이지 영문화

### 🌐 배포 및 연동 최적화
- ✅ **메모리 효율적 서비스 로딩** - Lazy loading으로 512MB 제한 준수
- ✅ **CORS 설정 완료** - trouv.art 도메인 지원
- ✅ **압축 파일 배포** - artsper-dashboard-full.json.gz 
- ✅ **GTM 통합** - Google Tag Manager (GTM-KXJJQWWN) 설치

## 🔧 활성 기능
- **🎨 34,537개 작품 데이터베이스** - 압축된 Artsper 컬렉션
- **🤖 AI 이미지 분석** (Google Vision + Clarifai)
- **🔐 Mock 기반 사용자 인증** (Supabase 불필요)
- **✨ 완전한 예술가 승인 시스템**
- **📊 실시간 작품 관리 대시보드** (localhost + trouv.art)
- **🌐 다국어 지원** (한국어/영어 자동 전환)
- **🎯 다중 이미지 분석** - 공통 키워드/색상 추출
- **📱 반응형 UI** - 모바일/데스크톱 최적화
- **🚀 CORS 완전 지원** - 크로스 도메인 API 호출
- **💊 헬스체크 API** - 서버 상태 모니터링

## 📋 시작 방법
1. `curl http://localhost:3000/api/health` (상태 확인)
2. 서버가 꺼져있으면: `bun run dev` (개발) / `bun run start` (프로덕션)
3. 브라우저에서 http://localhost:3000 접속
4. 대시보드: http://localhost:3000/dashboard (34,537개 작품 관리)

## 🧪 완성된 테스트 워크플로우
1. **일반 사용자 가입** → 이메일/패스워드로 회원가입
2. **예술가 신청** → "내 계정" → "⭐ 예술가 되기" → 신청서 작성
3. **관리자 승인** → `/admin-dashboard` → "🎨 예술가 신청" → "✅ 승인" 
4. **역할 확인** → 해당 사용자로 다시 로그인 → 🎉 축하 메시지 및 예술가 기능 활성화
5. **작품 등록** → 예술가 계정으로 작품 등록 및 추천 시스템 연동

## 🌟 주요 특징
- **Zero Database Dependency**: 완전한 Mock 시스템으로 즉시 실행 가능
- **Real-time Updates**: 관리자 승인 즉시 사용자 인터페이스 반영
- **Clean Architecture**: 기술 부채 완전 정리로 유지보수 용이성 극대화
- **Production Ready**: 모든 기능 완성 및 테스트 완료

## 🌐 Trouv.art 배포 상태
- **메인 서비스**: https://www.trouv.art
- **작품 관리 대시보드**: https://www.trouv.art/dashboard  
- **데이터 소스**: art-recommendation-saas.onrender.com API
- **총 작품 수**: 34,537개 Artsper 컬렉션
- **배포 파일**: trouv-dashboard.html (프로덕션용)
- **로컬 테스트**: trouv-dashboard-local.html

## 📊 프로젝트 통계 (2025-09-09)
- **총 파일 크기**: ~895MB (AI 모델 캐시 포함)
- **압축된 데이터**: 2.4MB (원본 24MB의 90% 압축)
- **HTML 페이지**: 16개 (테스트 파일 제거 완료)
- **TypeScript 파일**: 25+ 개 (모듈화된 아키텍처)
- **배포 환경**: Render.com (자동 배포)

**상태**: 🎉 **완전 완성** - 프로덕션 배포 및 Trouv.art 연동 완료!