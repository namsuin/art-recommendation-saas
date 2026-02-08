# AestheticAnalyzer 정교화 개선 가이드

## 개요
Google Vision API 결과를 미학적 관점에서 분석하는 AestheticAnalyzer를 5단계에 걸쳐 순차적으로 개선했습니다.

---

## 1단계: 색상 분석 통합 (v1)

### 추가된 기능
- **색상 조화 분석**: `analyzeColorHarmony()` 메서드
  - 색상 다양성 (diversity): 0-100
  - 평균 채도 (saturation): 0-100
  - 평균 명도 (brightness): 0-100
  - 지배적 팔레트: 'warm', 'cool', 'vibrant', 'neutral'

### 주요 개선
```typescript
// 색상 기반 무드 태그 자동 추가
if (colorAnalysis.brightness > 70) moodTags.add('bright');
if (colorAnalysis.saturation > 70) moodTags.add('vibrant');
if (colorAnalysis.diversity > 70) moodTags.add('colorful');
```

### 점수 계산 개선
- 색상 다양성 적절 범위 (40-80): +8점
- 높은 채도 (>60): +5점
- 명도 균형 (30-80): +5점

### 파일: `AestheticAnalyzer_v1.ts`

---

## 2단계: 의미론적 분석 강화 (v2)

### 추가된 기능
- **AESTHETIC_MAPPINGS**: 체계적인 키워드 매핑
  - composition, artistic, emotion, style_modern, style_classic, nature, urban
  - 각 카테고리별 가중치 설정

- **MOOD_MAPPINGS**: 무드 키워드 체계화
  - brightness, darkness, energy, calmness, drama

### 주요 개선
```typescript
// 의미론적 매핑 예시
artistic: {
  keywords: ['art', 'painting', 'drawing', 'illustration'],
  styleTag: 'artistic',
  weight: 1.5  // 예술 관련은 높은 가중치
}
```

### 점수 계산 개선
- 매핑 카테고리별 가중치 자동 적용
- 스타일/무드 점수를 별도로 계산하여 최대값 제한
- 여러 미적 요소 조합 시 보너스 (+8점)

### 파일: `AestheticAnalyzer_v2.ts`

---

## 3단계: 신뢰도(Confidence) 활용 강화 (v3)

### 추가된 기능
- **신뢰도 임계값 정의**
  ```typescript
  CONFIDENCE_THRESHOLDS = {
    HIGH: 0.8,      // 매우 확실한 라벨
    MEDIUM: 0.6,    // 신뢰할 만한 라벨
    LOW: 0.4,       // 참고용 라벨
    MINIMUM: 0.3    // 최소 임계값
  }
  ```

- **전체 신뢰도 계산**: `calculateOverallConfidence()`
  - 상위 5개 라벨의 평균 신뢰도 (가중치 70%)
  - 객체 감지 평균 신뢰도 (가중치 30%)

### 주요 개선
```typescript
// 신뢰도에 따른 가중치 자동 조정
if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
  confidenceMultiplier = 1.5;  // 높은 신뢰도
} else if (confidence >= CONFIDENCE_THRESHOLDS.LOW) {
  confidenceMultiplier = 0.8;  // 낮은 신뢰도
}
```

### 점수 계산 개선
- 각 태그별 누적 점수 추적
- 임계값 이상의 점수를 가진 태그만 최종 포함
- 전체 신뢰도에 따른 최종 점수 보정 (50% 미만: -10%, 80% 이상: +5%)

### 결과 필드 추가
- `confidence`: 전체 분석의 신뢰도 (0-100)

### 파일: `AestheticAnalyzer_v3.ts`

---

## 4단계: 구도/구성 분석 추가 (v4)

### 추가된 기능
- **구도 분석**: `analyzeComposition()`
  ```typescript
  interface CompositionAnalysis {
    hasSymmetry: boolean;           // 대칭성
    centerFocus: boolean;           // 중앙 집중도
    objectDistribution: 'balanced' | 'scattered' | 'clustered';  // 객체 분포
    visualWeight: 'light' | 'medium' | 'heavy';  // 시각적 무게감
  }
  ```

### 세부 분석 메서드
1. **checkSymmetry()**: 좌우 대칭 확인
   - 라벨에서 대칭 키워드 탐지
   - 객체 위치 기반 좌우 균형 계산

2. **checkCenterFocus()**: 중앙 집중도
   - 중앙 30% 영역 내 객체 비율 계산

3. **analyzeObjectDistribution()**: 객체 분포
   - 평균 거리와 분산으로 분포 패턴 판단

4. **calculateVisualWeight()**: 시각적 무게감
   - 객체 개수, 크기, 라벨 키워드로 무게감 계산

### 점수 계산 개선
- 대칭성: +8점
- 중앙 집중: +5점
- 균형잡힌 분포: +7점
- 적절한 무게감: +3점

### 파일: `AestheticAnalyzer_v4.ts`

---

## 5단계: 컨텍스트 기반 점수 조정 (최종 버전)

### 추가된 기능
- **이미지 컨텍스트 파악**: `determineImageContext()`
  ```typescript
  interface ImageContext {
    category: 'portrait' | 'landscape' | 'abstract' | 'architecture' | 'still-life' | 'general';
    hasHuman: boolean;
    isProfessionalPhoto: boolean;
    isArtwork: boolean;
  }
  ```

### 컨텍스트 기반 점수 조정

#### 1. 사람 포함 여부
```typescript
if (context.hasHuman) {
  if (context.category === 'portrait') score += 10;  // 초상화: 긍정적
  else if (context.category === 'landscape') score -= 3;  // 풍경: 약간 부정적
  else if (context.category === 'abstract') score -= 8;  // 추상: 부정적
}
```

#### 2. 복잡도 평가
```typescript
if (complexity === 'high') {
  score += context.category === 'abstract' ? 8 : 5;  // 추상에서 높은 복잡도는 긍정적
}
if (complexity === 'low') {
  score += styleTags.has('minimal') ? 2 : -3;  // 미니멀에서 낮은 복잡도는 긍정적
}
```

#### 3. 구도 평가
```typescript
if (composition.hasSymmetry) {
  // 건축과 정물화에서 대칭은 매우 중요
  score += (context.category === 'architecture' || 
            context.category === 'still-life') ? 12 : 8;
}
```

#### 4. 카테고리별 특별 보너스
- **초상화**: 중앙 집중 + 사람 포함 → +5점
- **풍경**: 색상 다양성 + 적절한 복잡도 → +5점
- **추상**: 높은 채도 또는 패턴 → +5점
- **건축**: 대칭 + 구조적 스타일 → +5점

#### 5. 전문 사진 보너스
- 전문 사진으로 판단되면 +10점

### 파일: `AestheticAnalyzer_final.ts`

---

## 적용 방법

### 1. 타입 정의 업데이트
`shared/types.ts`에 다음 타입들을 추가하거나 확인하세요:

```typescript
export interface GoogleVisionResult {
  labels: Array<{ description: string; score: number }>;
  objects: Array<{
    name: string;
    score: number;
    boundingPoly?: {
      normalizedVertices?: Array<{ x: number; y: number }>;
    };
  }>;
  colors: Array<{
    color: { red: number; green: number; blue: number };
    score: number;
  }>;
  visionFilter?: {
    isSafe: boolean;
    hasPerson: boolean;
    isArtRelated: boolean;
  };
  aesthetic?: AestheticAnalysisResult;
}
```

### 2. 파일 교체
기존 `AestheticAnalyzer.ts`를 `AestheticAnalyzer_final.ts`의 내용으로 교체하세요.

### 3. Google Vision Service 확인
`google-vision.ts`에서 다음을 확인하세요:
- `colors` 배열이 제대로 추출되는지
- `objects`에 `boundingPoly` 정보가 포함되는지

### 4. 테스트
```typescript
const result = await googleVisionService.analyzeImage(imageBuffer);
console.log('Aesthetic Score:', result.aesthetic.aestheticScore);
console.log('Style Tags:', result.aesthetic.styleTags);
console.log('Mood Tags:', result.aesthetic.moodTags);
console.log('Context:', result.aesthetic.context);
console.log('Composition:', result.aesthetic.composition);
```

---

## 주요 개선 효과

### Before (원본)
- 단순 키워드 매칭
- 색상 정보 미활용
- 임의의 가중치 (근거 부족)
- 컨텍스트 무시

### After (최종)
- 의미론적 분석
- 색상 조화 분석 통합
- 신뢰도 기반 가중치
- 구도/구성 분석
- 컨텍스트 인지 점수 조정

### 점수 정확도 향상
- 초상화: 사람 포함 시 점수 상승
- 건축: 대칭성이 높게 평가됨
- 추상: 복잡도와 색상이 중요하게 평가됨
- 미니멀: 낮은 복잡도가 긍정적으로 평가됨

---

## 추가 개선 가능 항목 (향후)

1. **머신러닝 기반 가중치 학습**
   - 사용자 피드백을 통한 가중치 최적화

2. **장르별 특화 분석**
   - 패션, 음식, 제품 사진 등 특화 분석

3. **시간대/계절 감지**
   - 라벨에서 시간대나 계절 정보 추출 및 반영

4. **감정 분석 강화**
   - 더 세밀한 감정 키워드 매핑

5. **A/B 테스트**
   - 실제 사용자 선호도와 점수의 상관관계 분석
