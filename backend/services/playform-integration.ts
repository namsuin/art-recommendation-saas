/**
 * Playform.io 스타일 분석 통합 서비스
 * - 이미지 생성 및 스타일 분석
 * - AI 기반 작품 스타일 태깅
 * - 창의적 변형 분석
 */

import type { ServiceConfig } from '../types/common';

export interface PlayformAnalysisResult {
  // 스타일 분석
  styleAnalysis: {
    primaryStyle: string;
    styleConfidence: number;
    subStyles: Array<{
      name: string;
      confidence: number;
      characteristics: string[];
    }>;
    artisticInfluences: string[];
    generativeCapabilities: {
      canGenerate: boolean;
      suggestedPrompts: string[];
      styleStrength: number;
    };
  };

  // 창의적 요소 분석
  creativeElements: {
    innovation: number; // 0-1 scale
    uniqueness: number;
    creativity: number;
    technicalSkill: number;
    composition: {
      balance: number;
      harmony: number;
      contrast: number;
      rhythm: number;
    };
  };

  // 색상 및 형태 분석
  visualCharacteristics: {
    colorProfile: {
      dominantHues: string[];
      saturationLevel: 'low' | 'medium' | 'high';
      brightnessLevel: 'dark' | 'medium' | 'bright';
      colorHarmony: string;
      emotionalImpact: string;
    };
    formAnalysis: {
      shapes: string[];
      lines: 'curved' | 'straight' | 'mixed';
      texture: string;
      depth: 'flat' | '2d' | '3d';
      movement: 'static' | 'dynamic';
    };
  };

  // 장르 및 테마
  genreClassification: {
    primaryGenre: string;
    subGenres: string[];
    themes: Array<{
      theme: string;
      confidence: number;
      description: string;
    }>;
    mood: string;
    atmosphere: string;
  };

  // 기술적 분석
  technicalAnalysis: {
    medium: string;
    technique: string[];
    complexity: 'simple' | 'moderate' | 'complex';
    craftsmanship: number; // 0-1 scale
    innovation: string[];
  };

  // 생성형 AI 인사이트
  aiInsights: {
    generationPotential: {
      score: number;
      reasons: string[];
      suggestedModifications: string[];
    };
    styleTransferability: {
      canTransfer: boolean;
      targetStyles: string[];
      difficulty: 'easy' | 'moderate' | 'hard';
    };
    creativeSuggestions: Array<{
      type: 'variation' | 'enhancement' | 'style_mix';
      description: string;
      confidence: number;
    }>;
  };
}

export class PlayformService {
  private apiKey: string;
  private baseUrl: string;
  private config: ServiceConfig;

  // Playform.io API 엔드포인트들
  private readonly ENDPOINTS = {
    ANALYZE_STYLE: '/v1/analyze/style',
    ANALYZE_CREATIVE: '/v1/analyze/creative',
    ANALYZE_TECHNICAL: '/v1/analyze/technical',
    GENERATE_INSIGHTS: '/v1/insights/generate',
    STYLE_TRANSFER: '/v1/style/transfer'
  };

  constructor(config: ServiceConfig = {}) {
    this.apiKey = process.env.PLAYFORM_API_KEY || '';
    this.baseUrl = process.env.PLAYFORM_BASE_URL || 'https://api.playform.io';
    this.config = {
      timeout: config.timeout || 20000,
      retries: config.retries || 3,
      ...config
    };

    if (!this.apiKey) {
      logger.warn('⚠️ Playform.io API key not configured - using mock responses');
    }
  }

  /**
   * 종합적인 스타일 분석
   */
  async analyzeArtwork(imageBuffer: Buffer): Promise<PlayformAnalysisResult> {
    if (!this.apiKey) {
      logger.info('🎨 Using mock Playform analysis');
      return this.getMockAnalysis();
    }

    try {
      logger.info('🚀 Analyzing artwork with Playform.io...');

      const formData = new FormData();
      formData.append('image', new Blob([imageBuffer]), 'artwork.jpg');
      formData.append('analysis_type', 'comprehensive');
      formData.append('include_generation_insights', 'true');

      // 병렬로 다양한 분석 수행
      const [
        styleResult,
        creativeResult,
        technicalResult,
        insightsResult
      ] = await Promise.allSettled([
        this.analyzeStyle(formData),
        this.analyzeCreativeElements(formData),
        this.analyzeTechnicalAspects(formData),
        this.generateAIInsights(formData)
      ]);

      return this.combineResults({
        style: styleResult,
        creative: creativeResult,
        technical: technicalResult,
        insights: insightsResult
      });

    } catch (error) {
      logger.error('❌ Playform analysis failed:', error);
      return this.getMockAnalysis();
    }
  }

  /**
   * 스타일 분석
   */
  private async analyzeStyle(formData: FormData) {
    const response = await this.makeRequest(this.ENDPOINTS.ANALYZE_STYLE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      },
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Playform style analysis error: ${result.message || response.statusText}`);
    }

    return {
      primaryStyle: result.primary_style?.name || 'Unknown',
      styleConfidence: result.primary_style?.confidence || 0,
      subStyles: result.sub_styles?.map((style: any) => ({
        name: style.name,
        confidence: style.confidence,
        characteristics: style.characteristics || []
      })) || [],
      artisticInfluences: result.artistic_influences || [],
      generativeCapabilities: {
        canGenerate: result.generative?.can_generate || false,
        suggestedPrompts: result.generative?.suggested_prompts || [],
        styleStrength: result.generative?.style_strength || 0
      }
    };
  }

  /**
   * 창의적 요소 분석
   */
  private async analyzeCreativeElements(formData: FormData) {
    const response = await this.makeRequest(this.ENDPOINTS.ANALYZE_CREATIVE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      },
      body: formData
    });

    const result = await response.json();

    return {
      innovation: result.scores?.innovation || 0,
      uniqueness: result.scores?.uniqueness || 0,
      creativity: result.scores?.creativity || 0,
      technicalSkill: result.scores?.technical_skill || 0,
      composition: {
        balance: result.composition?.balance || 0,
        harmony: result.composition?.harmony || 0,
        contrast: result.composition?.contrast || 0,
        rhythm: result.composition?.rhythm || 0
      }
    };
  }

  /**
   * 기술적 분석
   */
  private async analyzeTechnicalAspects(formData: FormData) {
    const response = await this.makeRequest(this.ENDPOINTS.ANALYZE_TECHNICAL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      },
      body: formData
    });

    const result = await response.json();

    return {
      medium: result.medium || 'Unknown',
      technique: result.techniques || [],
      complexity: result.complexity || 'moderate',
      craftsmanship: result.craftsmanship_score || 0,
      innovation: result.innovations || []
    };
  }

  /**
   * AI 인사이트 생성
   */
  private async generateAIInsights(formData: FormData) {
    const response = await this.makeRequest(this.ENDPOINTS.GENERATE_INSIGHTS, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      },
      body: formData
    });

    const result = await response.json();

    return {
      generationPotential: {
        score: result.generation?.potential_score || 0,
        reasons: result.generation?.reasons || [],
        suggestedModifications: result.generation?.suggested_modifications || []
      },
      styleTransferability: {
        canTransfer: result.style_transfer?.can_transfer || false,
        targetStyles: result.style_transfer?.target_styles || [],
        difficulty: result.style_transfer?.difficulty || 'moderate'
      },
      creativeSuggestions: result.creative_suggestions?.map((suggestion: any) => ({
        type: suggestion.type,
        description: suggestion.description,
        confidence: suggestion.confidence
      })) || []
    };
  }

  /**
   * 스타일 기반 유사 작품 생성
   */
  async generateSimilarStyles(
    imageBuffer: Buffer,
    targetStyle: string,
    variations: number = 3
  ): Promise<Array<{
    imageUrl: string;
    styleDescription: string;
    confidence: number;
    generationParams: any;
  }>> {
    if (!this.apiKey) {
      return this.getMockGeneratedStyles();
    }

    try {
      const formData = new FormData();
      formData.append('image', new Blob([imageBuffer]), 'source.jpg');
      formData.append('target_style', targetStyle);
      formData.append('variations', variations.toString());

      const response = await this.makeRequest(this.ENDPOINTS.STYLE_TRANSFER, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        body: formData
      });

      const result = await response.json();

      return result.generated_images?.map((image: any) => ({
        imageUrl: image.url,
        styleDescription: image.style_description,
        confidence: image.confidence,
        generationParams: image.params
      })) || [];

    } catch (error) {
      logger.error('❌ Style generation failed:', error);
      return this.getMockGeneratedStyles();
    }
  }

  /**
   * HTTP 요청 헬퍼
   */
  private async makeRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.baseUrl + endpoint, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 결과 통합
   */
  private combineResults(results: any): PlayformAnalysisResult {
    return {
      styleAnalysis: this.extractResult(results.style, this.getDefaultStyleAnalysis()),
      creativeElements: this.extractResult(results.creative, this.getDefaultCreativeElements()),
      visualCharacteristics: this.generateVisualCharacteristics(),
      genreClassification: this.generateGenreClassification(),
      technicalAnalysis: this.extractResult(results.technical, this.getDefaultTechnicalAnalysis()),
      aiInsights: this.extractResult(results.insights, this.getDefaultAIInsights())
    };
  }

  /**
   * 시각적 특성 생성
   */
  private generateVisualCharacteristics() {
    return {
      colorProfile: {
        dominantHues: ['blue', 'purple', 'gold'],
        saturationLevel: 'high' as const,
        brightnessLevel: 'medium' as const,
        colorHarmony: 'complementary',
        emotionalImpact: 'energetic'
      },
      formAnalysis: {
        shapes: ['organic', 'geometric'],
        lines: 'mixed' as const,
        texture: 'smooth with rough accents',
        depth: '3d' as const,
        movement: 'dynamic' as const
      }
    };
  }

  /**
   * 장르 분류 생성
   */
  private generateGenreClassification() {
    return {
      primaryGenre: 'Contemporary Abstract',
      subGenres: ['Digital Art', 'Mixed Media'],
      themes: [
        {
          theme: 'Technology and Nature',
          confidence: 0.85,
          description: 'Fusion of organic and digital elements'
        },
        {
          theme: 'Movement and Energy',
          confidence: 0.78,
          description: 'Dynamic visual flow and rhythm'
        }
      ],
      mood: 'energetic',
      atmosphere: 'futuristic'
    };
  }

  /**
   * 결과 추출 헬퍼
   */
  private extractResult<T>(result: PromiseSettledResult<T>, defaultValue: T): T {
    return result.status === 'fulfilled' ? result.value : defaultValue;
  }

  // 기본값 생성 메서드들
  private getDefaultStyleAnalysis() {
    return {
      primaryStyle: 'Contemporary',
      styleConfidence: 0.5,
      subStyles: [],
      artisticInfluences: [],
      generativeCapabilities: {
        canGenerate: false,
        suggestedPrompts: [],
        styleStrength: 0
      }
    };
  }

  private getDefaultCreativeElements() {
    return {
      innovation: 0.5,
      uniqueness: 0.5,
      creativity: 0.5,
      technicalSkill: 0.5,
      composition: {
        balance: 0.5,
        harmony: 0.5,
        contrast: 0.5,
        rhythm: 0.5
      }
    };
  }

  private getDefaultTechnicalAnalysis() {
    return {
      medium: 'Digital',
      technique: [],
      complexity: 'moderate' as const,
      craftsmanship: 0.5,
      innovation: []
    };
  }

  private getDefaultAIInsights() {
    return {
      generationPotential: {
        score: 0.5,
        reasons: [],
        suggestedModifications: []
      },
      styleTransferability: {
        canTransfer: false,
        targetStyles: [],
        difficulty: 'moderate' as const
      },
      creativeSuggestions: []
    };
  }

  /**
   * Mock 분석 결과
   */
  private getMockAnalysis(): PlayformAnalysisResult {
    return {
      styleAnalysis: {
        primaryStyle: 'Neo-Impressionism',
        styleConfidence: 0.87,
        subStyles: [
          {
            name: 'Pointillism',
            confidence: 0.74,
            characteristics: ['dot technique', 'color mixing', 'optical effects']
          },
          {
            name: 'Post-Impressionism',
            confidence: 0.69,
            characteristics: ['bold colors', 'expressive brushwork', 'emotional content']
          }
        ],
        artisticInfluences: ['Georges Seurat', 'Paul Signac', 'Henri-Edmond Cross'],
        generativeCapabilities: {
          canGenerate: true,
          suggestedPrompts: [
            'pointillist landscape with vibrant colors',
            'neo-impressionist garden scene with optical color mixing',
            'divisionist technique applied to modern cityscape'
          ],
          styleStrength: 0.82
        }
      },
      creativeElements: {
        innovation: 0.78,
        uniqueness: 0.73,
        creativity: 0.81,
        technicalSkill: 0.85,
        composition: {
          balance: 0.79,
          harmony: 0.86,
          contrast: 0.74,
          rhythm: 0.77
        }
      },
      visualCharacteristics: {
        colorProfile: {
          dominantHues: ['blue', 'yellow', 'orange', 'green'],
          saturationLevel: 'high',
          brightnessLevel: 'bright',
          colorHarmony: 'triadic',
          emotionalImpact: 'joyful and energetic'
        },
        formAnalysis: {
          shapes: ['organic curves', 'natural forms'],
          lines: 'curved',
          texture: 'dotted and layered',
          depth: '2d',
          movement: 'static'
        }
      },
      genreClassification: {
        primaryGenre: 'Landscape',
        subGenres: ['Impressionist Landscape', 'Plein Air'],
        themes: [
          {
            theme: 'Nature and Light',
            confidence: 0.91,
            description: 'Exploration of natural light effects and atmospheric conditions'
          },
          {
            theme: 'Color Theory',
            confidence: 0.84,
            description: 'Scientific approach to color mixing and optical effects'
          },
          {
            theme: 'Modern Life',
            confidence: 0.67,
            description: 'Contemporary perspective on traditional landscape subjects'
          }
        ],
        mood: 'peaceful and contemplative',
        atmosphere: 'luminous and airy'
      },
      technicalAnalysis: {
        medium: 'Oil on canvas',
        technique: ['pointillism', 'divisionism', 'optical color mixing', 'broken brushwork'],
        complexity: 'complex',
        craftsmanship: 0.89,
        innovation: ['systematic color application', 'scientific color theory', 'optical mixing technique']
      },
      aiInsights: {
        generationPotential: {
          score: 0.85,
          reasons: [
            'Distinctive pointillist technique is well-documented',
            'Clear color patterns can be replicated',
            'Strong artistic movement with defined characteristics'
          ],
          suggestedModifications: [
            'Vary dot size for different effects',
            'Experiment with digital pointillism',
            'Apply technique to contemporary subjects'
          ]
        },
        styleTransferability: {
          canTransfer: true,
          targetStyles: ['Digital Pointillism', 'Modern Divisionism', 'Contemporary Neo-Impressionism'],
          difficulty: 'moderate'
        },
        creativeSuggestions: [
          {
            type: 'variation',
            description: 'Create a night scene using the same pointillist technique',
            confidence: 0.82
          },
          {
            type: 'enhancement',
            description: 'Add more dynamic light sources for dramatic effect',
            confidence: 0.76
          },
          {
            type: 'style_mix',
            description: 'Combine pointillism with contemporary urban subjects',
            confidence: 0.71
          }
        ]
      }
    };
  }

  /**
   * Mock 생성된 스타일들
   */
  private getMockGeneratedStyles() {
    return [
      {
        imageUrl: 'https://via.placeholder.com/512x512?text=Generated+Style+1',
        styleDescription: 'Neo-Impressionist interpretation with enhanced color saturation',
        confidence: 0.87,
        generationParams: {
          style_strength: 0.8,
          color_enhancement: 1.2,
          technique: 'pointillism'
        }
      },
      {
        imageUrl: 'https://via.placeholder.com/512x512?text=Generated+Style+2',
        styleDescription: 'Modern digital pointillism with geometric elements',
        confidence: 0.79,
        generationParams: {
          style_strength: 0.9,
          geometric_influence: 0.6,
          technique: 'digital_pointillism'
        }
      },
      {
        imageUrl: 'https://via.placeholder.com/512x512?text=Generated+Style+3',
        styleDescription: 'Contemporary fusion of pointillism and abstract expressionism',
        confidence: 0.74,
        generationParams: {
          style_strength: 0.7,
          abstract_influence: 0.8,
          technique: 'fusion_style'
        }
      }
    ];
  }

  /**
   * 서비스 상태 확인
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; details: string }> {
    if (!this.apiKey) {
      return { status: 'degraded', details: 'API key not configured - using mock data' };
    }

    try {
      const response = await this.makeRequest('/v1/health', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        return { status: 'healthy', details: 'Playform.io service operational' };
      } else {
        return { status: 'degraded', details: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { status: 'down', details: error.message };
    }
  }
}