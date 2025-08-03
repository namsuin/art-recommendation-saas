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
   * 한국 대학 졸업전시 아카이브 검색 (비활성화됨)
   * NOTE: 사용자 요청에 따라 대학 졸업전시 제외
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
    console.log('📝 대학 졸업전시 검색이 비활성화되었습니다 (사용자 요청)');
    return {
      success: true,
      artworks: []
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
   * 모든 한국 창작 플랫폼에서 통합 검색 (텀블벅, 그라폴리오, 대학 졸업전시 제외)
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
    console.log('📝 한국 창작 플랫폼 검색: 모든 플랫폼이 비활성화되었습니다 (사용자 요청)');
    
    // 텀블벅, 그라폴리오, 대학 졸업전시 모두 제외되어 빈 결과 반환
    return {
      success: true,
      results: [],
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