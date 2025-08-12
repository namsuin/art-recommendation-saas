/**
 * 이미지 URL 유효성 검증 유틸리티
 */

export class ImageUrlValidator {
  private static cache = new Map<string, { valid: boolean; timestamp: number }>();
  private static cacheTimeout = 5 * 60 * 1000; // 5분 캐시

  /**
   * 이미지 URL이 실제로 접근 가능한지 확인
   */
  static async isValidImageUrl(url: string): Promise<boolean> {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // 기본적인 URL 형식 검증
    try {
      new URL(url);
    } catch {
      return false;
    }

    // 캐시 확인
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.valid;
    }

    try {
      // HEAD 요청으로 빠른 검증
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ArtRecommendationBot/1.0)'
        }
      });

      clearTimeout(timeoutId);

      const isValid = response.ok && response.headers.get('content-type')?.startsWith('image/');
      
      // 캐시에 저장
      this.cache.set(url, { valid: isValid, timestamp: Date.now() });
      
      return isValid;

    } catch (error) {
      logger.info(`❌ Image URL validation failed for ${url}:`, error.message);
      
      // 캐시에 실패 결과 저장
      this.cache.set(url, { valid: false, timestamp: Date.now() });
      
      return false;
    }
  }

  /**
   * 여러 이미지 URL을 병렬로 검증
   */
  static async validateImageUrls(urls: string[]): Promise<{ [url: string]: boolean }> {
    const results: { [url: string]: boolean } = {};
    
    const validationPromises = urls.map(async (url) => {
      const isValid = await this.isValidImageUrl(url);
      results[url] = isValid;
      return { url, isValid };
    });

    await Promise.allSettled(validationPromises);
    
    return results;
  }

  /**
   * 추천 작품 배열에서 유효하지 않은 이미지 URL을 가진 작품들을 필터링
   */
  static async filterValidRecommendations(recommendations: any[]): Promise<any[]> {
    if (!recommendations || recommendations.length === 0) {
      return recommendations;
    }

    logger.info(`🔍 Validating ${recommendations.length} recommendation images...`);

    const validatedRecommendations: any[] = [];

    // 병렬로 검증하되, 성능을 위해 배치 처리
    const batchSize = 10;
    for (let i = 0; i < recommendations.length; i += batchSize) {
      const batch = recommendations.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (rec) => {
        const artwork = rec.artwork || rec;
        const imageUrl = artwork.image_url || artwork.thumbnail_url || artwork.primaryImage;
        
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
   * 캐시 정리
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * 만료된 캐시 엔트리 정리
   */
  static cleanExpiredCache(): void {
    const now = Date.now();
    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheTimeout) {
        this.cache.delete(url);
      }
    }
  }
}

// 주기적으로 만료된 캐시 정리
setInterval(() => {
  ImageUrlValidator.cleanExpiredCache();
}, 10 * 60 * 1000); // 10분마다 정리