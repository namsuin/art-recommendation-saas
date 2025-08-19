/**
 * 추천 서비스 - 다양한 소스에서 추천 작품을 수집하고 관리
 */

import { logger } from '../../shared/logger';
import type { RecommendationItem, SearchOptions } from '../types/common';
import { mockDB } from './mock-database';
import { ExpandedArtSearchService } from './expanded-art-search';
import { ArtsyIntegration } from './artsy-integration';
import { SocialMediaIntegration } from './social-media-integration';
import { clevelandMuseum } from './cleveland-museum';
import { smithsonianMuseum } from './smithsonian-museum';
import { ngaMuseum } from './nga-museum';
import { ErrorHandler } from '../utils/error-handler';

export class RecommendationService {
  private expandedArtSearch: ExpandedArtSearchService;
  private artsyIntegration: ArtsyIntegration;
  private socialMediaIntegration: SocialMediaIntegration;

  constructor() {
    this.expandedArtSearch = new ExpandedArtSearchService();
    this.artsyIntegration = new ArtsyIntegration();
    this.socialMediaIntegration = new SocialMediaIntegration();
  }

  /**
   * 내부 추천 작품 가져오기 (Mock 데이터 포함)
   */
  async getInternalRecommendations(keywords: string[]): Promise<RecommendationItem[]> {
    logger.info('🎯 Getting internal recommendations with keywords:', keywords);
    
    try {
      // Mock 데이터로부터 추천 작품 가져오기
      const mockRecommendations = await mockDB.getRecommendations(keywords);
      logger.info('📊 Mock recommendations found:', mockRecommendations.length);
      
      return mockRecommendations;
    } catch (error) {
      logger.error('❌ Failed to get internal recommendations:', error);
      return [];
    }
  }

  /**
   * 외부 추천 작품 가져오기
   */
  async getExternalRecommendations(
    keywords: string[], 
    options: SearchOptions = {}
  ): Promise<RecommendationItem[]> {
    if (keywords.length === 0) {
      return [];
    }

    logger.info('🌍 Getting external recommendations with keywords:', keywords);
    const externalRecommendations: RecommendationItem[] = [];
    const topKeywords = keywords.slice(0, 5);

    try {
      // 1. 확장된 미술관 검색
      await this.searchMuseumSources(topKeywords, externalRecommendations);
      
      // 2. Cleveland Museum 검색
      await this.searchClevelandMuseum(topKeywords, externalRecommendations);
      
      // 3. Smithsonian Museums 검색
      await this.searchSmithsonian(topKeywords, externalRecommendations);
      
      // 4. National Gallery of Art 검색
      await this.searchNGA(topKeywords, externalRecommendations);
      
      // 5. Artsy 검색
      await this.searchArtsy(topKeywords, externalRecommendations);
      
      // 6. 소셜 미디어 검색
      await this.searchSocialMedia(topKeywords, externalRecommendations);

      // 유사도 70% 이상만 필터링
      const filteredRecommendations = externalRecommendations.filter(item => {
        const similarity = item.similarity_score?.total || item.similarity || 0;
        return similarity >= 0.7;
      });

      // 유사도 순으로 정렬
      filteredRecommendations.sort((a, b) => 
        (b.similarity_score?.total || b.similarity || 0) - 
        (a.similarity_score?.total || a.similarity || 0)
      );

      logger.info(`📊 External recommendations: ${externalRecommendations.length} found, ${filteredRecommendations.length} after filtering (≥70%)`);
      return filteredRecommendations;

    } catch (error) {
      logger.error('🚫 External search failed:', error);
      return [];
    }
  }

  /**
   * Mock 추천 데이터 가져오기
   */
  async getMockRecommendations(): Promise<RecommendationItem[]> {
    return await mockDB.getRecommendations(['artwork', 'creative', 'visual']);
  }

  /**
   * 미술관 소스 검색
   */
  private async searchMuseumSources(
    keywords: string[], 
    results: RecommendationItem[]
  ): Promise<void> {
    try {
      const expandedSearchResults = await this.expandedArtSearch.searchAllSources(
        keywords,
        {
          sources: ['chicago', 'rijksmuseum', 'korea'],
          limit: 5,
          includeKorean: true
        }
      );

      if (expandedSearchResults.success) {
        expandedSearchResults.results.forEach(sourceResult => {
          logger.info(`📍 ${sourceResult.source}: Found ${sourceResult.artworks.length} artworks`);
          results.push(...sourceResult.artworks);
        });
      }
    } catch (error) {
      logger.error('❌ Museum search failed:', error);
    }
  }

  /**
   * Artsy 검색
   */
  private async searchArtsy(
    keywords: string[], 
    results: RecommendationItem[]
  ): Promise<void> {
    try {
      const artsyResults = await this.artsyIntegration.searchByKeywords(keywords, 5);
      const formattedResults = artsyResults.artworks.map(artwork => 
        this.artsyIntegration.formatForDisplay(artwork)
      );
      results.push(...formattedResults);
      logger.info(`🎨 Artsy: Found ${formattedResults.length} artworks`);
    } catch (error) {
      logger.error('❌ Artsy search failed:', error);
    }
  }

  /**
   * Cleveland Museum 검색
   */
  private async searchClevelandMuseum(
    keywords: string[], 
    results: RecommendationItem[]
  ): Promise<void> {
    try {
      const clevelandResults = await clevelandMuseum.searchByStyleKeywords(keywords);
      results.push(...clevelandResults);
      logger.info(`🏛️ Cleveland Museum: Found ${clevelandResults.length} artworks`);
    } catch (error) {
      logger.error('❌ Cleveland Museum search failed:', error);
    }
  }

  /**
   * Smithsonian Museums 검색
   */
  private async searchSmithsonian(
    keywords: string[], 
    results: RecommendationItem[]
  ): Promise<void> {
    try {
      const smithsonianResults = await smithsonianMuseum.searchByStyleKeywords(keywords);
      results.push(...smithsonianResults);
      logger.info(`🏛️ Smithsonian: Found ${smithsonianResults.length} artworks`);
    } catch (error) {
      logger.error('❌ Smithsonian search failed:', error);
    }
  }

  /**
   * National Gallery of Art 검색
   */
  private async searchNGA(
    keywords: string[], 
    results: RecommendationItem[]
  ): Promise<void> {
    try {
      const ngaResults = await ngaMuseum.searchByStyleKeywords(keywords);
      results.push(...ngaResults);
      logger.info(`🎨 National Gallery: Found ${ngaResults.length} artworks`);
    } catch (error) {
      logger.error('❌ National Gallery search failed:', error);
    }
  }

  /**
   * 소셜 미디어 검색
   */
  private async searchSocialMedia(
    keywords: string[], 
    results: RecommendationItem[]
  ): Promise<void> {
    try {
      const socialResults = await this.socialMediaIntegration.searchAllPlatforms(
        keywords,
        ['behance'] as any,
        5
      );
      results.push(...socialResults.results);
      logger.info(`📱 Social: Found ${socialResults.results.length} artworks`);
    } catch (error) {
      logger.error('❌ Social media search failed:', error);
    }
  }

  /**
   * 키워드 기반 유사도 계산
   */
  calculateKeywordSimilarity(sourceKeywords: string[], targetKeywords: string[]): number {
    if (sourceKeywords.length === 0 || targetKeywords.length === 0) {
      return 0;
    }

    const matchCount = sourceKeywords.filter(sourceKeyword => 
      targetKeywords.some(targetKeyword => 
        targetKeyword.toLowerCase().includes(sourceKeyword.toLowerCase()) ||
        sourceKeyword.toLowerCase().includes(targetKeyword.toLowerCase())
      )
    ).length;

    return matchCount / sourceKeywords.length;
  }

  /**
   * 추천 작품 필터링 (품질 기준)
   */
  filterHighQualityRecommendations(
    recommendations: RecommendationItem[], 
    minSimilarity: number = 0.3
  ): RecommendationItem[] {
    return recommendations.filter(rec => {
      const similarity = rec.similarity_score?.total || rec.similarity || 0;
      const hasValidImage = rec.artwork.image_url && rec.artwork.image_url.length > 0;
      const hasTitle = rec.artwork.title && rec.artwork.title.trim().length > 0;
      
      return similarity >= minSimilarity && hasValidImage && hasTitle;
    });
  }

  /**
   * 중복 작품 제거
   */
  removeDuplicateRecommendations(recommendations: RecommendationItem[]): RecommendationItem[] {
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      const key = `${rec.artwork.title}_${rec.artwork.artist}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}