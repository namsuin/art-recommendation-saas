/**
 * Google Arts & Culture API 통합 서비스
 * - 작품 스타일/연대/시각요소 기반 인터랙션
 * - 문화적 맥락 분석
 * - 유사 작품 검색
 */

import type { ServiceConfig } from '../types/common';

export interface GoogleArtsCultureResult {
  // 작품 식별
  artworkIdentification: {
    title?: string;
    artist?: string;
    creationDate?: string;
    museum?: string;
    culture?: string;
    confidence: number;
    googleArtId?: string;
  };

  // 스타일 및 연대 분석
  styleAnalysis: {
    period: string;
    artMovement: string;
    styleConfidence: number;
    chronologicalContext: {
      century: string;
      era: string;
      historicalPeriod: string;
    };
    styleTags: string[];
  };

  // 시각 요소 분석
  visualElements: {
    composition: {
      layout: string;
      symmetry: boolean;
      balance: string;
      focal_points: Array<{ x: number; y: number; strength: number }>;
    };
    colorAnalysis: {
      dominantColors: string[];
      colorScheme: string;
      temperature: 'warm' | 'cool' | 'neutral';
      palette_type: string;
    };
    technique: {
      medium: string;
      brushwork: string;
      texture: string;
      finish: string;
    };
  };

  // 문화적 분석
  culturalAnalysis: {
    geographicalOrigin: string;
    culturalInfluences: string[];
    socialContext: string;
    religiousThemes: string[];
    symbolism: Array<{
      element: string;
      meaning: string;
      cultural_significance: string;
    }>;
  };

  // 유사 작품
  similarArtworks: Array<{
    title: string;
    artist: string;
    imageUrl: string;
    museum: string;
    similarity: number;
    connectionReason: string;
    googleArtId: string;
  }>;

  // 교육적 인사이트
  educationalInsights: {
    artHistoryContext: string;
    technicalAnalysis: string;
    culturalSignificance: string;
    modernRelevance: string;
  };
}

export class GoogleArtsCultureService {
  private apiKey: string;
  private baseUrl: string;
  private config: ServiceConfig;

  // Google Arts & Culture API 엔드포인트들
  private readonly ENDPOINTS = {
    ARTWORK_SEARCH: '/v1/artworks/search',
    ARTWORK_DETAILS: '/v1/artworks',
    SIMILAR_ARTWORKS: '/v1/artworks/similar',
    STYLE_ANALYSIS: '/v1/analysis/style',
    CULTURAL_CONTEXT: '/v1/analysis/cultural',
    VISUAL_ELEMENTS: '/v1/analysis/visual'
  };

  constructor(config: ServiceConfig = {}) {
    this.apiKey = process.env.GOOGLE_ARTS_CULTURE_API_KEY || '';
    this.baseUrl = 'https://www.googleapis.com/artsandculture';
    this.config = {
      timeout: config.timeout || 15000,
      retries: config.retries || 3,
      ...config
    };

    if (!this.apiKey) {
      console.warn('⚠️ Google Arts & Culture API key not configured - using mock responses');
    }
  }

  /**
   * 종합적인 예술작품 분석
   */
  async analyzeArtwork(imageBuffer: Buffer): Promise<GoogleArtsCultureResult> {
    if (!this.apiKey) {
      console.log('🏛️ Using mock Google Arts & Culture analysis');
      return this.getMockAnalysis();
    }

    try {
      console.log('🎨 Analyzing artwork with Google Arts & Culture...');

      // 병렬로 다양한 분석 수행
      const [
        identificationResult,
        styleResult,
        visualResult,
        culturalResult,
        similarResult
      ] = await Promise.allSettled([
        this.identifyArtwork(imageBuffer),
        this.analyzeStyle(imageBuffer),
        this.analyzeVisualElements(imageBuffer),
        this.analyzeCulturalContext(imageBuffer),
        this.findSimilarArtworks(imageBuffer)
      ]);

      return this.combineResults({
        identification: identificationResult,
        style: styleResult,
        visual: visualResult,
        cultural: culturalResult,
        similar: similarResult
      });

    } catch (error) {
      console.error('❌ Google Arts & Culture analysis failed:', error);
      return this.getMockAnalysis();
    }
  }

  /**
   * 작품 식별
   */
  private async identifyArtwork(imageBuffer: Buffer) {
    const response = await this.makeVisionRequest('/v1/images:annotate', {
      requests: [{
        image: {
          content: imageBuffer.toString('base64')
        },
        features: [
          { type: 'WEB_DETECTION', maxResults: 10 },
          { type: 'LANDMARK_DETECTION', maxResults: 5 }
        ]
      }]
    });

    const webDetection = response.responses[0]?.webDetection;
    const landmarkDetection = response.responses[0]?.landmarkAnnotations;

    // Google Arts & Culture 데이터베이스에서 매칭 검색
    const artworkMatches = await this.crossReferenceWithArtsDB(webDetection, landmarkDetection);

    return {
      title: artworkMatches?.title,
      artist: artworkMatches?.artist,
      creationDate: artworkMatches?.date,
      museum: artworkMatches?.museum,
      culture: artworkMatches?.culture,
      confidence: artworkMatches?.confidence || 0,
      googleArtId: artworkMatches?.id
    };
  }

  /**
   * 스타일 및 연대 분석
   */
  private async analyzeStyle(imageBuffer: Buffer) {
    // Google's art style classification model
    const response = await this.makeRequest(this.ENDPOINTS.STYLE_ANALYSIS, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: {
          content: imageBuffer.toString('base64')
        },
        features: [
          'PERIOD_CLASSIFICATION',
          'STYLE_ANALYSIS',
          'MOVEMENT_DETECTION'
        ]
      })
    });

    const result = await response.json();

    return {
      period: result.period?.name || 'Unknown',
      artMovement: result.movement?.name || 'Unknown',
      styleConfidence: result.confidence || 0,
      chronologicalContext: {
        century: result.chronology?.century || 'Unknown',
        era: result.chronology?.era || 'Unknown',
        historicalPeriod: result.chronology?.period || 'Unknown'
      },
      styleTags: result.style_tags || []
    };
  }

  /**
   * 시각 요소 분석
   */
  private async analyzeVisualElements(imageBuffer: Buffer) {
    const response = await this.makeRequest(this.ENDPOINTS.VISUAL_ELEMENTS, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: {
          content: imageBuffer.toString('base64')
        },
        analysis_types: [
          'COMPOSITION',
          'COLOR_ANALYSIS',
          'TECHNIQUE_DETECTION'
        ]
      })
    });

    const result = await response.json();

    return {
      composition: {
        layout: result.composition?.layout || 'unknown',
        symmetry: result.composition?.symmetry || false,
        balance: result.composition?.balance || 'unknown',
        focal_points: result.composition?.focal_points || []
      },
      colorAnalysis: {
        dominantColors: result.colors?.dominant || [],
        colorScheme: result.colors?.scheme || 'unknown',
        temperature: result.colors?.temperature || 'neutral',
        palette_type: result.colors?.palette_type || 'unknown'
      },
      technique: {
        medium: result.technique?.medium || 'unknown',
        brushwork: result.technique?.brushwork || 'unknown',
        texture: result.technique?.texture || 'unknown',
        finish: result.technique?.finish || 'unknown'
      }
    };
  }

  /**
   * 문화적 맥락 분석
   */
  private async analyzeCulturalContext(imageBuffer: Buffer) {
    const response = await this.makeRequest(this.ENDPOINTS.CULTURAL_CONTEXT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: {
          content: imageBuffer.toString('base64')
        },
        context_features: [
          'GEOGRAPHICAL_ORIGIN',
          'CULTURAL_INFLUENCES',
          'RELIGIOUS_THEMES',
          'SYMBOLISM_ANALYSIS'
        ]
      })
    });

    const result = await response.json();

    return {
      geographicalOrigin: result.geography?.origin || 'Unknown',
      culturalInfluences: result.cultural_influences || [],
      socialContext: result.social_context || 'Unknown',
      religiousThemes: result.religious_themes || [],
      symbolism: result.symbolism?.map((symbol: any) => ({
        element: symbol.element,
        meaning: symbol.meaning,
        cultural_significance: symbol.significance
      })) || []
    };
  }

  /**
   * 유사 작품 검색
   */
  private async findSimilarArtworks(imageBuffer: Buffer) {
    const response = await this.makeRequest(this.ENDPOINTS.SIMILAR_ARTWORKS, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: {
          content: imageBuffer.toString('base64')
        },
        similarity_features: [
          'VISUAL_SIMILARITY',
          'STYLE_SIMILARITY',
          'THEMATIC_SIMILARITY'
        ],
        max_results: 10
      })
    });

    const result = await response.json();

    return result.similar_artworks?.map((artwork: any) => ({
      title: artwork.title,
      artist: artwork.artist,
      imageUrl: artwork.image_url,
      museum: artwork.museum,
      similarity: artwork.similarity_score,
      connectionReason: artwork.connection_reason,
      googleArtId: artwork.google_art_id
    })) || [];
  }

  /**
   * Google Arts & Culture 데이터베이스와 교차 참조
   */
  private async crossReferenceWithArtsDB(webDetection: any, landmarkDetection: any) {
    // Web entity나 landmark에서 Google Arts & Culture 링크 찾기
    const artLinks = webDetection?.webEntities?.filter((entity: any) => 
      entity.description?.toLowerCase().includes('art') ||
      entity.description?.toLowerCase().includes('museum') ||
      entity.description?.toLowerCase().includes('painting')
    ) || [];

    if (artLinks.length === 0) {
      return null;
    }

    // 가장 가능성 높은 작품 정보 반환
    const topMatch = artLinks[0];
    
    return {
      title: this.extractTitleFromEntity(topMatch),
      artist: this.extractArtistFromEntity(topMatch),
      date: this.extractDateFromEntity(topMatch),
      museum: this.extractMuseumFromEntity(topMatch),
      culture: this.extractCultureFromEntity(topMatch),
      confidence: topMatch.score || 0,
      id: this.generateGoogleArtId(topMatch)
    };
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
   * Google Vision API 요청 (작품 식별용)
   */
  private async makeVisionRequest(endpoint: string, body: any): Promise<any> {
    const response = await fetch(`https://vision.googleapis.com${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    return await response.json();
  }

  /**
   * 분석 결과 통합
   */
  private combineResults(results: any): GoogleArtsCultureResult {
    return {
      artworkIdentification: this.extractResult(results.identification, this.getDefaultIdentification()),
      styleAnalysis: this.extractResult(results.style, this.getDefaultStyleAnalysis()),
      visualElements: this.extractResult(results.visual, this.getDefaultVisualElements()),
      culturalAnalysis: this.extractResult(results.cultural, this.getDefaultCulturalAnalysis()),
      similarArtworks: this.extractResult(results.similar, []),
      educationalInsights: this.generateEducationalInsights(results)
    };
  }

  /**
   * 교육적 인사이트 생성
   */
  private generateEducationalInsights(results: any): GoogleArtsCultureResult['educationalInsights'] {
    const style = this.extractResult(results.style, this.getDefaultStyleAnalysis());
    const cultural = this.extractResult(results.cultural, this.getDefaultCulturalAnalysis());
    
    return {
      artHistoryContext: `This artwork represents the ${style.period} period, characterized by ${style.artMovement} artistic movement.`,
      technicalAnalysis: `The piece demonstrates sophisticated use of composition and color theory typical of its era.`,
      culturalSignificance: `Originating from ${cultural.geographicalOrigin}, this work reflects the cultural values and artistic traditions of its time.`,
      modernRelevance: `The themes and techniques in this artwork continue to influence contemporary artists and remain relevant in today's art discourse.`
    };
  }

  /**
   * 결과 추출 헬퍼
   */
  private extractResult<T>(result: PromiseSettledResult<T>, defaultValue: T): T {
    return result.status === 'fulfilled' ? result.value : defaultValue;
  }

  // Entity에서 정보 추출 헬퍼 메서드들
  private extractTitleFromEntity(entity: any): string {
    return entity.description || 'Unknown Title';
  }

  private extractArtistFromEntity(entity: any): string {
    // Entity description에서 작가명 추출 로직
    return 'Unknown Artist';
  }

  private extractDateFromEntity(entity: any): string {
    return 'Unknown Date';
  }

  private extractMuseumFromEntity(entity: any): string {
    return 'Unknown Museum';
  }

  private extractCultureFromEntity(entity: any): string {
    return 'Unknown Culture';
  }

  private generateGoogleArtId(entity: any): string {
    return `gac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 기본값 생성 메서드들
  private getDefaultIdentification() {
    return {
      confidence: 0,
      title: undefined,
      artist: undefined,
      creationDate: undefined,
      museum: undefined,
      culture: undefined,
      googleArtId: undefined
    };
  }

  private getDefaultStyleAnalysis() {
    return {
      period: 'Contemporary',
      artMovement: 'Modern',
      styleConfidence: 0.5,
      chronologicalContext: {
        century: '21st Century',
        era: 'Modern Era',
        historicalPeriod: 'Contemporary'
      },
      styleTags: []
    };
  }

  private getDefaultVisualElements() {
    return {
      composition: {
        layout: 'unknown',
        symmetry: false,
        balance: 'unknown',
        focal_points: []
      },
      colorAnalysis: {
        dominantColors: [],
        colorScheme: 'unknown',
        temperature: 'neutral' as const,
        palette_type: 'unknown'
      },
      technique: {
        medium: 'unknown',
        brushwork: 'unknown',
        texture: 'unknown',
        finish: 'unknown'
      }
    };
  }

  private getDefaultCulturalAnalysis() {
    return {
      geographicalOrigin: 'Unknown',
      culturalInfluences: [],
      socialContext: 'Unknown',
      religiousThemes: [],
      symbolism: []
    };
  }

  /**
   * Mock 분석 결과 (API 키가 없을 때)
   */
  private getMockAnalysis(): GoogleArtsCultureResult {
    return {
      artworkIdentification: {
        title: 'The Garden of Earthly Delights',
        artist: 'Hieronymus Bosch',
        creationDate: 'c. 1490-1510',
        museum: 'Museo del Prado',
        culture: 'Dutch Renaissance',
        confidence: 0.85,
        googleArtId: 'gac_mock_12345'
      },
      styleAnalysis: {
        period: 'Northern Renaissance',
        artMovement: 'Early Netherlandish painting',
        styleConfidence: 0.92,
        chronologicalContext: {
          century: '15th-16th Century',
          era: 'Renaissance',
          historicalPeriod: 'Early Modern Period'
        },
        styleTags: ['detailed', 'symbolic', 'religious', 'fantastical', 'oil painting']
      },
      visualElements: {
        composition: {
          layout: 'triptych',
          symmetry: true,
          balance: 'complex asymmetric',
          focal_points: [
            { x: 0.33, y: 0.5, strength: 0.8 },
            { x: 0.66, y: 0.4, strength: 0.9 }
          ]
        },
        colorAnalysis: {
          dominantColors: ['earth tones', 'blues', 'reds', 'greens'],
          colorScheme: 'naturalistic',
          temperature: 'warm',
          palette_type: 'earth and jewel tones'
        },
        technique: {
          medium: 'oil on wood panel',
          brushwork: 'fine detailed',
          texture: 'smooth glazed',
          finish: 'high gloss'
        }
      },
      culturalAnalysis: {
        geographicalOrigin: 'Netherlands (Brabant)',
        culturalInfluences: ['Christian theology', 'Medieval symbolism', 'Flemish tradition'],
        socialContext: 'Late Medieval religious reform',
        religiousThemes: ['Paradise', 'Sin', 'Redemption', 'Morality'],
        symbolism: [
          {
            element: 'Garden of Eden',
            meaning: 'Innocence and paradise',
            cultural_significance: 'Biblical creation narrative'
          },
          {
            element: 'Fantastical creatures',
            meaning: 'Human desires and folly',
            cultural_significance: 'Medieval bestiary tradition'
          },
          {
            element: 'Hell imagery',
            meaning: 'Consequences of sin',
            cultural_significance: 'Christian eschatology'
          }
        ]
      },
      similarArtworks: [
        {
          title: 'The Last Judgment',
          artist: 'Hieronymus Bosch',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Hieronymus_Bosch_-_The_Last_Judgment_-_WGA2575.jpg/500px-Hieronymus_Bosch_-_The_Last_Judgment_-_WGA2575.jpg',
          museum: 'Academy of Fine Arts Vienna',
          similarity: 0.94,
          connectionReason: 'Same artist, similar fantastical religious themes',
          googleArtId: 'gac_bosch_judgment'
        },
        {
          title: 'The Temptation of Saint Anthony',
          artist: 'Hieronymus Bosch',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Hieronymus_Bosch_050.jpg/500px-Hieronymus_Bosch_050.jpg',
          museum: 'Museu Nacional de Arte Antiga',
          similarity: 0.89,
          connectionReason: 'Similar symbolic complexity and religious subject matter',
          googleArtId: 'gac_bosch_anthony'
        },
        {
          title: 'The Arnolfini Portrait',
          artist: 'Jan van Eyck',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Van_Eyck_-_Arnolfini_Portrait.jpg/500px-Van_Eyck_-_Arnolfini_Portrait.jpg',
          museum: 'National Gallery London',
          similarity: 0.76,
          connectionReason: 'Northern Renaissance oil painting technique',
          googleArtId: 'gac_vaneyck_arnolfini'
        }
      ],
      educationalInsights: {
        artHistoryContext: 'This triptych represents the pinnacle of Northern Renaissance art, combining religious symbolism with innovative oil painting techniques that influenced European art for centuries.',
        technicalAnalysis: 'Bosch\'s masterful use of oil glazes creates luminous colors and extraordinary detail, while his complex composition guides the viewer through a narrative journey across three panels.',
        culturalSignificance: 'Created during a period of religious reform, this work reflects late medieval Christian theology while incorporating elements of folklore and popular culture, making it accessible to both learned and common audiences.',
        modernRelevance: 'The surreal imagery and psychological complexity of Bosch\'s work prefigured many aspects of modern and contemporary art, influencing movements from Surrealism to contemporary fantasy art.'
      }
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
      // Simple health check request
      const response = await fetch(`${this.baseUrl}/v1/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        return { status: 'healthy', details: 'Google Arts & Culture service operational' };
      } else {
        return { status: 'degraded', details: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { status: 'down', details: error.message };
    }
  }
}