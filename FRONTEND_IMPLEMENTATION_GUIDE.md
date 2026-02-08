# 프론트엔드 구현 가이드

## 1. 타입 정의 (TypeScript)

먼저 백엔드에서 받을 데이터의 타입을 정의합니다.

```typescript
// types/aesthetic.ts

export interface AestheticAnalysisResult {
  aestheticScore: number;           // 0-100
  styleTags: string[];              // ['artistic', 'modern', 'symmetric']
  moodTags: string[];               // ['bright', 'vibrant', 'calm']
  complexity: 'low' | 'medium' | 'high';
  isArtLike: boolean;
  confidence: number;               // 0-100
  
  colorAnalysis?: {
    diversity: number;              // 0-100
    saturation: number;             // 0-100
    brightness: number;             // 0-100
    dominantPalette: string;        // 'warm' | 'cool' | 'vibrant' | 'neutral'
  };
  
  composition?: {
    hasSymmetry: boolean;
    centerFocus: boolean;
    objectDistribution: 'balanced' | 'scattered' | 'clustered';
    visualWeight: 'light' | 'medium' | 'heavy';
  };
  
  context?: {
    category: 'portrait' | 'landscape' | 'abstract' | 'architecture' | 'still-life' | 'general';
    hasHuman: boolean;
    isProfessionalPhoto: boolean;
    isArtwork: boolean;
  };
}

export interface ImageAnalysisResponse {
  success: boolean;
  aesthetic: AestheticAnalysisResult;
  labels: Array<{ description: string; score: number }>;
  // ... 기타 필드
}
```

---

## 2. API 호출 (React 예시)

```typescript
// hooks/useImageAnalysis.ts

import { useState } from 'react';
import { AestheticAnalysisResult, ImageAnalysisResponse } from '@/types/aesthetic';

export const useImageAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AestheticAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeImage = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('분석 실패');
      }

      const data: ImageAnalysisResponse = await response.json();
      setResult(data.aesthetic);
      
      return data.aesthetic;
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { analyzeImage, loading, result, error };
};
```

---

## 3. UI 컴포넌트 구현

### 3-1. 메인 결과 카드

```tsx
// components/AestheticScoreCard.tsx

import React from 'react';
import { AestheticAnalysisResult } from '@/types/aesthetic';

interface Props {
  result: AestheticAnalysisResult;
}

export const AestheticScoreCard: React.FC<Props> = ({ result }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '탁월함';
    if (score >= 60) return '우수함';
    if (score >= 40) return '보통';
    return '개선 필요';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* 메인 점수 */}
      <div className="text-center mb-6">
        <div className={`text-6xl font-bold ${getScoreColor(result.aestheticScore)}`}>
          {result.aestheticScore}
        </div>
        <div className="text-sm text-gray-500 mt-2">
          {getScoreLabel(result.aestheticScore)}
        </div>
        
        {/* 신뢰도 표시 */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-400">신뢰도</span>
          <div className="flex-1 max-w-[200px] bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${result.confidence}%` }}
            />
          </div>
          <span className="text-xs text-gray-600">{result.confidence}%</span>
        </div>
      </div>

      {/* 아트워크 여부 */}
      {result.isArtLike && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <span className="text-sm text-purple-800 font-medium">
              예술적 가치가 높은 이미지입니다
            </span>
          </div>
        </div>
      )}

      {/* 복잡도 */}
      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">복잡도</div>
        <div className="flex gap-2">
          {['low', 'medium', 'high'].map((level) => (
            <div
              key={level}
              className={`flex-1 h-2 rounded ${
                result.complexity === level ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-1 capitalize">
          {result.complexity === 'low' && '간결함'}
          {result.complexity === 'medium' && '적절함'}
          {result.complexity === 'high' && '풍부함'}
        </div>
      </div>
    </div>
  );
};
```

### 3-2. 태그 표시 컴포넌트

```tsx
// components/TagsDisplay.tsx

import React from 'react';

interface Props {
  styleTags: string[];
  moodTags: string[];
}

export const TagsDisplay: React.FC<Props> = ({ styleTags, moodTags }) => {
  const tagColors = {
    style: 'bg-blue-100 text-blue-800 border-blue-300',
    mood: 'bg-purple-100 text-purple-800 border-purple-300',
  };

  // 한글 번역 매핑
  const translations: Record<string, string> = {
    // Style tags
    'artistic': '예술적',
    'modern': '현대적',
    'classic': '고전적',
    'minimal': '미니멀',
    'abstract': '추상적',
    'symmetric': '대칭적',
    'balanced': '균형잡힌',
    'structured': '구조적',
    'portrait': '인물사진',
    'photography': '사진',
    'painting': '회화',
    'illustration': '일러스트',
    
    // Mood tags
    'bright': '밝은',
    'dark': '어두운',
    'vibrant': '생동감있는',
    'calm': '차분한',
    'dramatic': '극적인',
    'colorful': '다채로운',
    'monochromatic': '단색의',
    'warm': '따뜻한',
    'cool': '시원한',
    'energetic': '활기찬',
    'muted': '차분한',
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* 스타일 태그 */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span>🎨</span>
          <span>스타일</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {styleTags.map((tag) => (
            <span
              key={tag}
              className={`px-3 py-1 rounded-full text-sm border ${tagColors.style}`}
            >
              {translations[tag] || tag}
            </span>
          ))}
          {styleTags.length === 0 && (
            <span className="text-sm text-gray-400">감지된 스타일 없음</span>
          )}
        </div>
      </div>

      {/* 무드 태그 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span>✨</span>
          <span>분위기</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {moodTags.map((tag) => (
            <span
              key={tag}
              className={`px-3 py-1 rounded-full text-sm border ${tagColors.mood}`}
            >
              {translations[tag] || tag}
            </span>
          ))}
          {moodTags.length === 0 && (
            <span className="text-sm text-gray-400">감지된 분위기 없음</span>
          )}
        </div>
      </div>
    </div>
  );
};
```

### 3-3. 색상 분석 표시

```tsx
// components/ColorAnalysis.tsx

import React from 'react';
import { AestheticAnalysisResult } from '@/types/aesthetic';

interface Props {
  colorAnalysis: AestheticAnalysisResult['colorAnalysis'];
}

export const ColorAnalysis: React.FC<Props> = ({ colorAnalysis }) => {
  if (!colorAnalysis) return null;

  const getPaletteEmoji = (palette: string) => {
    switch (palette) {
      case 'warm': return '🔥';
      case 'cool': return '❄️';
      case 'vibrant': return '🌈';
      case 'neutral': return '⚪';
      default: return '🎨';
    }
  };

  const getPaletteLabel = (palette: string) => {
    switch (palette) {
      case 'warm': return '따뜻한 색상';
      case 'cool': return '차가운 색상';
      case 'vibrant': return '선명한 색상';
      case 'neutral': return '중성 색상';
      default: return palette;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span>🎨</span>
        <span>색상 분석</span>
      </h3>

      {/* 팔레트 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl">{getPaletteEmoji(colorAnalysis.dominantPalette)}</span>
          <span className="text-lg font-medium text-gray-800">
            {getPaletteLabel(colorAnalysis.dominantPalette)}
          </span>
        </div>
      </div>

      {/* 색상 특성 바 차트 */}
      <div className="space-y-4">
        {/* 다양성 */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">다양성</span>
            <span className="text-gray-800 font-medium">{colorAnalysis.diversity}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-400 to-purple-500 h-3 rounded-full transition-all"
              style={{ width: `${colorAnalysis.diversity}%` }}
            />
          </div>
        </div>

        {/* 채도 */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">채도</span>
            <span className="text-gray-800 font-medium">{colorAnalysis.saturation}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-pink-400 to-red-500 h-3 rounded-full transition-all"
              style={{ width: `${colorAnalysis.saturation}%` }}
            />
          </div>
        </div>

        {/* 명도 */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">명도</span>
            <span className="text-gray-800 font-medium">{colorAnalysis.brightness}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-gray-400 to-yellow-300 h-3 rounded-full transition-all"
              style={{ width: `${colorAnalysis.brightness}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 3-4. 구도 분석 표시

```tsx
// components/CompositionAnalysis.tsx

import React from 'react';
import { AestheticAnalysisResult } from '@/types/aesthetic';

interface Props {
  composition: AestheticAnalysisResult['composition'];
}

export const CompositionAnalysis: React.FC<Props> = ({ composition }) => {
  if (!composition) return null;

  const getDistributionIcon = (dist: string) => {
    switch (dist) {
      case 'balanced': return '⚖️';
      case 'scattered': return '✨';
      case 'clustered': return '🎯';
      default: return '📐';
    }
  };

  const getDistributionLabel = (dist: string) => {
    switch (dist) {
      case 'balanced': return '균형잡힌 배치';
      case 'scattered': return '분산된 배치';
      case 'clustered': return '집중된 배치';
      default: return dist;
    }
  };

  const getWeightLabel = (weight: string) => {
    switch (weight) {
      case 'light': return '간결함';
      case 'medium': return '적절함';
      case 'heavy': return '풍부함';
      default: return weight;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span>📐</span>
        <span>구도 분석</span>
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* 대칭성 */}
        <div className={`p-4 rounded-lg border-2 ${
          composition.hasSymmetry 
            ? 'bg-green-50 border-green-300' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="text-center">
            <div className="text-2xl mb-2">
              {composition.hasSymmetry ? '✅' : '⬜'}
            </div>
            <div className="text-sm font-medium text-gray-700">대칭성</div>
            <div className="text-xs text-gray-500 mt-1">
              {composition.hasSymmetry ? '있음' : '없음'}
            </div>
          </div>
        </div>

        {/* 중앙 집중 */}
        <div className={`p-4 rounded-lg border-2 ${
          composition.centerFocus 
            ? 'bg-blue-50 border-blue-300' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="text-center">
            <div className="text-2xl mb-2">
              {composition.centerFocus ? '🎯' : '⬜'}
            </div>
            <div className="text-sm font-medium text-gray-700">중앙 집중</div>
            <div className="text-xs text-gray-500 mt-1">
              {composition.centerFocus ? '있음' : '없음'}
            </div>
          </div>
        </div>

        {/* 객체 분포 */}
        <div className="col-span-2 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {getDistributionIcon(composition.objectDistribution)}
            </span>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700">객체 배치</div>
              <div className="text-xs text-gray-600 mt-1">
                {getDistributionLabel(composition.objectDistribution)}
              </div>
            </div>
          </div>
        </div>

        {/* 시각적 무게 */}
        <div className="col-span-2 p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
          <div className="text-sm font-medium text-gray-700 mb-2">시각적 무게</div>
          <div className="flex gap-2">
            {['light', 'medium', 'heavy'].map((weight) => (
              <div
                key={weight}
                className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-medium ${
                  composition.visualWeight === weight
                    ? 'bg-orange-400 text-white'
                    : 'bg-white text-gray-400'
                }`}
              >
                {getWeightLabel(weight)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 3-5. 컨텍스트 표시

```tsx
// components/ImageContext.tsx

import React from 'react';
import { AestheticAnalysisResult } from '@/types/aesthetic';

interface Props {
  context: AestheticAnalysisResult['context'];
}

export const ImageContext: React.FC<Props> = ({ context }) => {
  if (!context) return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'portrait': return '👤';
      case 'landscape': return '🏞️';
      case 'abstract': return '🎨';
      case 'architecture': return '🏛️';
      case 'still-life': return '🍎';
      default: return '🖼️';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'portrait': return '인물 사진';
      case 'landscape': return '풍경 사진';
      case 'abstract': return '추상 미술';
      case 'architecture': return '건축 사진';
      case 'still-life': return '정물 사진';
      case 'general': return '일반';
      default: return category;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <span>🔍</span>
        <span>이미지 분류</span>
      </h3>

      {/* 카테고리 */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{getCategoryIcon(context.category)}</span>
          <div>
            <div className="text-lg font-semibold text-gray-800">
              {getCategoryLabel(context.category)}
            </div>
            <div className="text-xs text-gray-600 mt-1">주요 카테고리</div>
          </div>
        </div>
      </div>

      {/* 특성 */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`p-3 rounded-lg text-center ${
          context.hasHuman ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50'
        }`}>
          <div className="text-2xl mb-1">{context.hasHuman ? '👥' : '🚫'}</div>
          <div className="text-xs text-gray-600">인물 포함</div>
        </div>

        <div className={`p-3 rounded-lg text-center ${
          context.isProfessionalPhoto ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50'
        }`}>
          <div className="text-2xl mb-1">{context.isProfessionalPhoto ? '📸' : '📱'}</div>
          <div className="text-xs text-gray-600">전문 촬영</div>
        </div>

        <div className={`p-3 rounded-lg text-center ${
          context.isArtwork ? 'bg-purple-50 border-2 border-purple-300' : 'bg-gray-50'
        }`}>
          <div className="text-2xl mb-1">{context.isArtwork ? '🎨' : '📄'}</div>
          <div className="text-xs text-gray-600">예술 작품</div>
        </div>
      </div>
    </div>
  );
};
```

---

## 4. 메인 페이지 통합

```tsx
// pages/ImageAnalysis.tsx

import React, { useState } from 'react';
import { useImageAnalysis } from '@/hooks/useImageAnalysis';
import { AestheticScoreCard } from '@/components/AestheticScoreCard';
import { TagsDisplay } from '@/components/TagsDisplay';
import { ColorAnalysis } from '@/components/ColorAnalysis';
import { CompositionAnalysis } from '@/components/CompositionAnalysis';
import { ImageContext } from '@/components/ImageContext';

export const ImageAnalysisPage: React.FC = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const { analyzeImage, loading, result, error } = useImageAnalysis();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 미리보기
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 분석 시작
    await analyzeImage(file);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">이미지 미학 분석</h1>

        {/* 업로드 영역 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <label className="block">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 cursor-pointer transition-colors">
              {preview ? (
                <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded" />
              ) : (
                <>
                  <div className="text-6xl mb-4">📸</div>
                  <div className="text-gray-600">이미지를 선택하거나 드래그하세요</div>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <div className="mt-4 text-gray-600">이미지 분석 중...</div>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="text-red-800">❌ {error}</div>
          </div>
        )}

        {/* 결과 */}
        {result && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 왼쪽 열 */}
            <div className="space-y-6">
              <AestheticScoreCard result={result} />
              <TagsDisplay styleTags={result.styleTags} moodTags={result.moodTags} />
            </div>

            {/* 오른쪽 열 */}
            <div className="space-y-6">
              {result.context && <ImageContext context={result.context} />}
              {result.colorAnalysis && <ColorAnalysis colorAnalysis={result.colorAnalysis} />}
              {result.composition && <CompositionAnalysis composition={result.composition} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 5. 추가 개선 아이디어

### 5-1. 애니메이션 추가

```tsx
// Framer Motion 사용 예시
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  <AestheticScoreCard result={result} />
</motion.div>
```

### 5-2. 차트 라이브러리 사용

```tsx
// Recharts 사용 예시
import { RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

const data = [
  { metric: '다양성', value: colorAnalysis.diversity },
  { metric: '채도', value: colorAnalysis.saturation },
  { metric: '명도', value: colorAnalysis.brightness },
];

<RadarChart width={300} height={300} data={data}>
  <PolarGrid />
  <PolarAngleAxis dataKey="metric" />
  <Radar dataKey="value" fill="#8884d8" />
</RadarChart>
```

### 5-3. 비교 기능

```tsx
// 여러 이미지 비교
const [images, setImages] = useState<Array<{ file: File; result: AestheticAnalysisResult }>>([ ]);

// 나란히 비교 UI 구현
```

### 5-4. 내보내기 기능

```tsx
// PDF 또는 이미지로 결과 내보내기
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const exportToPDF = async () => {
  const element = document.getElementById('analysis-result');
  const canvas = await html2canvas(element);
  const imgData = canvas.toDataURL('image/png');
  
  const pdf = new jsPDF();
  pdf.addImage(imgData, 'PNG', 0, 0);
  pdf.save('analysis.pdf');
};
```

---

## 6. 반응형 디자인 고려사항

```css
/* Tailwind 클래스 활용 */
<div className="
  grid 
  grid-cols-1        /* 모바일: 1열 */
  md:grid-cols-2     /* 태블릿: 2열 */
  lg:grid-cols-3     /* 데스크톱: 3열 */
  gap-4
">
```

---

## 7. 접근성 (a11y) 개선

```tsx
// ARIA 라벨 추가
<div 
  role="progressbar" 
  aria-valuenow={result.aestheticScore} 
  aria-valuemin={0} 
  aria-valuemax={100}
  aria-label="미적 점수"
>
  {result.aestheticScore}
</div>

// 키보드 네비게이션
<button
  tabIndex={0}
  onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
>
  분석 시작
</button>
```

---

## 요약

프론트엔드에서 해야 할 작업:

1. ✅ **타입 정의** - TypeScript 인터페이스 작성
2. ✅ **API 연동** - 이미지 업로드 및 분석 결과 받기
3. ✅ **컴포넌트 구현** - 점수, 태그, 색상, 구도, 컨텍스트 표시
4. ✅ **UI/UX 디자인** - 직관적이고 시각적인 결과 표시
5. ✅ **반응형 대응** - 모바일/태블릿/데스크톱
6. ✅ **애니메이션** - 부드러운 전환 효과
7. ✅ **접근성** - 스크린 리더, 키보드 네비게이션

이제 이 컴포넌트들을 원하는 대로 조합하거나 수정해서 사용하시면 됩니다!
