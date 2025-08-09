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

# 🎨 Art Recommendation SaaS - 현재 상태

## 🚀 서버 상태 (2025-08-09)
- **메인 서버**: `server.ts` (프로덕션 준비 완료)
- **포트**: 3000
- **상태**: 정상 운영 중 ✅
- **시작 명령어**: `bun run start` 또는 `bun server.ts`

## ✅ 완료된 핵심 기능
### 역할 기반 인증 시스템
- 사용자/예술가/관리자 역할 분리
- 회원가입 시 역할 선택 (`/signup`)
- 예술가 인증 승인 워크플로우
- 관리자 인증 코드: `ADMIN2025SECRET`

### 작품 관리 시스템  
- 예술가 작품 등록 시스템
- 관리자 승인/거부 워크플로우
- 승인된 작품 추천 시스템 통합
- 데이터베이스 RLS 정책 적용

### AI 분석 & 추천
- 단일/다중 이미지 분석
- 공통 키워드 추출
- 등록된 작품 우선 추천
- 외부 박물관 API 연동

## ✅ 완료된 기술 부채 해결 (2025-08-09)
1. 다중 이미지 분석 DB 스키마 생성 (`005_multi_image_analysis_schema.sql`)
2. 사용하지 않는 TSX 파일들 정리 (`signup.tsx`, `SignupWithRole.tsx`)
3. 서버 에러 핸들링 개선 (try-catch 블록 추가)
4. HTML 파일 모듈 import 정리

## 🔧 활성 기능
- AI 이미지 분석 (Google Vision + Clarifai)
- 역할 기반 사용자 인증 (Supabase Auth)
- 작품 등록/승인 시스템
- 다중 이미지 분석
- 정적 파일 서빙 (자동 MIME 감지)
- CORS 완전 지원
- 헬스체크 API

## 📋 다음 세션 시작 방법
1. `curl http://localhost:3000/api/health` (상태 확인)
2. 서버가 꺼져있으면: `bun run start`
3. 브라우저에서 http://localhost:3000 접속

## 🧪 테스트 워크플로우
1. `/signup` - 관리자 계정 생성 (코드: `ADMIN2025SECRET`)
2. `/signup` - 예술가 계정 생성  
3. `/admin-dashboard` - 예술가 승인
4. 예술가로 작품 등록
5. 관리자로 작품 승인
6. `/analyze` - 승인된 작품이 추천에 포함되는지 확인

**중요**: 모든 변경사항이 저장되었으며, 기술 부채 해결 완료!