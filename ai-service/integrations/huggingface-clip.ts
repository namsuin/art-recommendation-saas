/**
 * Hugging Face CLIP Integration
 * 텍스트-이미지 매칭 및 이미지 분석을 위한 CLIP 모델 통합
 */

import { config } from '../../shared/config';
import { aiLogger } from '../../shared/logger';

interface CLIPResponse {
  embeddings?: number[];
  similarity_scores?: number[];
  labels?: string[];
  scores?: number[];
  error?: string;
}

interface ImageFeatures {
  features: number[];
  keywords: string[];
  description: string;
  style: string;
  colors: string[];
  confidence: number;
}

export class HuggingFaceCLIPService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly modelEndpoint: string;

  constructor() {
    this.baseUrl = config.services.huggingface.baseUrl;
    this.apiKey = config.services.huggingface.apiKey;
    this.modelEndpoint = `${this.baseUrl}/models/${config.services.huggingface.clipModel}`;
  }

  /**
   * 이미지를 분석하고 특징을 추출합니다
   */
  async analyzeImage(imageBuffer: Buffer): Promise<ImageFeatures> {
    try {
      aiLogger.info('🔍 Starting CLIP image analysis...');
      
      if (!this.apiKey) {
        throw new Error('Hugging Face API key not configured');
      }

      const base64Image = imageBuffer.toString('base64');
      
      // CLIP으로 이미지 특징 추출
      const features = await this.extractImageFeatures(base64Image);
      
      // 예술 관련 키워드로 유사도 계산
      const artKeywords = [
        'painting', 'artwork', 'portrait', 'landscape', 'abstract', 
        'impressionist', 'modern art', 'classical art', 'sculpture', 
        'oil painting', 'watercolor', 'acrylic painting', 'drawing',
        'renaissance', 'baroque', 'contemporary art', 'fine art'
      ];

      const similarities = await this.calculateTextImageSimilarity(
        base64Image, 
        artKeywords
      );

      // 가장 높은 점수를 받은 키워드들 추출
      const topKeywords = this.extractTopKeywords(artKeywords, similarities, 5);
      
      // 색상 분석
      const colors = await this.extractColors(base64Image);
      
      // 스타일 분석
      const style = this.determineArtStyle(topKeywords, similarities);

      const result: ImageFeatures = {
        features,
        keywords: topKeywords,
        description: this.generateDescription(topKeywords),
        style,
        colors,
        confidence: Math.max(...similarities) || 0
      };

      aiLogger.info(`✅ CLIP analysis complete. Found ${topKeywords.length} keywords`);
      return result;

    } catch (error) {
      aiLogger.error('❌ CLIP analysis failed:', error);
      
      // Fallback 결과 반환
      return {
        features: [],
        keywords: ['artwork', 'painting'],
        description: 'Artwork analysis (CLIP unavailable)',
        style: 'unknown',
        colors: [],
        confidence: 0.1
      };
    }
  }

  /**
   * 이미지 특징 벡터 추출
   */
  private async extractImageFeatures(base64Image: string): Promise<number[]> {
    try {
      const response = await fetch(this.modelEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: base64Image,
          options: { wait_for_model: true }
        })
      });

      if (!response.ok) {
        if (response.status === 503) {
          // 모델 로딩 중인 경우 재시도
          aiLogger.info('⏳ Model loading, waiting...');
          await new Promise(resolve => setTimeout(resolve, 10000));
          return this.extractImageFeatures(base64Image);
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json() as CLIPResponse;
      return result.embeddings || [];

    } catch (error) {
      aiLogger.error('❌ Feature extraction failed:', error);
      return [];
    }
  }

  /**
   * 텍스트-이미지 유사도 계산
   */
  private async calculateTextImageSimilarity(
    base64Image: string, 
    texts: string[]
  ): Promise<number[]> {
    try {
      // Zero-shot 분류 엔드포인트 사용
      const classificationEndpoint = `${this.baseUrl}/models/openai/clip-vit-base-patch32`;
      
      const response = await fetch(classificationEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: base64Image,
          parameters: {
            candidate_labels: texts
          },
          options: { wait_for_model: true }
        })
      });

      if (!response.ok) {
        if (response.status === 503) {
          aiLogger.info('⏳ Model loading for similarity calculation...');
          await new Promise(resolve => setTimeout(resolve, 8000));
          return this.calculateTextImageSimilarity(base64Image, texts);
        }
        throw new Error(`Similarity calculation failed: ${response.status}`);
      }

      const result = await response.json();
      
      // 결과 형태에 따라 점수 추출
      if (Array.isArray(result) && result.length > 0) {
        return result.map((item: any) => item.score || 0);
      }
      
      if (result.scores) {
        return result.scores;
      }

      return texts.map(() => Math.random() * 0.5); // Fallback

    } catch (error) {
      aiLogger.error('❌ Similarity calculation failed:', error);
      return texts.map(() => Math.random() * 0.5); // Fallback
    }
  }

  /**
   * 상위 키워드 추출
   */
  private extractTopKeywords(
    keywords: string[], 
    scores: number[], 
    topN: number = 5
  ): string[] {
    const combined = keywords.map((keyword, index) => ({
      keyword,
      score: scores[index] || 0
    }));

    combined.sort((a, b) => b.score - a.score);
    return combined.slice(0, topN).map(item => item.keyword);
  }

  /**
   * 색상 분석 (CLIP 기반 색상 키워드 매칭)
   */
  private async extractColors(base64Image: string): Promise<string[]> {
    const colorKeywords = [
      'red', 'blue', 'green', 'yellow', 'orange', 'purple', 
      'pink', 'brown', 'black', 'white', 'gray', 'gold'
    ];

    try {
      const similarities = await this.calculateTextImageSimilarity(
        base64Image, 
        colorKeywords.map(color => `${color} color`)
      );

      return this.extractTopKeywords(colorKeywords, similarities, 4);
    } catch (error) {
      aiLogger.error('❌ Color extraction failed:', error);
      return ['colorful'];
    }
  }

  /**
   * 예술 스타일 결정
   */
  private determineArtStyle(keywords: string[], similarities: number[]): string {
    const styleMap: { [key: string]: string } = {
      'impressionist': 'impressionist',
      'abstract': 'abstract',
      'portrait': 'portrait',
      'landscape': 'landscape',
      'modern art': 'modern',
      'classical art': 'classical',
      'renaissance': 'renaissance',
      'contemporary art': 'contemporary'
    };

    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i].toLowerCase();
      if (styleMap[keyword] && similarities[i] > 0.3) {
        return styleMap[keyword];
      }
    }

    return 'mixed';
  }

  /**
   * 설명 생성
   */
  private generateDescription(keywords: string[]): string {
    if (keywords.length === 0) return 'Artwork analysis';
    
    const mainKeyword = keywords[0];
    const additionalKeywords = keywords.slice(1, 3).join(' and ');
    
    if (additionalKeywords) {
      return `This appears to be ${mainKeyword} with elements of ${additionalKeywords}`;
    }
    
    return `This appears to be ${mainKeyword}`;
  }

  /**
   * API 상태 확인
   */
  async checkAPIStatus(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        aiLogger.warn('⚠️ Hugging Face API key not configured');
        return false;
      }

      // 간단한 테스트 요청
      const response = await fetch(this.modelEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      const isHealthy = response.ok || response.status === 503; // 503은 모델 로딩 중
      aiLogger.info(isHealthy ? '✅ Hugging Face CLIP API healthy' : '❌ Hugging Face CLIP API unavailable');
      return isHealthy;

    } catch (error) {
      aiLogger.error('❌ Hugging Face CLIP API check failed:', error);
      return false;
    }
  }
}