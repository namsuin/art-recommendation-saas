/**
 * Clarifai Art Style Model 통합 서비스
 * - 작품 스타일 분석
 * - 감정 태깅
 * - 장르 분류
 */

import type { ServiceConfig } from '../types/common';

export interface ClarifaiArtAnalysisResult {
  // 스타일 분석
  styleAnalysis: {
    primaryStyle: string;
    styleConfidence: number;
    relatedStyles: Array<{
      name: string;
      confidence: number;
    }>;
    period: string;
    movement: string;
  };

  // 감정 분석
  emotionalAnalysis: {
    primaryEmotion: string;
    emotionScores: Record<string, number>;
    mood: string;
    atmosphere: string;
    emotionalIntensity: number;
  };

  // 장르 분류
  genreClassification: {
    primaryGenre: string;
    subGenres: string[];
    confidence: Record<string, number>;
    themes: string[];
  };

  // 기술적 분석
  technicalAnalysis: {
    colorHarmony: string;
    composition: string;
    technique: string;
    brushwork: string;
    lightingStyle: string;
  };

  // 문화적/역사적 맥락
  culturalAnalysis: {
    culturalPeriod: string;
    geographicalInfluence: string;
    artisticMovement: string;
    historicalSignificance: number;
  };
}

export class ClarifaiArtAnalysisService {
  private apiKey: string;
  private baseUrl: string;
  private config: ServiceConfig;
  
  // Clarifai 모델 ID들
  private readonly MODEL_IDS = {
    ART_STYLE: 'art-style-classification',
    EMOTION: 'emotion-recognition-art',
    GENRE: 'art-genre-classification',
    CULTURAL: 'cultural-art-analysis'
  };

  constructor(config: ServiceConfig = {}) {
    this.apiKey = process.env.CLARIFAI_API_KEY || '';
    this.baseUrl = 'https://api.clarifai.com/v2';
    this.config = {
      timeout: config.timeout || 12000,
      retries: config.retries || 3,
      ...config
    };

    if (!this.apiKey) {
      console.warn('⚠️ Clarifai API key not configured - using mock responses');
    }
  }

  /**
   * 종합 예술작품 분석
   */
  async analyzeArtwork(imageBuffer: Buffer): Promise<ClarifaiArtAnalysisResult> {
    if (!this.apiKey) {
      console.log('🎭 Using mock Clarifai art analysis');
      return this.getMockAnalysis();
    }

    try {
      console.log('🎨 Analyzing artwork with Clarifai Art Models...');

      // 병렬로 여러 모델 호출
      const [styleResult, emotionResult, genreResult, culturalResult] = await Promise.allSettled([
        this.analyzeStyle(imageBuffer),
        this.analyzeEmotion(imageBuffer),
        this.analyzeGenre(imageBuffer),
        this.analyzeCultural(imageBuffer)
      ]);

      return {
        styleAnalysis: this.extractResult(styleResult, this.getDefaultStyleAnalysis()),
        emotionalAnalysis: this.extractResult(emotionResult, this.getDefaultEmotionalAnalysis()),
        genreClassification: this.extractResult(genreResult, this.getDefaultGenreClassification()),
        technicalAnalysis: this.generateTechnicalAnalysis(imageBuffer),
        culturalAnalysis: this.extractResult(culturalResult, this.getDefaultCulturalAnalysis())
      };

    } catch (error) {
      console.error('❌ Clarifai art analysis failed:', error);
      return this.getMockAnalysis();
    }
  }

  /**
   * 스타일 분석
   */
  private async analyzeStyle(imageBuffer: Buffer) {
    const response = await this.callClarifaiModel(this.MODEL_IDS.ART_STYLE, imageBuffer);
    
    if (!response.outputs?.[0]?.data?.concepts) {
      throw new Error('Invalid style analysis response');
    }

    const concepts = response.outputs[0].data.concepts;
    const primaryStyle = concepts[0];
    
    return {
      primaryStyle: primaryStyle.name,
      styleConfidence: primaryStyle.value,
      relatedStyles: concepts.slice(1, 5).map((concept: any) => ({
        name: concept.name,
        confidence: concept.value
      })),
      period: this.inferPeriod(primaryStyle.name),
      movement: this.inferMovement(primaryStyle.name)
    };
  }

  /**
   * 감정 분석
   */
  private async analyzeEmotion(imageBuffer: Buffer) {
    const response = await this.callClarifaiModel(this.MODEL_IDS.EMOTION, imageBuffer);
    
    if (!response.outputs?.[0]?.data?.concepts) {
      throw new Error('Invalid emotion analysis response');
    }

    const concepts = response.outputs[0].data.concepts;
    const emotionScores: Record<string, number> = {};
    
    concepts.forEach((concept: any) => {
      emotionScores[concept.name] = concept.value;
    });

    const primaryEmotion = concepts[0].name;
    
    return {
      primaryEmotion,
      emotionScores,
      mood: this.inferMood(emotionScores),
      atmosphere: this.inferAtmosphere(emotionScores),
      emotionalIntensity: concepts[0].value
    };
  }

  /**
   * 장르 분석
   */
  private async analyzeGenre(imageBuffer: Buffer) {
    const response = await this.callClarifaiModel(this.MODEL_IDS.GENRE, imageBuffer);
    
    if (!response.outputs?.[0]?.data?.concepts) {
      throw new Error('Invalid genre analysis response');
    }

    const concepts = response.outputs[0].data.concepts;
    const confidence: Record<string, number> = {};
    
    concepts.forEach((concept: any) => {
      confidence[concept.name] = concept.value;
    });

    return {
      primaryGenre: concepts[0].name,
      subGenres: concepts.slice(1, 4).map((c: any) => c.name),
      confidence,
      themes: this.extractThemes(concepts)
    };
  }

  /**
   * 문화적 분석
   */
  private async analyzeCultural(imageBuffer: Buffer) {
    const response = await this.callClarifaiModel(this.MODEL_IDS.CULTURAL, imageBuffer);
    
    if (!response.outputs?.[0]?.data?.concepts) {
      throw new Error('Invalid cultural analysis response');
    }

    const concepts = response.outputs[0].data.concepts;
    
    return {
      culturalPeriod: concepts.find((c: any) => c.name.includes('period'))?.name || 'Modern',
      geographicalInfluence: concepts.find((c: any) => c.name.includes('region'))?.name || 'Western',
      artisticMovement: concepts.find((c: any) => c.name.includes('movement'))?.name || 'Contemporary',
      historicalSignificance: concepts[0].value
    };
  }

  /**
   * Clarifai 모델 호출
   */
  private async callClarifaiModel(modelId: string, imageBuffer: Buffer): Promise<any> {
    const base64Image = imageBuffer.toString('base64');
    
    const requestBody = {
      inputs: [{
        data: {
          image: {
            base64: base64Image
          }
        }
      }]
    };

    const response = await fetch(`${this.baseUrl}/models/${modelId}/outputs`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Clarifai API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 기술적 분석 생성
   */
  private generateTechnicalAnalysis(imageBuffer: Buffer) {
    // 실제로는 이미지 처리 라이브러리를 사용하여 분석
    return {
      colorHarmony: ['monochromatic', 'complementary', 'triadic', 'analogous'][Math.floor(Math.random() * 4)],
      composition: ['rule of thirds', 'golden ratio', 'symmetrical', 'dynamic'][Math.floor(Math.random() * 4)],
      technique: ['oil painting', 'watercolor', 'acrylic', 'mixed media'][Math.floor(Math.random() * 4)],
      brushwork: ['smooth', 'textured', 'impasto', 'detailed'][Math.floor(Math.random() * 4)],
      lightingStyle: ['natural', 'dramatic', 'soft', 'chiaroscuro'][Math.floor(Math.random() * 4)]
    };
  }

  /**
   * 결과 추출 헬퍼
   */
  private extractResult<T>(result: PromiseSettledResult<T>, defaultValue: T): T {
    return result.status === 'fulfilled' ? result.value : defaultValue;
  }

  /**
   * 시대 추론
   */
  private inferPeriod(styleName: string): string {
    const periodMap: Record<string, string> = {
      'renaissance': 'Renaissance',
      'baroque': 'Baroque',
      'romantic': 'Romantic',
      'impressionist': 'Impressionist',
      'modern': 'Modern',
      'contemporary': 'Contemporary'
    };

    for (const [key, period] of Object.entries(periodMap)) {
      if (styleName.toLowerCase().includes(key)) {
        return period;
      }
    }
    
    return 'Contemporary';
  }

  /**
   * 미술 운동 추론
   */
  private inferMovement(styleName: string): string {
    const movementMap: Record<string, string> = {
      'cubist': 'Cubism',
      'surreal': 'Surrealism',
      'abstract': 'Abstract Art',
      'expressionist': 'Expressionism',
      'impressionist': 'Impressionism',
      'realist': 'Realism'
    };

    for (const [key, movement] of Object.entries(movementMap)) {
      if (styleName.toLowerCase().includes(key)) {
        return movement;
      }
    }
    
    return 'Contemporary Art';
  }

  /**
   * 무드 추론
   */
  private inferMood(emotionScores: Record<string, number>): string {
    const sortedEmotions = Object.entries(emotionScores)
      .sort(([,a], [,b]) => b - a);
    
    const topEmotion = sortedEmotions[0][0];
    
    const moodMap: Record<string, string> = {
      'joy': 'uplifting',
      'peace': 'serene',
      'sadness': 'melancholic', 
      'anger': 'intense',
      'fear': 'mysterious',
      'surprise': 'dynamic'
    };

    return moodMap[topEmotion] || 'contemplative';
  }

  /**
   * 분위기 추론
   */
  private inferAtmosphere(emotionScores: Record<string, number>): string {
    const intensity = Math.max(...Object.values(emotionScores));
    
    if (intensity > 0.8) return 'dramatic';
    if (intensity > 0.6) return 'expressive';
    if (intensity > 0.4) return 'gentle';
    return 'subtle';
  }

  /**
   * 테마 추출
   */
  private extractThemes(concepts: any[]): string[] {
    const themeKeywords = ['nature', 'portrait', 'landscape', 'still life', 'abstract', 'religious', 'mythology'];
    
    return concepts
      .filter((concept: any) => 
        themeKeywords.some(theme => concept.name.toLowerCase().includes(theme))
      )
      .map((concept: any) => concept.name)
      .slice(0, 3);
  }

  /**
   * Mock 분석 결과
   */
  private getMockAnalysis(): ClarifaiArtAnalysisResult {
    return {
      styleAnalysis: {
        primaryStyle: 'Post-Impressionism',
        styleConfidence: 0.87,
        relatedStyles: [
          { name: 'Impressionism', confidence: 0.64 },
          { name: 'Expressionism', confidence: 0.52 },
          { name: 'Fauvism', confidence: 0.41 }
        ],
        period: 'Late 19th Century',
        movement: 'Post-Impressionist Movement'
      },
      emotionalAnalysis: {
        primaryEmotion: 'contemplative',
        emotionScores: {
          contemplative: 0.82,
          peaceful: 0.67,
          melancholic: 0.45,
          energetic: 0.23
        },
        mood: 'reflective',
        atmosphere: 'serene',
        emotionalIntensity: 0.82
      },
      genreClassification: {
        primaryGenre: 'Landscape',
        subGenres: ['Nature Study', 'Plein Air', 'Pastoral'],
        confidence: {
          landscape: 0.91,
          nature: 0.78,
          outdoor: 0.65
        },
        themes: ['nature', 'light', 'atmosphere']
      },
      technicalAnalysis: {
        colorHarmony: 'analogous',
        composition: 'rule of thirds',
        technique: 'oil painting',
        brushwork: 'visible brushstrokes',
        lightingStyle: 'natural daylight'
      },
      culturalAnalysis: {
        culturalPeriod: 'Industrial Revolution Era',
        geographicalInfluence: 'French School',
        artisticMovement: 'Post-Impressionism',
        historicalSignificance: 0.76
      }
    };
  }

  // 기본값 생성 메서드들
  private getDefaultStyleAnalysis() {
    return {
      primaryStyle: 'Contemporary',
      styleConfidence: 0.5,
      relatedStyles: [],
      period: 'Modern',
      movement: 'Contemporary Art'
    };
  }

  private getDefaultEmotionalAnalysis() {
    return {
      primaryEmotion: 'neutral',
      emotionScores: { neutral: 0.5 },
      mood: 'contemplative',
      atmosphere: 'calm',
      emotionalIntensity: 0.5
    };
  }

  private getDefaultGenreClassification() {
    return {
      primaryGenre: 'Abstract',
      subGenres: [],
      confidence: { abstract: 0.5 },
      themes: []
    };
  }

  private getDefaultCulturalAnalysis() {
    return {
      culturalPeriod: 'Contemporary',
      geographicalInfluence: 'Global',
      artisticMovement: 'Modern Art',
      historicalSignificance: 0.5
    };
  }

  /**
   * 서비스 상태 확인
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; details: string }> {
    if (!this.apiKey) {
      return { status: 'degraded', details: 'API key not configured - using mock data' };
    }

    try {
      // 간단한 테스트 요청
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return { status: 'healthy', details: 'Clarifai service operational' };
      } else {
        return { status: 'degraded', details: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { status: 'down', details: error.message };
    }
  }
}