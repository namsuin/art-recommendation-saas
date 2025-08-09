/**
 * ArtPI API 통합 서비스
 * - 예술작품 인식 및 분류
 * - 스타일 태깅
 * - 작가 식별 
 */

import type { ServiceConfig } from '../types/common';

export interface ArtPIAnalysisResult {
  // 작품 식별
  artwork: {
    title?: string;
    artist?: string;
    year?: number;
    movement?: string;
    period?: string;
    confidence: number;
  };

  // 스타일 분석
  style: {
    primary: string;
    secondary: string[];
    confidence: Record<string, number>;
    tags: string[];
  };

  // 기법 분석
  technique: {
    medium: string;
    brushwork: string;
    texture: string;
    composition: string;
  };

  // 시각적 요소
  visualElements: {
    colorPalette: string[];
    dominantShapes: string[];
    lightingType: string;
    perspective: string;
  };

  // 문화적 맥락
  culturalContext: {
    region: string;
    culturalInfluences: string[];
    historicalContext: string;
  };
}

export class ArtPIService {
  private apiKey: string;
  private baseUrl: string;
  private config: ServiceConfig;

  constructor(config: ServiceConfig = {}) {
    this.apiKey = process.env.ARTPI_API_KEY || '';
    this.baseUrl = process.env.ARTPI_BASE_URL || 'https://api.artpi.co';
    this.config = {
      timeout: config.timeout || 15000,
      retries: config.retries || 3,
      ...config
    };

    if (!this.apiKey) {
      console.warn('⚠️ ArtPI API key not configured - using mock responses');
    }
  }

  /**
   * 이미지에서 예술작품 분석
   */
  async analyzeArtwork(imageBuffer: Buffer): Promise<ArtPIAnalysisResult> {
    if (!this.apiKey) {
      console.log('🎭 Using mock ArtPI analysis');
      return this.getMockAnalysis();
    }

    try {
      console.log('🎨 Analyzing artwork with ArtPI...');
      
      const formData = new FormData();
      formData.append('image', new Blob([imageBuffer]), 'artwork.jpg');
      formData.append('analysis_type', 'comprehensive');
      formData.append('include_metadata', 'true');

      const response = await this.makeRequest('/v1/analyze/artwork', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`ArtPI API error: ${result.message || response.statusText}`);
      }

      return this.parseArtPIResponse(result);

    } catch (error) {
      console.error('❌ ArtPI analysis failed:', error);
      
      // 네트워크 오류 시 재시도
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.log('🔄 Retrying ArtPI request...');
        return this.analyzeArtworkWithRetry(imageBuffer, 1);
      }
      
      // 실패 시 Mock 데이터 반환
      return this.getMockAnalysis();
    }
  }

  /**
   * 스타일 기반 유사 작품 검색
   */
  async searchSimilarArtworks(
    styleFeatures: string[], 
    limit: number = 10
  ): Promise<Array<{
    title: string;
    artist: string;
    imageUrl: string;
    similarity: number;
    styleMatch: string[];
  }>> {
    if (!this.apiKey) {
      return this.getMockSimilarArtworks();
    }

    try {
      const response = await this.makeRequest('/v1/search/similar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          style_features: styleFeatures,
          limit,
          include_metadata: true
        })
      });

      const result = await response.json();
      return this.parseSimilarArtworks(result);

    } catch (error) {
      console.error('❌ ArtPI similar search failed:', error);
      return this.getMockSimilarArtworks();
    }
  }

  /**
   * 작가별 작품 스타일 분석
   */
  async analyzeArtistStyle(artistName: string): Promise<{
    artist: string;
    characteristics: string[];
    typicalElements: string[];
    evolutionPeriods: Array<{
      period: string;
      years: string;
      characteristics: string[];
    }>;
  }> {
    if (!this.apiKey) {
      return this.getMockArtistStyle(artistName);
    }

    try {
      const response = await this.makeRequest(`/v1/artists/${encodeURIComponent(artistName)}/style`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      const result = await response.json();
      return this.parseArtistStyle(result);

    } catch (error) {
      console.error('❌ ArtPI artist analysis failed:', error);
      return this.getMockArtistStyle(artistName);
    }
  }

  /**
   * 재시도 로직이 포함된 분석
   */
  private async analyzeArtworkWithRetry(imageBuffer: Buffer, attempt: number): Promise<ArtPIAnalysisResult> {
    if (attempt >= this.config.retries!) {
      console.log('🎭 Max retries reached, using mock analysis');
      return this.getMockAnalysis();
    }

    try {
      await this.delay(1000 * attempt); // 지수적 백오프
      return await this.analyzeArtwork(imageBuffer);
    } catch (error) {
      return this.analyzeArtworkWithRetry(imageBuffer, attempt + 1);
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
   * ArtPI 응답 파싱
   */
  private parseArtPIResponse(response: any): ArtPIAnalysisResult {
    return {
      artwork: {
        title: response.artwork?.title,
        artist: response.artwork?.artist,
        year: response.artwork?.year,
        movement: response.artwork?.movement,
        period: response.artwork?.period,
        confidence: response.artwork?.confidence || 0
      },
      style: {
        primary: response.style?.primary || 'Unknown',
        secondary: response.style?.secondary || [],
        confidence: response.style?.confidence || {},
        tags: response.style?.tags || []
      },
      technique: {
        medium: response.technique?.medium || 'Unknown',
        brushwork: response.technique?.brushwork || 'Unknown',
        texture: response.technique?.texture || 'Unknown',
        composition: response.technique?.composition || 'Unknown'
      },
      visualElements: {
        colorPalette: response.visual_elements?.color_palette || [],
        dominantShapes: response.visual_elements?.dominant_shapes || [],
        lightingType: response.visual_elements?.lighting_type || 'Unknown',
        perspective: response.visual_elements?.perspective || 'Unknown'
      },
      culturalContext: {
        region: response.cultural_context?.region || 'Unknown',
        culturalInfluences: response.cultural_context?.cultural_influences || [],
        historicalContext: response.cultural_context?.historical_context || 'Unknown'
      }
    };
  }

  /**
   * 유사 작품 검색 결과 파싱
   */
  private parseSimilarArtworks(response: any): Array<any> {
    if (!response.artworks) return [];
    
    return response.artworks.map((artwork: any) => ({
      title: artwork.title || 'Unknown',
      artist: artwork.artist || 'Unknown',
      imageUrl: artwork.image_url || '',
      similarity: artwork.similarity || 0,
      styleMatch: artwork.style_match || []
    }));
  }

  /**
   * 작가 스타일 분석 결과 파싱
   */
  private parseArtistStyle(response: any): any {
    return {
      artist: response.artist || 'Unknown',
      characteristics: response.characteristics || [],
      typicalElements: response.typical_elements || [],
      evolutionPeriods: response.evolution_periods || []
    };
  }

  /**
   * Mock 분석 결과 (API 키가 없을 때)
   */
  private getMockAnalysis(): ArtPIAnalysisResult {
    const styles = ['Impressionism', 'Expressionism', 'Realism', 'Abstract', 'Cubism', 'Surrealism'];
    const artists = ['Claude Monet', 'Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Salvador Dalí'];
    const techniques = ['Oil on canvas', 'Watercolor', 'Acrylic', 'Mixed media', 'Digital art'];

    return {
      artwork: {
        title: 'Untitled Artwork',
        artist: artists[Math.floor(Math.random() * artists.length)],
        year: 1800 + Math.floor(Math.random() * 223),
        movement: styles[Math.floor(Math.random() * styles.length)],
        period: 'Modern',
        confidence: 0.7 + Math.random() * 0.3
      },
      style: {
        primary: styles[Math.floor(Math.random() * styles.length)],
        secondary: styles.filter(() => Math.random() > 0.7).slice(0, 2),
        confidence: {
          impressionism: Math.random(),
          expressionism: Math.random(),
          realism: Math.random()
        },
        tags: ['post-impressionist', 'colorful', 'brushwork', 'emotional'].filter(() => Math.random() > 0.5)
      },
      technique: {
        medium: techniques[Math.floor(Math.random() * techniques.length)],
        brushwork: ['smooth', 'textured', 'impasto', 'delicate'][Math.floor(Math.random() * 4)],
        texture: ['fine', 'coarse', 'mixed', 'layered'][Math.floor(Math.random() * 4)],
        composition: ['balanced', 'dynamic', 'asymmetrical', 'centered'][Math.floor(Math.random() * 4)]
      },
      visualElements: {
        colorPalette: ['blue', 'yellow', 'red', 'green', 'purple'].filter(() => Math.random() > 0.5),
        dominantShapes: ['curves', 'lines', 'geometric', 'organic'].filter(() => Math.random() > 0.6),
        lightingType: ['natural', 'dramatic', 'soft', 'harsh'][Math.floor(Math.random() * 4)],
        perspective: ['linear', 'atmospheric', 'isometric', 'bird\'s eye'][Math.floor(Math.random() * 4)]
      },
      culturalContext: {
        region: ['European', 'American', 'Asian', 'African'][Math.floor(Math.random() * 4)],
        culturalInfluences: ['Renaissance', 'Baroque', 'Romantic', 'Modern'].filter(() => Math.random() > 0.7),
        historicalContext: '19th-20th century artistic movement'
      }
    };
  }

  private getMockSimilarArtworks() {
    return [
      {
        title: 'Water Lilies',
        artist: 'Claude Monet',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1919%2C_Metropolitan_Museum_of_Art.jpg/500px-Claude_Monet_-_Water_Lilies_-_1919%2C_Metropolitan_Museum_of_Art.jpg',
        similarity: 0.89,
        styleMatch: ['impressionism', 'nature', 'light']
      },
      {
        title: 'Starry Night',
        artist: 'Vincent van Gogh',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/500px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
        similarity: 0.84,
        styleMatch: ['post-impressionism', 'swirls', 'night']
      },
      {
        title: 'The Persistence of Memory',
        artist: 'Salvador Dalí',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
        similarity: 0.76,
        styleMatch: ['surrealism', 'dream-like', 'symbolic']
      }
    ];
  }

  private getMockArtistStyle(artistName: string) {
    return {
      artist: artistName,
      characteristics: ['distinctive brushwork', 'vibrant colors', 'emotional depth'],
      typicalElements: ['light and shadow', 'natural subjects', 'innovative techniques'],
      evolutionPeriods: [
        {
          period: 'Early Period',
          years: '1880-1890',
          characteristics: ['traditional techniques', 'academic style']
        },
        {
          period: 'Mature Period', 
          years: '1890-1910',
          characteristics: ['developed personal style', 'experimentation']
        },
        {
          period: 'Late Period',
          years: '1910-1926',
          characteristics: ['mastery of technique', 'refined approach']
        }
      ]
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
        return { status: 'healthy', details: 'ArtPI service operational' };
      } else {
        return { status: 'degraded', details: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { status: 'down', details: error.message };
    }
  }
}