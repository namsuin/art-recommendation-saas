import axios from 'axios';

// 한국 창작 플랫폼들을 위한 통합 API 서비스
export class KoreanCreativePlatformsAPI {
  
  /**
   * 그라폴리오 스타일 일러스트 검색 (비활성화됨)
   * NOTE: 사용자 요청에 따라 그라폴리오 제외
   */
  async searchGrafolioStyle(keywords: string[], limit: number = 20): Promise<{
    success: boolean;
    artworks: any[];
    error?: string;
  }> {
    console.log('📝 그라폴리오 검색이 비활성화되었습니다 (사용자 요청)');
    return {
      success: true,
      artworks: []
    };
  }

  /**
   * 한국 대학 졸업전시 아카이브 검색 (완전 비활성화)
   * NOTE: 사용자 요청에 따라 대학 졸업전시 완전 제외 - 데이터 생성 없음
   */
  async searchGraduationWorks(
    keywords: string[], 
    university?: string, 
    year?: string,
    limit: number = 20
  ): Promise<{
    success: boolean;
    artworks: any[];
    error?: string;
  }> {
    // 데이터 생성 자체를 중단 - Mock 데이터도 생성하지 않음
    console.log('🚫 대학 졸업전시 검색이 완전히 비활성화되었습니다. 데이터 생성 없음.');
    return {
      success: true,
      artworks: [] // 빈 배열만 반환, Mock 데이터 생성 안함
    };
  }

  /**
   * 텀블벅 창작 프로젝트 검색 (비활성화됨)
   * NOTE: 사용자 요청에 따라 텀블벅 제외
   */
  async searchTumblbugProjects(keywords: string[], limit: number = 20): Promise<{
    success: boolean;
    artworks: any[];
    error?: string;
  }> {
    console.log('📝 텀블벅 검색이 비활성화되었습니다 (사용자 요청)');
    return {
      success: true,
      artworks: []
    };
  }

  /**
   * 그라폴리오 스타일 Mock 데이터 생성 (비활성화됨)
   * NOTE: 사용자 요청에 따라 그라폴리오 제외
   */
  private generateGrafolioMockData(keywords: string[], limit: number): any[] {
    console.log('📝 그라폴리오 Mock 데이터 생성이 비활성화되었습니다');
    return [];
  }

  /**
   * 졸업작품 Mock 데이터 생성 (비활성화됨)
   * NOTE: 사용자 요청에 따라 대학 졸업전시 제외
   */
  private generateGraduationWorksMockData(
    keywords: string[], 
    university: string, 
    year?: string, 
    limit: number
  ): any[] {
    console.log('📝 졸업작품 Mock 데이터 생성이 비활성화되었습니다');
    return [];
  }

  /**
   * 텀블벅 프로젝트 Mock 데이터 생성 (비활성화됨)
   * NOTE: 사용자 요청에 따라 텀블벅 제외
   */
  private generateTumblbugMockData(keywords: string[], limit: number): any[] {
    console.log('📝 텀블벅 Mock 데이터 생성이 비활성화되었습니다');
    return [];
  }

  /**
   * 모든 한국 창작 플랫폼에서 통합 검색 (완전 비활성화)
   * NOTE: 사용자 요청에 따라 모든 한국 창작 플랫폼 완전 제외 - 데이터 생성 없음
   */
  async searchAllKoreanPlatforms(
    keywords: string[], 
    platforms: string[] = [],
    limit: number = 10
  ): Promise<{
    success: boolean;
    results: any[];
    totalCount: number;
    error?: string;
  }> {
    // 완전 비활성화 - 어떤 데이터도 생성하지 않음
    console.log('🚫 한국 창작 플랫폼 검색이 완전히 비활성화되었습니다. 모든 데이터 생성 중단.');
    
    // 빈 결과만 반환, Mock 데이터 생성 안함
    return {
      success: true,
      results: [], // 완전히 빈 배열
      totalCount: 0
    };
  }

  /**
   * 키워드 관련성에 따른 정렬
   */
  private sortByRelevance(artworks: any[], keywords: string[]): any[] {
    return artworks.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, keywords);
      const bScore = this.calculateRelevanceScore(b, keywords);
      return bScore - aScore;
    });
  }

  /**
   * 관련성 점수 계산
   */
  private calculateRelevanceScore(artwork: any, keywords: string[]): number {
    let score = 0;
    const searchText = `${artwork.title} ${artwork.keywords?.join(' ') || ''} ${artwork.category || ''}`.toLowerCase();
    
    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (searchText.includes(keywordLower)) {
        score += 10;
      }
      if (artwork.title?.toLowerCase().includes(keywordLower)) {
        score += 5;
      }
    });

    // 플랫폼별 가중치 (텀블벅, 그라폴리오 제외)
    if (artwork.platform === 'university') score += 3;

    return score;
  }
}