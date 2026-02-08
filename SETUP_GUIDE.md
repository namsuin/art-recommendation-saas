# 프론트엔드 설치 및 사용 가이드

## 📦 패키지 설치

### 필수 패키지 (React + TypeScript)

```bash
npm install react react-dom
npm install --save-dev @types/react @types/react-dom typescript
```

### 추가 권장 패키지

```bash
# Tailwind CSS (스타일링)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 애니메이션 (선택사항)
npm install framer-motion

# 차트 라이브러리 (선택사항)
npm install recharts

# 파일 내보내기 (선택사항)
npm install html2canvas jspdf
```

---

## 📁 파일 구조

제공된 파일들을 다음과 같이 배치하세요:

```
src/
├── types/
│   └── aesthetic.ts              # 타입 정의
├── utils/
│   └── translations.ts           # 번역 및 유틸리티
├── hooks/
│   └── useImageAnalysis.ts       # 커스텀 훅
├── components/
│   ├── AestheticScoreCard.tsx    # 점수 카드
│   ├── TagsDisplay.tsx           # 태그 표시
│   ├── ColorAnalysis.tsx         # 색상 분석
│   └── CompositionAndContext.tsx # 구도 및 컨텍스트
└── pages/
    └── ImageAnalysisPage.tsx     # 메인 페이지
```

---

## ⚙️ Tailwind CSS 설정

`tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'spin': 'spin 1s linear infinite',
        'fadeIn': 'fadeIn 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
```

`src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 추가 글로벌 스타일 */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 부드러운 스크롤 */
html {
  scroll-behavior: smooth;
}
```

---

## 🔌 백엔드 API 연동

### API 엔드포인트 설정

`useImageAnalysis` 훅에서 API 엔드포인트를 설정하세요:

```typescript
// 사용 예시
const { analyzeImage } = useImageAnalysis('/api/analyze-image');
// 또는 환경변수 사용
const { analyzeImage } = useImageAnalysis(process.env.REACT_APP_API_URL);
```

### 백엔드 응답 형식

백엔드는 다음 형식으로 응답해야 합니다:

```typescript
{
  "success": true,
  "aesthetic": {
    "aestheticScore": 75,
    "styleTags": ["artistic", "modern"],
    "moodTags": ["bright", "calm"],
    "complexity": "medium",
    "isArtLike": true,
    "confidence": 85,
    "colorAnalysis": {
      "diversity": 65,
      "saturation": 70,
      "brightness": 80,
      "dominantPalette": "warm"
    },
    "composition": {
      "hasSymmetry": true,
      "centerFocus": true,
      "objectDistribution": "balanced",
      "visualWeight": "medium"
    },
    "context": {
      "category": "portrait",
      "hasHuman": true,
      "isProfessionalPhoto": true,
      "isArtwork": false
    }
  }
}
```

### Express.js 예시 (백엔드)

```javascript
const express = require('express');
const multer = require('multer');
const { GoogleVisionService } = require('./services/google-vision');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const visionService = new GoogleVisionService();

app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '이미지 파일이 필요합니다'
      });
    }

    const result = await visionService.analyzeImage(req.file.buffer);

    if (!result) {
      return res.status(500).json({
        success: false,
        error: '이미지 분석에 실패했습니다'
      });
    }

    res.json({
      success: true,
      aesthetic: result.aesthetic
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '서버 오류'
    });
  }
});
```

---

## 🚀 사용 방법

### 1. 기본 사용

```tsx
// App.tsx
import React from 'react';
import { ImageAnalysisPage } from './pages/ImageAnalysisPage';

function App() {
  return <ImageAnalysisPage />;
}

export default App;
```

### 2. 라우팅과 함께 사용 (React Router)

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ImageAnalysisPage } from './pages/ImageAnalysisPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/analysis" element={<ImageAnalysisPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 3. 개별 컴포넌트 사용

특정 컴포넌트만 사용하고 싶다면:

```tsx
import { AestheticScoreCard } from './components/AestheticScoreCard';
import { ColorAnalysis } from './components/ColorAnalysis';

function MyCustomPage() {
  const [result, setResult] = useState(null);

  return (
    <div>
      {result && (
        <>
          <AestheticScoreCard result={result} />
          <ColorAnalysis colorAnalysis={result.colorAnalysis} />
        </>
      )}
    </div>
  );
}
```

---

## 🎨 커스터마이징

### 색상 테마 변경

컴포넌트의 Tailwind 클래스를 수정하여 색상을 변경할 수 있습니다:

```tsx
// 예: AestheticScoreCard.tsx
// 기존: 'from-green-500 to-emerald-600'
// 변경: 'from-purple-500 to-pink-600'
```

### 번역 추가/수정

`utils/translations.ts` 파일을 수정:

```typescript
export const tagTranslations: Record<string, string> = {
  'artistic': '예술적', // 기존
  'my-custom-tag': '나만의 태그', // 새로 추가
};
```

### 애니메이션 조정

컴포넌트의 `style` 속성이나 Tailwind 클래스 수정:

```tsx
// 애니메이션 속도 조정
style={{ 
  animationDelay: `${index * 100}ms`, // 50ms → 100ms
  animation: 'fadeInUp 0.5s ease-out forwards' // 0.3s → 0.5s
}}
```

---

## 📱 반응형 최적화

모바일/태블릿/데스크톱에서 자동으로 반응형이지만, 추가 조정이 필요하다면:

```tsx
<div className="
  grid 
  grid-cols-1        // 모바일: 세로 1열
  md:grid-cols-2     // 태블릿: 가로 2열
  lg:grid-cols-3     // 데스크톱: 가로 3열
  gap-4 md:gap-6     // 간격도 반응형
">
```

---

## 🐛 문제 해결

### CORS 에러

개발 환경에서 CORS 에러가 발생한다면:

**방법 1: 프록시 설정 (package.json)**
```json
{
  "proxy": "http://localhost:3001"
}
```

**방법 2: 백엔드 CORS 허용**
```javascript
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000'
}));
```

### 이미지 업로드 크기 제한

백엔드에서 파일 크기 제한 설정:

```javascript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

### TypeScript 타입 오류

타입이 일치하지 않으면 `types/aesthetic.ts` 확인 및 수정

---

## 📊 성능 최적화

### 1. 이미지 최적화

업로드 전 이미지 리사이즈:

```typescript
const resizeImage = (file: File, maxWidth: number = 1920): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * ratio;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
    };
    img.src = URL.createObjectURL(file);
  });
};
```

### 2. 지연 로딩

큰 컴포넌트는 lazy loading:

```tsx
import { lazy, Suspense } from 'react';

const ColorAnalysis = lazy(() => import('./components/ColorAnalysis'));

<Suspense fallback={<div>Loading...</div>}>
  <ColorAnalysis colorAnalysis={result.colorAnalysis} />
</Suspense>
```

### 3. 메모이제이션

불필요한 리렌더링 방지:

```tsx
import { memo } from 'react';

export const AestheticScoreCard = memo<Props>(({ result }) => {
  // 컴포넌트 내용
});
```

---

## 🧪 테스트

### Jest + React Testing Library

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

```tsx
// AestheticScoreCard.test.tsx
import { render, screen } from '@testing-library/react';
import { AestheticScoreCard } from './AestheticScoreCard';

test('renders score correctly', () => {
  const mockResult = {
    aestheticScore: 85,
    confidence: 90,
    // ... 기타 필드
  };
  
  render(<AestheticScoreCard result={mockResult} />);
  expect(screen.getByText('85')).toBeInTheDocument();
});
```

---

## 📦 빌드 및 배포

### 프로덕션 빌드

```bash
npm run build
```

### 환경변수 설정

`.env.production`:

```
REACT_APP_API_URL=https://api.yourdomain.com/analyze-image
```

### Vercel 배포 예시

```bash
npm install -g vercel
vercel --prod
```

---

## 💡 추가 기능 구현 아이디어

### 1. 이미지 비교 기능

```tsx
const [images, setImages] = useState<Array<{file: File, result: AestheticAnalysisResult}>>([]);
```

### 2. 결과 다운로드

```tsx
import html2canvas from 'html2canvas';

const downloadAsImage = async () => {
  const element = document.getElementById('result');
  const canvas = await html2canvas(element);
  const url = canvas.toDataURL();
  const link = document.createElement('a');
  link.download = 'analysis-result.png';
  link.href = url;
  link.click();
};
```

### 3. 히스토리 기능

```tsx
const [history, setHistory] = useState<AestheticAnalysisResult[]>([]);

// LocalStorage에 저장
useEffect(() => {
  if (result) {
    const newHistory = [...history, result].slice(-10); // 최근 10개
    setHistory(newHistory);
    localStorage.setItem('analysis-history', JSON.stringify(newHistory));
  }
}, [result]);
```

---

## 📞 지원

문제가 있거나 질문이 있다면:

1. 콘솔 에러 메시지 확인
2. 네트워크 탭에서 API 응답 확인
3. 타입 정의가 백엔드 응답과 일치하는지 확인

---

## ✅ 체크리스트

배포 전 확인사항:

- [ ] 모든 파일이 올바른 위치에 있는가?
- [ ] Tailwind CSS가 제대로 설정되었는가?
- [ ] API 엔드포인트가 올바르게 설정되었는가?
- [ ] 타입 정의가 백엔드와 일치하는가?
- [ ] 모든 이미지가 제대로 표시되는가?
- [ ] 모바일에서 잘 동작하는가?
- [ ] 에러 처리가 적절한가?
- [ ] 로딩 상태가 표시되는가?

---

이제 프론트엔드를 실행하고 이미지를 업로드해보세요! 🚀
