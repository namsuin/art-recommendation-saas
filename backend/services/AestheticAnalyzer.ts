// ai-service/analyzers/aesthetic-analyzer.ts

import type { GoogleVisionResult } from '../../shared/types';

export type AestheticAnalysisResult = {
  aestheticScore: number;
  styleTags: string[];
  moodTags: string[];
  complexity: 'low' | 'medium' | 'high';
  isArtLike: boolean;
  colorAnalysis?: {
    diversity: number;
    saturation: number;
    brightness: number;
    dominantPalette: string;
  };
  confidence: number;
  composition?: CompositionAnalysis;
  context?: ImageContext; // NEW: 이미지 컨텍스트
};

interface CompositionAnalysis {
  hasSymmetry: boolean;
  centerFocus: boolean;
  objectDistribution: 'balanced' | 'scattered' | 'clustered';
  visualWeight: 'light' | 'medium' | 'heavy';
}

// NEW: 이미지 컨텍스트 타입
interface ImageContext {
  category: 'portrait' | 'landscape' | 'abstract' | 'architecture' | 'still-life' | 'general';
  hasHuman: boolean;
  isProfessionalPhoto: boolean;
  isArtwork: boolean;
}

interface ColorInfo {
  color: {
    red: number;
    green: number;
    blue: number;
  };
  score: number;
}

interface LabelAnnotation {
  description: string;
  score: number;
}

interface ObjectAnnotation {
  name: string;
  score: number;
  boundingPoly?: {
    normalizedVertices?: Array<{ x: number; y: number }>;
  };
}

export class AestheticAnalyzer {
  private static readonly CONFIDENCE_THRESHOLDS = {
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.4,
    MINIMUM: 0.3
  };

  private static readonly AESTHETIC_MAPPINGS = {
    composition: {
      keywords: ['symmetry', 'balance', 'pattern', 'texture', 'geometric', 'composition', 'structure'],
      styleTag: 'structured',
      weight: 1.2
    },
    artistic: {
      keywords: ['art', 'painting', 'drawing', 'illustration', 'artwork', 'artistic', 'creative'],
      styleTag: 'artistic',
      weight: 1.5
    },
    emotion: {
      keywords: ['beautiful', 'elegant', 'peaceful', 'dramatic', 'serene', 'majestic', 'graceful'],
      moodTag: 'expressive',
      weight: 1.3
    },
    style_modern: {
      keywords: ['modern', 'contemporary', 'minimalist', 'clean', 'sleek'],
      styleTag: 'modern',
      weight: 1.0
    },
    style_classic: {
      keywords: ['vintage', 'classic', 'traditional', 'antique', 'retro', 'ornate'],
      styleTag: 'classic',
      weight: 1.0
    },
    nature: {
      keywords: ['nature', 'natural', 'organic', 'landscape', 'flora', 'fauna'],
      moodTag: 'natural',
      weight: 0.8
    },
    urban: {
      keywords: ['urban', 'city', 'architecture', 'building', 'street'],
      styleTag: 'urban',
      weight: 0.7
    }
  };

  private static readonly MOOD_MAPPINGS = {
    brightness: {
      keywords: ['bright', 'light', 'luminous', 'sunny', 'radiant'],
      tag: 'bright'
    },
    darkness: {
      keywords: ['dark', 'shadow', 'noir', 'moody', 'dim'],
      tag: 'dark'
    },
    energy: {
      keywords: ['dynamic', 'energetic', 'vibrant', 'lively', 'active'],
      tag: 'energetic'
    },
    calmness: {
      keywords: ['calm', 'peaceful', 'tranquil', 'quiet', 'serene', 'soft'],
      tag: 'calm'
    },
    drama: {
      keywords: ['dramatic', 'intense', 'bold', 'striking', 'powerful'],
      tag: 'dramatic'
    }
  };

  static analyze(vision: GoogleVisionResult): AestheticAnalysisResult {
    const labels = vision.labels ?? [];
    const objects = vision.objects ?? [];
    const colors = vision.colors ?? [];

    // 이미지 컨텍스트 파악 (NEW)
    const context = this.determineImageContext(labels, objects, vision);

    // 전체 신뢰도 계산
    const overallConfidence = this.calculateOverallConfidence(labels, objects);

    // 색상 분석
    const colorAnalysis = this.analyzeColorHarmony(colors);

    // 구도 분석
    const composition = this.analyzeComposition(objects as ObjectAnnotation[], labels);

    // 스타일 태그 추출 (컨텍스트 반영)
    const { styleTags, styleScore } = this.extractStyleTags(labels, composition, context);

    // 무드 태그 추출
    const { moodTags, moodScore } = this.extractMoodTags(labels, colorAnalysis);

    // 복잡도 판단
    const complexity = this.calculateComplexity(labels, objects, colorAnalysis);

    // 미적 점수 계산 (컨텍스트 기반 조정)
    const score = this.calculateAestheticScore({
      vision,
      styleTags,
      moodTags,
      styleScore,
      moodScore,
      complexity,
      colorAnalysis,
      labels,
      objects,
      overallConfidence,
      composition,
      context
    });

    return {
      aestheticScore: score,
      styleTags: Array.from(styleTags),
      moodTags: Array.from(moodTags),
      complexity,
      isArtLike: score >= 60,
      colorAnalysis,
      confidence: overallConfidence,
      composition,
      context
    };
  }

  /**
   * 이미지 컨텍스트 파악 (NEW)
   */
  private static determineImageContext(
    labels: LabelAnnotation[],
    objects: ObjectAnnotation[],
    vision: GoogleVisionResult
  ): ImageContext {
    const labelTexts = labels.map(l => l.description.toLowerCase());
    const highConfidenceLabels = labels
      .filter(l => l.score > this.CONFIDENCE_THRESHOLDS.MEDIUM)
      .map(l => l.description.toLowerCase());

    // 카테고리 결정
    let category: ImageContext['category'] = 'general';

    // 초상화 감지
    const portraitKeywords = ['portrait', 'selfie', 'face', 'headshot', 'person'];
    const hasPortraitLabel = highConfidenceLabels.some(l => 
      portraitKeywords.some(k => l.includes(k))
    );
    const hasPersonObject = objects.some(o => 
      o.name.toLowerCase().includes('person') && o.score > 0.7
    );
    if (hasPortraitLabel || (hasPersonObject && objects.length <= 2)) {
      category = 'portrait';
    }

    // 풍경 감지
    const landscapeKeywords = ['landscape', 'nature', 'mountain', 'sky', 'ocean', 'sunset', 'sunrise'];
    if (highConfidenceLabels.some(l => landscapeKeywords.some(k => l.includes(k)))) {
      category = 'landscape';
    }

    // 추상 예술 감지
    const abstractKeywords = ['abstract', 'pattern', 'texture', 'geometric'];
    if (highConfidenceLabels.some(l => abstractKeywords.some(k => l.includes(k)))) {
      category = 'abstract';
    }

    // 건축 감지
    const architectureKeywords = ['architecture', 'building', 'structure', 'facade', 'interior'];
    if (highConfidenceLabels.some(l => architectureKeywords.some(k => l.includes(k)))) {
      category = 'architecture';
    }

    // 정물화 감지
    const stillLifeKeywords = ['still life', 'product', 'food', 'flower', 'vase', 'table'];
    if (highConfidenceLabels.some(l => stillLifeKeywords.some(k => l.includes(k)))) {
      category = 'still-life';
    }

    // 사람 포함 여부
    const hasHuman = vision.visionFilter?.hasPerson || 
                     objects.some(o => o.name.toLowerCase().includes('person'));

    // 전문 사진 여부
    const photographyKeywords = ['photograph', 'photography', 'photo', 'camera', 'professional'];
    const isProfessionalPhoto = highConfidenceLabels.some(l => 
      photographyKeywords.some(k => l.includes(k))
    );

    // 예술 작품 여부
    const isArtwork = vision.visionFilter?.isArtRelated || false;

    return {
      category,
      hasHuman,
      isProfessionalPhoto,
      isArtwork
    };
  }

  /**
   * 구도/구성 분석
   */
  private static analyzeComposition(
    objects: ObjectAnnotation[],
    labels: LabelAnnotation[]
  ): CompositionAnalysis {
    const hasSymmetry = this.checkSymmetry(objects, labels);
    const centerFocus = this.checkCenterFocus(objects);
    const objectDistribution = this.analyzeObjectDistribution(objects);
    const visualWeight = this.calculateVisualWeight(objects, labels);

    return {
      hasSymmetry,
      centerFocus,
      objectDistribution,
      visualWeight
    };
  }

  private static checkSymmetry(
    objects: ObjectAnnotation[],
    labels: LabelAnnotation[]
  ): boolean {
    const symmetryKeywords = ['symmetry', 'symmetric', 'symmetrical', 'balanced', 'mirror'];
    const hasSymmetryLabel = labels.some(l => 
      symmetryKeywords.some(keyword => 
        l.description.toLowerCase().includes(keyword) && l.score > 0.6
      )
    );

    if (hasSymmetryLabel) return true;

    if (objects.length < 2) return false;

    const centerX = 0.5;
    let leftCount = 0;
    let rightCount = 0;

    objects.forEach(obj => {
      if (!obj.boundingPoly?.normalizedVertices) return;

      const vertices = obj.boundingPoly.normalizedVertices;
      const objCenterX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;

      if (objCenterX < centerX) leftCount++;
      else rightCount++;
    });

    const ratio = Math.min(leftCount, rightCount) / Math.max(leftCount, rightCount);
    return ratio > 0.7;
  }

  private static checkCenterFocus(objects: ObjectAnnotation[]): boolean {
    if (objects.length === 0) return false;

    const centerX = 0.5;
    const centerY = 0.5;
    const centerThreshold = 0.3;

    let centerObjects = 0;

    objects.forEach(obj => {
      if (!obj.boundingPoly?.normalizedVertices) return;

      const vertices = obj.boundingPoly.normalizedVertices;
      const objCenterX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
      const objCenterY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;

      const distanceFromCenter = Math.sqrt(
        Math.pow(objCenterX - centerX, 2) + 
        Math.pow(objCenterY - centerY, 2)
      );

      if (distanceFromCenter < centerThreshold) {
        centerObjects++;
      }
    });

    return centerObjects / objects.length > 0.5;
  }

  private static analyzeObjectDistribution(
    objects: ObjectAnnotation[]
  ): 'balanced' | 'scattered' | 'clustered' {
    if (objects.length < 2) return 'scattered';

    const positions: Array<{ x: number; y: number }> = [];

    objects.forEach(obj => {
      if (!obj.boundingPoly?.normalizedVertices) return;

      const vertices = obj.boundingPoly.normalizedVertices;
      const centerX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
      const centerY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;

      positions.push({ x: centerX, y: centerY });
    });

    if (positions.length < 2) return 'scattered';

    let totalDistance = 0;
    let pairCount = 0;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const distance = Math.sqrt(
          Math.pow(positions[i].x - positions[j].x, 2) +
          Math.pow(positions[i].y - positions[j].y, 2)
        );
        totalDistance += distance;
        pairCount++;
      }
    }

    const avgDistance = totalDistance / pairCount;

    let variance = 0;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const distance = Math.sqrt(
          Math.pow(positions[i].x - positions[j].x, 2) +
          Math.pow(positions[i].y - positions[j].y, 2)
        );
        variance += Math.pow(distance - avgDistance, 2);
      }
    }
    variance /= pairCount;

    if (avgDistance < 0.3) return 'clustered';
    if (variance < 0.05) return 'balanced';
    return 'scattered';
  }

  private static calculateVisualWeight(
    objects: ObjectAnnotation[],
    labels: LabelAnnotation[]
  ): 'light' | 'medium' | 'heavy' {
    let weightScore = 0;

    weightScore += objects.length * 5;

    const heavyKeywords = ['dense', 'heavy', 'crowded', 'busy', 'complex', 'detailed'];
    const lightKeywords = ['minimal', 'simple', 'clean', 'sparse', 'empty', 'light'];

    labels.forEach(l => {
      const desc = l.description.toLowerCase();
      if (heavyKeywords.some(k => desc.includes(k)) && l.score > 0.6) {
        weightScore += 15;
      }
      if (lightKeywords.some(k => desc.includes(k)) && l.score > 0.6) {
        weightScore -= 10;
      }
    });

    objects.forEach(obj => {
      if (!obj.boundingPoly?.normalizedVertices) return;

      const vertices = obj.boundingPoly.normalizedVertices;
      const width = Math.max(...vertices.map(v => v.x)) - Math.min(...vertices.map(v => v.x));
      const height = Math.max(...vertices.map(v => v.y)) - Math.min(...vertices.map(v => v.y));
      const area = width * height;

      weightScore += area * 30;
    });

    if (weightScore > 50) return 'heavy';
    if (weightScore > 20) return 'medium';
    return 'light';
  }

  private static calculateOverallConfidence(
    labels: LabelAnnotation[],
    objects: any[]
  ): number {
    if (labels.length === 0 && objects.length === 0) return 0;

    const topLabels = labels
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    const labelConfidence = topLabels.length > 0
      ? topLabels.reduce((sum, l) => sum + l.score, 0) / topLabels.length
      : 0;

    const objectConfidence = objects.length > 0
      ? objects.reduce((sum, o) => sum + (o.score || 0), 0) / objects.length
      : 0;

    const labelWeight = 0.7;
    const objectWeight = 0.3;

    const overallConfidence = 
      (labelConfidence * labelWeight) + (objectConfidence * objectWeight);

    return Math.round(overallConfidence * 100);
  }

  /**
   * 스타일 태그 추출 (컨텍스트 반영)
   */
  private static extractStyleTags(
    labels: LabelAnnotation[],
    composition: CompositionAnalysis,
    context: ImageContext
  ): {
    styleTags: Set<string>;
    styleScore: number;
  } {
    const styleTags = new Set<string>();
    const tagScores = new Map<string, number>();
    let totalScore = 0;

    labels.forEach(label => {
      const desc = label.description.toLowerCase();
      const confidence = label.score;

      if (confidence < this.CONFIDENCE_THRESHOLDS.MINIMUM) return;

      let confidenceMultiplier = 1.0;
      if (confidence >= this.CONFIDENCE_THRESHOLDS.HIGH) {
        confidenceMultiplier = 1.5;
      } else if (confidence >= this.CONFIDENCE_THRESHOLDS.MEDIUM) {
        confidenceMultiplier = 1.2;
      } else if (confidence >= this.CONFIDENCE_THRESHOLDS.LOW) {
        confidenceMultiplier = 0.8;
      } else {
        confidenceMultiplier = 0.5;
      }

      Object.entries(this.AESTHETIC_MAPPINGS).forEach(([category, mapping]) => {
        const hasMatch = mapping.keywords.some(keyword => desc.includes(keyword));
        
        if (hasMatch && mapping.styleTag) {
          let score = confidence * mapping.weight * confidenceMultiplier * 10;
          
          // 컨텍스트 기반 가중치 조정 (NEW)
          if (context.category === 'architecture' && mapping.styleTag === 'structured') {
            score *= 1.3; // 건축 사진에서 구조적 특성은 중요
          }
          if (context.isArtwork && mapping.styleTag === 'artistic') {
            score *= 1.4; // 예술 작품에서 예술적 특성 강조
          }
          
          const currentScore = tagScores.get(mapping.styleTag) || 0;
          tagScores.set(mapping.styleTag, currentScore + score);
          
          totalScore += score;
        }
      });

      const directStyles = [
        'abstract', 'minimal', 'surreal', 'illustration', 
        'painting', 'sketch', 'photograph', 'watercolor', 'oil painting'
      ];

      directStyles.forEach(style => {
        if (desc.includes(style)) {
          let score = confidence * confidenceMultiplier * 12;
          
          // 컨텍스트 조정
          if (context.isProfessionalPhoto && style === 'photograph') {
            score *= 1.3;
          }
          
          const currentScore = tagScores.get(style) || 0;
          tagScores.set(style, currentScore + score);
          
          totalScore += score;
        }
      });
    });

    // 구도 기반 스타일 태그 추가
    if (composition.hasSymmetry) {
      tagScores.set('symmetric', 8);
      totalScore += 8;
    }

    if (composition.objectDistribution === 'balanced') {
      tagScores.set('balanced', 7);
      totalScore += 7;
    }

    if (composition.visualWeight === 'light') {
      tagScores.set('minimal', (tagScores.get('minimal') || 0) + 6);
      totalScore += 6;
    }

    // 컨텍스트 기반 스타일 태그 (NEW)
    if (context.category === 'portrait') {
      tagScores.set('portrait', 10);
      totalScore += 10;
    }

    const SCORE_THRESHOLD = 5;
    tagScores.forEach((score, tag) => {
      if (score >= SCORE_THRESHOLD) {
        styleTags.add(tag);
      }
    });

    return { styleTags, styleScore: totalScore };
  }

  private static extractMoodTags(
    labels: LabelAnnotation[], 
    colorAnalysis: ReturnType<typeof this.analyzeColorHarmony>
  ): {
    moodTags: Set<string>;
    moodScore: number;
  } {
    const moodTags = new Set<string>();
    const tagScores = new Map<string, number>();
    let totalScore = 0;

    labels.forEach(label => {
      const desc = label.description.toLowerCase();
      const confidence = label.score;

      if (confidence < this.CONFIDENCE_THRESHOLDS.MINIMUM) return;

      let confidenceMultiplier = 1.0;
      if (confidence >= this.CONFIDENCE_THRESHOLDS.HIGH) {
        confidenceMultiplier = 1.4;
      } else if (confidence >= this.CONFIDENCE_THRESHOLDS.MEDIUM) {
        confidenceMultiplier = 1.1;
      } else if (confidence >= this.CONFIDENCE_THRESHOLDS.LOW) {
        confidenceMultiplier = 0.7;
      } else {
        confidenceMultiplier = 0.4;
      }

      Object.entries(this.MOOD_MAPPINGS).forEach(([category, mapping]) => {
        const hasMatch = mapping.keywords.some(keyword => desc.includes(keyword));
        
        if (hasMatch) {
          const score = confidence * confidenceMultiplier * 8;
          
          const currentScore = tagScores.get(mapping.tag) || 0;
          tagScores.set(mapping.tag, currentScore + score);
          
          totalScore += score;
        }
      });
    });

    const addColorMood = (tag: string, score: number) => {
      const currentScore = tagScores.get(tag) || 0;
      tagScores.set(tag, currentScore + score);
      totalScore += score;
    };

    if (colorAnalysis.brightness > 70) addColorMood('bright', 6);
    if (colorAnalysis.brightness < 30) addColorMood('dark', 6);
    if (colorAnalysis.saturation > 70) addColorMood('vibrant', 7);
    if (colorAnalysis.saturation < 30) addColorMood('muted', 5);
    if (colorAnalysis.diversity > 70) addColorMood('colorful', 6);
    if (colorAnalysis.diversity < 30) addColorMood('monochromatic', 5);

    if (colorAnalysis.dominantPalette === 'warm') addColorMood('warm', 5);
    if (colorAnalysis.dominantPalette === 'cool') addColorMood('cool', 5);

    const SCORE_THRESHOLD = 4;
    tagScores.forEach((score, tag) => {
      if (score >= SCORE_THRESHOLD) {
        moodTags.add(tag);
      }
    });

    return { moodTags, moodScore: totalScore };
  }

  private static calculateComplexity(
    labels: LabelAnnotation[],
    objects: any[],
    colorAnalysis: ReturnType<typeof this.analyzeColorHarmony>
  ): 'low' | 'medium' | 'high' {
    const highConfidenceLabels = labels.filter(
      l => l.score >= this.CONFIDENCE_THRESHOLDS.MEDIUM
    ).length;
    
    const mediumConfidenceLabels = labels.filter(
      l => l.score >= this.CONFIDENCE_THRESHOLDS.LOW && 
           l.score < this.CONFIDENCE_THRESHOLDS.MEDIUM
    ).length;

    const weightedLabelCount = 
      (highConfidenceLabels * 1.5) + 
      (mediumConfidenceLabels * 0.8);

    const signalCount = weightedLabelCount + objects.length;
    const colorDiversity = colorAnalysis.diversity;

    const complexityScore = signalCount * 1.5 + (colorDiversity / 10);

    if (complexityScore > 20) return 'high';
    if (complexityScore > 12) return 'medium';
    return 'low';
  }

  /**
   * 미적 점수 계산 (컨텍스트 기반 조정 강화)
   */
  private static calculateAestheticScore(params: {
    vision: GoogleVisionResult;
    styleTags: Set<string>;
    moodTags: Set<string>;
    styleScore: number;
    moodScore: number;
    complexity: 'low' | 'medium' | 'high';
    colorAnalysis: ReturnType<typeof this.analyzeColorHarmony>;
    labels: LabelAnnotation[];
    objects: any[];
    overallConfidence: number;
    composition: CompositionAnalysis;
    context: ImageContext;
  }): number {
    const {
      vision,
      styleTags,
      moodTags,
      styleScore,
      moodScore,
      complexity,
      colorAnalysis,
      overallConfidence,
      composition,
      context
    } = params;

    let score = 50;

    // 1. 예술 관련 신호
    if (vision.visionFilter?.isArtRelated) {
      score += 15;
    }

    // 2. 사람 포함 여부 (컨텍스트 기반 조정) - NEW
    if (context.hasHuman) {
      // 초상화에서는 사람 포함이 긍정적
      if (context.category === 'portrait') {
        score += 10;
      }
      // 풍경이나 건축에서는 사람이 방해 요소일 수 있음
      else if (context.category === 'landscape' || context.category === 'architecture') {
        score -= 3;
      }
      // 정물화나 추상에서는 부정적
      else if (context.category === 'still-life' || context.category === 'abstract') {
        score -= 8;
      }
      // 일반적인 경우 약간 부정적
      else {
        score -= 5;
      }
    }

    // 3. 스타일/무드 점수 반영
    const confidenceAdjustment = overallConfidence / 100;
    score += Math.min(styleScore * confidenceAdjustment, 20);
    score += Math.min(moodScore * confidenceAdjustment, 15);

    // 4. 복잡도 보정 (컨텍스트 고려) - NEW
    if (complexity === 'high') {
      // 추상 예술이나 패턴에서는 높은 복잡도가 긍정적
      score += context.category === 'abstract' ? 8 : 5;
    }
    if (complexity === 'medium') {
      score += 3;
    }
    if (complexity === 'low') {
      // 미니멀 스타일에서는 낮은 복잡도가 긍정적
      score += styleTags.has('minimal') ? 2 : -3;
    }

    // 5. 색상 조화 점수
    if (colorAnalysis.diversity > 40 && colorAnalysis.diversity < 80) {
      score += 8;
    }
    
    if (colorAnalysis.saturation > 60) {
      score += 5;
    }
    
    if (colorAnalysis.brightness > 30 && colorAnalysis.brightness < 80) {
      score += 5;
    }

    // 6. 특별 보너스
    if (styleTags.size >= 3 && moodTags.size >= 3) {
      score += 8;
    }

    // 7. 구도 점수 (컨텍스트 기반 조정) - NEW
    if (composition.hasSymmetry) {
      // 건축과 정물화에서 대칭은 매우 중요
      score += (context.category === 'architecture' || context.category === 'still-life') ? 12 : 8;
    }
    
    if (composition.centerFocus) {
      // 초상화와 정물화에서 중앙 집중은 중요
      score += (context.category === 'portrait' || context.category === 'still-life') ? 8 : 5;
    }
    
    if (composition.objectDistribution === 'balanced') {
      score += 7;
    }
    
    if (composition.visualWeight === 'medium') {
      score += 3;
    }

    // 8. 전문 사진 보너스 (NEW)
    if (context.isProfessionalPhoto) {
      score += 10;
    }

    // 9. 카테고리별 특별 보너스 (NEW)
    switch (context.category) {
      case 'portrait':
        // 초상화는 중앙 집중과 사람 포함이 중요
        if (composition.centerFocus && context.hasHuman) score += 5;
        break;
      case 'landscape':
        // 풍경은 색상 다양성과 복잡도가 중요
        if (colorAnalysis.diversity > 60 && complexity !== 'low') score += 5;
        break;
      case 'abstract':
        // 추상은 색상 조화와 패턴이 중요
        if (colorAnalysis.saturation > 50 || styleTags.has('pattern')) score += 5;
        break;
      case 'architecture':
        // 건축은 대칭과 구조가 중요
        if (composition.hasSymmetry && styleTags.has('structured')) score += 5;
        break;
    }

    // 10. 전체 신뢰도 보정
    if (overallConfidence < 50) {
      score *= 0.9;
    } else if (overallConfidence > 80) {
      score *= 1.05;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 색상 조화 분석
   */
  private static analyzeColorHarmony(colors: ColorInfo[]): {
    diversity: number;
    saturation: number;
    brightness: number;
    dominantPalette: string;
  } {
    if (!colors || colors.length === 0) {
      return {
        diversity: 0,
        saturation: 0,
        brightness: 50,
        dominantPalette: 'neutral'
      };
    }

    const uniqueHues = new Set<number>();
    let totalSaturation = 0;
    let totalBrightness = 0;
    let warmCount = 0;
    let coolCount = 0;

    colors.forEach(colorInfo => {
      const { red, green, blue } = colorInfo.color;
      
      const hue = this.rgbToHue(red, green, blue);
      uniqueHues.add(Math.floor(hue / 30));
      
      const saturation = this.rgbToSaturation(red, green, blue);
      totalSaturation += saturation * colorInfo.score;
      
      const brightness = (red + green + blue) / 3;
      totalBrightness += brightness * colorInfo.score;
      
      if (hue >= 0 && hue < 60 || hue >= 300) {
        warmCount += colorInfo.score;
      } else if (hue >= 150 && hue < 270) {
        coolCount += colorInfo.score;
      }
    });

    const totalWeight = colors.reduce((sum, c) => sum + c.score, 0);
    const diversity = Math.min(100, (uniqueHues.size / 12) * 100);
    const avgSaturation = (totalSaturation / totalWeight) * 100;
    const avgBrightness = (totalBrightness / totalWeight) / 255 * 100;

    let dominantPalette: string;
    if (warmCount > coolCount * 1.5) {
      dominantPalette = 'warm';
    } else if (coolCount > warmCount * 1.5) {
      dominantPalette = 'cool';
    } else if (avgSaturation > 60) {
      dominantPalette = 'vibrant';
    } else {
      dominantPalette = 'neutral';
    }

    return {
      diversity: Math.round(diversity),
      saturation: Math.round(avgSaturation),
      brightness: Math.round(avgBrightness),
      dominantPalette
    };
  }

  private static rgbToHue(r: number, g: number, b: number): number {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    if (diff === 0) return 0;

    let hue = 0;
    if (max === r) {
      hue = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      hue = ((b - r) / diff + 2) / 6;
    } else {
      hue = ((r - g) / diff + 4) / 6;
    }

    return hue * 360;
  }

  private static rgbToSaturation(r: number, g: number, b: number): number {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    if (max === 0) return 0;

    return (max - min) / max;
  }
}
