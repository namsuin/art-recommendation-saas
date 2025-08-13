/**
 * 이미지 검증 서비스 - URL 유효성 검사 및 품질 관리
 */

import { logger } from '../../shared/logger';
import type { RecommendationItem, ServiceConfig } from '../types/common';

interface ValidationCache {
  valid: boolean;
  timestamp: number;
}

export class ImageValidationService {
  private cache = new Map<string, ValidationCache>();
  private config: ServiceConfig;

  constructor(config: ServiceConfig = {}) {
    this.config = {
      timeout: config.timeout || 5000,
      cacheTimeout: config.cacheTimeout || 5 * 60 * 1000, // 5분
      batchSize: config.batchSize || 10,
      retries: config.retries || 2
    };

    // 주기적으로 만료된 캐시 정리
    setInterval(() => {
      this.cleanExpiredCache();
    }, 10 * 60 * 1000); // 10분마다
  }

  /**
   * 단일 이미지 URL 유효성 검증
   */
  async isValidImageUrl(url: string, retryCount: number = 0): Promise<boolean> {
    if (!this.isValidUrl(url)) {
      return false;
    }

    // 캐시 확인
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout!) {
      return cached.valid;
    }

    try {
      const isValid = await this.validateImageUrl(url);
      this.cache.set(url, { valid: isValid, timestamp: Date.now() });
      return isValid;
    } catch (error) {
      logger.info(`❌ Image URL validation failed for ${url}:`, error.message);
      
      // 재시도 로직
      if (retryCount < this.config.retries!) {
        logger.info(`🔄 Retrying validation for ${url} (attempt ${retryCount + 1})`);
        await this.delay(1000 * (retryCount + 1)); // 지수적 백오프
        return this.isValidImageUrl(url, retryCount + 1);
      }

      this.cache.set(url, { valid: false, timestamp: Date.now() });
      return false;
    }
  }

  /**
   * 실제 URL 검증 수행
   */
  private async validateImageUrl(url: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ArtRecommendationBot/1.0)',
          'Accept': 'image/*'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      const contentType = response.headers.get('content-type');
      return contentType ? contentType.startsWith('image/') : false;

    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 여러 이미지 URL 병렬 검증
   */
  async validateImageUrls(urls: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    // 배치 처리로 성능 최적화
    for (let i = 0; i < urls.length; i += this.config.batchSize!) {
      const batch = urls.slice(i, i + this.config.batchSize!);
      
      const batchPromises = batch.map(async (url) => {
        const isValid = await this.isValidImageUrl(url);
        results[url] = isValid;
        return { url, isValid };
      });

      await Promise.allSettled(batchPromises);
    }
    
    return results;
  }

  /**
   * 추천 작품 배열에서 유효하지 않은 이미지를 가진 작품들 필터링
   */
  async filterValidRecommendations(recommendations: RecommendationItem[]): Promise<RecommendationItem[]> {
    if (!recommendations || recommendations.length === 0) {
      return recommendations;
    }

    logger.info(`🔍 Validating ${recommendations.length} recommendation images...`);
    const validatedRecommendations: RecommendationItem[] = [];

    // 배치 처리
    for (let i = 0; i < recommendations.length; i += this.config.batchSize!) {
      const batch = recommendations.slice(i, i + this.config.batchSize!);
      
      const batchPromises = batch.map(async (rec) => {
        const artwork = rec.artwork || rec;
        const imageUrl = this.getBestImageUrl(artwork);
        
        if (!imageUrl) {
          logger.info(`⚠️ No image URL found for artwork: ${artwork.title || 'Unknown'}`);
          return null;
        }

        const isValid = await this.isValidImageUrl(imageUrl);
        
        if (isValid) {
          return rec;
        } else {
          logger.info(`🚫 Filtering out artwork with invalid image: ${artwork.title || 'Unknown'} - ${imageUrl}`);
          return null;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value !== null) {
          validatedRecommendations.push(result.value);
        }
      });
    }

    const filteredCount = recommendations.length - validatedRecommendations.length;
    if (filteredCount > 0) {
      logger.info(`📊 Filtered out ${filteredCount} artworks with invalid images. ${validatedRecommendations.length} valid artworks remaining.`);
    }

    return validatedRecommendations;
  }

  /**
   * 작품에서 최적의 이미지 URL 선택
   */
  private getBestImageUrl(artwork: any): string | null {
    const possibleUrls = [
      artwork.image_url,
      artwork.thumbnail_url,
      artwork.primaryImage,
      artwork.primaryImageSmall
    ].filter(Boolean);

    // 가장 적절한 URL 선택 (크기와 품질 고려)
    return possibleUrls[0] || null;
  }

  /**
   * URL 형식 검증
   */
  private isValidUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 만료된 캐시 엔트리 정리
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.cacheTimeout!) {
        this.cache.delete(url);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`🧹 Cleaned ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * 캐시 통계
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // 실제 구현에서는 히트율 추적
    };
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('🧹 Image validation cache cleared');
  }
}