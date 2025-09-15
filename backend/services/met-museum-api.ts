import axios from 'axios';
import { logger } from '../../shared/logger';

interface MetArtwork {
  objectID: number;
  isHighlight: boolean;
  accessionNumber: string;
  accessionYear: string;
  isPublicDomain: boolean;
  primaryImage: string;
  primaryImageSmall: string;
  additionalImages: string[];
  constituents: Array<{
    constituentID: number;
    role: string;
    name: string;
    constituentULAN_URL: string;
    constituentWikidata_URL: string;
    gender: string;
  }>;
  department: string;
  objectName: string;
  title: string;
  culture: string;
  period: string;
  dynasty: string;
  reign: string;
  portfolio: string;
  artistRole: string;
  artistPrefix: string;
  artistDisplayName: string;
  artistDisplayBio: string;
  artistSuffix: string;
  artistAlphaSort: string;
  artistNationality: string;
  artistBeginDate: string;
  artistEndDate: string;
  artistGender: string;
  artistWikidata_URL: string;
  artistULAN_URL: string;
  objectDate: string;
  objectBeginDate: number;
  objectEndDate: number;
  medium: string;
  dimensions: string;
  measurements: Array<{
    elementName: string;
    elementDescription: string;
    elementMeasurements: {
      Height: number;
      Width: number;
    };
  }>;
  creditLine: string;
  geographyType: string;
  city: string;
  state: string;
  county: string;
  country: string;
  region: string;
  subregion: string;
  locale: string;
  locus: string;
  excavation: string;
  river: string;
  classification: string;
  rightsAndReproduction: string;
  linkResource: string;
  metadataDate: string;
  repository: string;
  objectURL: string;
  tags: Array<{
    term: string;
    AAT_URL: string;
    Wikidata_URL: string;
  }>;
  objectWikidata_URL: string;
  isTimelineWork: boolean;
  GalleryNumber: string;
}

interface MetSearchResult {
  total: number;
  objectIDs: number[];
}

interface FormattedArtwork {
  id: string;
  title: string;
  artist: string;
  image_url: string;
  thumbnail_url: string;
  source: string;
  source_url: string;
  description: string;
  keywords: string[];
  metadata: {
    department: string;
    period: string;
    culture: string;
    medium: string;
    date: string;
    dimensions: string;
    accession_number: string;
  };
}

export class MetMuseumAPI {
  private baseUrl = 'https://collectionapi.metmuseum.org/public/collection/v1';
  private cache = new Map<string, any>();
  private cacheExpiry = 30 * 60 * 1000; // 30분 캐시

  /**
   * 키워드로 Met Museum 작품 검색
   */
  async searchByKeywords(keywords: string[], limit: number = 20): Promise<FormattedArtwork[]> {
    try {
      logger.info(`🏛️ Searching Met Museum for: ${keywords.join(', ')}`);
      
      // 여러 키워드 조합으로 검색
      const searchQueries = this.generateSearchQueries(keywords);
      const allResults: number[] = [];

      for (const query of searchQueries.slice(0, 3)) { // 최대 3개 쿼리
        const cacheKey = `search_${query}`;
        let searchResult = this.getCachedResult(cacheKey);

        if (!searchResult) {
          const response = await axios.get(`${this.baseUrl}/search`, {
            params: {
              q: query,
              hasImages: true, // 이미지가 있는 작품만
              isPublicDomain: true // 퍼블릭 도메인만
            },
            timeout: 10000
          });

          searchResult = response.data as MetSearchResult;
          this.setCachedResult(cacheKey, searchResult);
        }

        if (searchResult.objectIDs) {
          allResults.push(...searchResult.objectIDs.slice(0, limit));
        }
      }

      // 중복 제거 및 제한
      const uniqueObjectIDs = [...new Set(allResults)].slice(0, limit * 2);
      logger.info(`🔍 Found ${uniqueObjectIDs.length} potential artworks`);

      // 각 작품의 상세 정보 조회
      const artworks = await this.getArtworkDetails(uniqueObjectIDs.slice(0, limit));
      logger.info(`🎨 Got ${artworks.length} artworks from getArtworkDetails`);
      
      // 키워드 관련성으로 정렬
      const rankedArtworks = this.rankArtworksByRelevance(artworks, keywords);
      logger.info(`📊 Ranked artworks: ${rankedArtworks.length}`);
      
      if (rankedArtworks.length > 0) {
        logger.info(`🎯 First artwork: ${rankedArtworks[0].title} by ${rankedArtworks[0].artist}`);
      }
      
      logger.info(`✅ Retrieved ${rankedArtworks.length} Met Museum artworks`);
      return rankedArtworks.slice(0, limit);

    } catch (error) {
      logger.error('Met Museum search failed:', error);
      return [];
    }
  }

  /**
   * 특정 부서(카테고리)에서 작품 검색
   */
  async searchByDepartment(department: string, keywords: string[] = [], limit: number = 20): Promise<FormattedArtwork[]> {
    try {
      const query = keywords.length > 0 ? keywords.join(' ') : '*';
      
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: query,
          departmentId: this.getDepartmentId(department),
          hasImages: true,
          isPublicDomain: true
        },
        timeout: 10000
      });

      const searchResult = response.data as MetSearchResult;
      
      if (!searchResult.objectIDs) {
        return [];
      }

      const objectIDs = searchResult.objectIDs.slice(0, limit);
      return await this.getArtworkDetails(objectIDs);

    } catch (error) {
      logger.error('Met Museum department search failed:', error);
      return [];
    }
  }

  /**
   * 여러 작품의 상세 정보 조회
   */
  private async getArtworkDetails(objectIDs: number[]): Promise<FormattedArtwork[]> {
    const artworks: FormattedArtwork[] = [];
    
    // 병렬로 최대 5개씩 처리
    const batchSize = 5;
    for (let i = 0; i < objectIDs.length; i += batchSize) {
      const batch = objectIDs.slice(i, i + batchSize);
      const batchPromises = batch.map(id => this.getArtworkById(id));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        artworks.push(...batchResults.filter(artwork => artwork !== null) as FormattedArtwork[]);
      } catch (error) {
        logger.warn('Some artworks failed to load in batch:', error);
      }
    }

    return artworks;
  }

  /**
   * 특정 작품의 상세 정보 조회
   */
  private async getArtworkById(objectID: number): Promise<FormattedArtwork | null> {
    try {
      const cacheKey = `artwork_${objectID}`;
      let artwork = this.getCachedResult(cacheKey);

      if (!artwork) {
        const response = await axios.get(`${this.baseUrl}/objects/${objectID}`, {
          timeout: 5000
        });
        artwork = response.data as MetArtwork;
        this.setCachedResult(cacheKey, artwork);
      }

      // 이미지가 없거나 퍼블릭 도메인이 아닌 경우 제외
      if (!artwork.primaryImage || !artwork.isPublicDomain) {
        return null;
      }

      return this.formatArtwork(artwork);

    } catch (error) {
      // 기술 부채 해결: 404 에러를 덜 verbose하게 처리
      if (error?.response?.status === 404) {
        logger.debug(`🔍 Artwork ${objectID} not found (404) - skipping`);
      } else if (error?.code === 'ERR_BAD_REQUEST' && error?.response?.status === 404) {
        logger.debug(`🔍 Artwork ${objectID} unavailable - skipping`);
      } else {
        logger.warn(`Failed to get artwork ${objectID}:`, error?.message || error);
      }
      return null;
    }
  }

  /**
   * Met Museum 작품을 표준 형식으로 변환
   */
  private formatArtwork(artwork: MetArtwork): FormattedArtwork {
    // 키워드 생성
    const keywords = [
      artwork.department?.toLowerCase(),
      artwork.objectName?.toLowerCase(),
      artwork.culture?.toLowerCase(),
      artwork.period?.toLowerCase(),
      artwork.medium?.toLowerCase(),
      artwork.artistNationality?.toLowerCase(),
      ...(artwork.tags?.map(tag => tag.term.toLowerCase()) || [])
    ].filter(Boolean);

    return {
      id: `met_${artwork.objectID}`,
      title: artwork.title || 'Untitled',
      artist: artwork.artistDisplayName || 'Unknown Artist',
      image_url: artwork.primaryImage,
      thumbnail_url: artwork.primaryImageSmall || artwork.primaryImage,
      source: 'Met Museum',
      source_url: artwork.objectURL,
      description: this.generateDescription(artwork),
      keywords: [...new Set(keywords)], // 중복 제거
      metadata: {
        department: artwork.department || '',
        period: artwork.period || '',
        culture: artwork.culture || '',
        medium: artwork.medium || '',
        date: artwork.objectDate || '',
        dimensions: artwork.dimensions || '',
        accession_number: artwork.accessionNumber || ''
      }
    };
  }

  /**
   * 작품 설명 생성
   */
  private generateDescription(artwork: MetArtwork): string {
    const parts = [
      artwork.medium,
      artwork.objectDate,
      artwork.culture && `from ${artwork.culture}`,
      artwork.dimensions && `(${artwork.dimensions})`
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * 키워드 기반 검색 쿼리 생성
   */
  private generateSearchQueries(keywords: string[]): string[] {
    const queries = [
      keywords.join(' '), // 모든 키워드
      keywords.slice(0, 2).join(' '), // 상위 2개 키워드
      keywords[0] // 첫 번째 키워드만
    ];

    // 예술 관련 용어 매핑
    const artTerms = this.mapToArtTerms(keywords);
    if (artTerms.length > 0) {
      queries.push(artTerms.join(' '));
    }

    return queries.filter(q => q.length > 0);
  }

  /**
   * 키워드를 예술 용어로 매핑
   */
  private mapToArtTerms(keywords: string[]): string[] {
    const termMapping: { [key: string]: string[] } = {
      'portrait': ['portrait', 'bust', 'figure'],
      'landscape': ['landscape', 'nature', 'scenery'],
      'abstract': ['modern', 'contemporary', 'abstract'],
      'classical': ['classical', 'antique', 'traditional'],
      'painting': ['painting', 'oil', 'canvas'],
      'sculpture': ['sculpture', 'statue', 'bronze'],
      'drawing': ['drawing', 'sketch', 'charcoal'],
      'blue': ['blue', 'cerulean', 'azure'],
      'red': ['red', 'crimson', 'scarlet'],
      'flower': ['floral', 'botanical', 'garden'],
      'animal': ['animal', 'wildlife', 'fauna']
    };

    const mappedTerms: string[] = [];
    for (const keyword of keywords) {
      if (!keyword || typeof keyword !== 'string') continue;
      const mapped = termMapping[keyword.toLowerCase()];
      if (mapped) {
        mappedTerms.push(...mapped);
      }
    }

    return [...new Set(mappedTerms)];
  }

  /**
   * 키워드 관련성으로 작품 순위 매기기
   */
  private rankArtworksByRelevance(artworks: FormattedArtwork[], searchKeywords: string[]): FormattedArtwork[] {
    return artworks
      .map(artwork => ({
        ...artwork,
        relevanceScore: this.calculateRelevanceScore(artwork, searchKeywords)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .map(({ relevanceScore, ...artwork }) => artwork);
  }

  /**
   * 키워드 관련성 점수 계산
   */
  private calculateRelevanceScore(artwork: FormattedArtwork, searchKeywords: string[]): number {
    let score = 0;
    const searchTerms = searchKeywords
      .filter(k => k && typeof k === 'string')
      .map(k => k.toLowerCase());

    // 제목 매칭 (높은 가중치)
    for (const term of searchTerms) {
      if (artwork.title.toLowerCase().includes(term)) {
        score += 3;
      }
    }

    // 키워드 매칭
    for (const term of searchTerms) {
      const matches = artwork.keywords.filter(k => k.includes(term) || term.includes(k));
      score += matches.length;
    }

    // 작가명 매칭
    for (const term of searchTerms) {
      if (artwork.artist.toLowerCase().includes(term)) {
        score += 2;
      }
    }

    return score;
  }

  /**
   * 부서 이름을 ID로 변환
   */
  private getDepartmentId(department: string): number {
    const departments: { [key: string]: number } = {
      'painting': 11, // European Paintings
      'sculpture': 12, // European Sculpture and Decorative Arts
      'drawing': 9, // Drawings and Prints
      'photography': 19, // Photographs
      'asian': 6, // Asian Art
      'american': 1, // American Wing
      'ancient': 3, // Ancient Near Eastern Art
      'egyptian': 10, // Egyptian Art
      'greek': 13, // Greek and Roman Art
      'islamic': 14, // Islamic Art
      'medieval': 17, // Medieval Art
      'modern': 21 // Modern Art
    };

    return departments[department.toLowerCase()] || 0;
  }

  /**
   * 캐시 관련 메서드들
   */
  private getCachedResult(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  private setCachedResult(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}