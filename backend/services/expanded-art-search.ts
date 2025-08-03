import { ChicagoArtAPI } from './chicago-art-api';
import { RijksmuseumAPI } from './rijksmuseum-api';
import { KoreaMuseumAPI } from './korea-museum-api';
import { MetMuseumAPI } from './met-museum-api';
import { ArtsyIntegration } from './artsy-integration';
import { KoreanCulturalAPI } from './korean-cultural-api';
import { KoreanCreativePlatformsAPI } from './korean-creative-platforms';
import { ArtsoniaAPI } from './artsonia-api';
import { AcademyArtAPI } from './academy-art-api';
import { BluethumbAPI } from './bluethumb-api';
import { DegreeArtAPI } from './degreeart-api';
import { SVABfaAPI } from './sva-bfa-api';

export interface ExpandedSearchOptions {
  sources?: ('met' | 'artsy' | 'chicago' | 'rijksmuseum' | 'korea' | 'korean-cultural' | 'korean-creative' | 'artsonia' | 'academy-art' | 'bluethumb' | 'degreeart' | 'sva-bfa')[];
  limit?: number;
  includeKorean?: boolean;
  includeStudentArt?: boolean;
  includeInternational?: boolean;
  sortBySimilarity?: boolean;
}

export class ExpandedArtSearchService {
  private chicagoAPI: ChicagoArtAPI;
  private rijksmuseumAPI: RijksmuseumAPI;
  private koreaMuseumAPI: KoreaMuseumAPI;
  private metMuseumAPI: MetMuseumAPI;
  private artsyAPI: ArtsyIntegration;
  private koreanCulturalAPI: KoreanCulturalAPI;
  private koreanCreativeAPI: KoreanCreativePlatformsAPI;
  private artsoniaAPI: ArtsoniaAPI;
  private academyArtAPI: AcademyArtAPI;
  private bluethumbAPI: BluethumbAPI;
  private degreeArtAPI: DegreeArtAPI;
  private svaBfaAPI: SVABfaAPI;

  constructor() {
    this.chicagoAPI = new ChicagoArtAPI();
    this.rijksmuseumAPI = new RijksmuseumAPI();
    this.koreaMuseumAPI = new KoreaMuseumAPI();
    this.metMuseumAPI = new MetMuseumAPI();
    this.artsyAPI = new ArtsyIntegration();
    this.koreanCulturalAPI = new KoreanCulturalAPI();
    this.koreanCreativeAPI = new KoreanCreativePlatformsAPI();
    this.artsoniaAPI = new ArtsoniaAPI();
    this.academyArtAPI = new AcademyArtAPI();
    this.bluethumbAPI = new BluethumbAPI();
    this.degreeArtAPI = new DegreeArtAPI();
    this.svaBfaAPI = new SVABfaAPI();
  }

  /**
   * 모든 소스에서 통합 검색
   */
  async searchAllSources(
    keywords: string[], 
    options: ExpandedSearchOptions = {}
  ): Promise<{
    success: boolean;
    results: {
      source: string;
      artworks: any[];
      total: number;
    }[];
    totalArtworks: number;
    error?: string;
  }> {
    const {
      sources = ['met', 'chicago', 'rijksmuseum', 'korea', 'artsy', 'korean-cultural', 'artsonia', 'academy-art', 'bluethumb', 'degreeart', 'sva-bfa'],
      // NOTE: 'korean-creative' 기본 목록에서 완전 제거됨 - 한국 대학교 졸업전시 방지
      limit = 10,
      includeKorean = true,
      includeStudentArt = false,
      includeInternational = true
    } = options;

    const searchPromises = [];
    const searchSources: string[] = [];

    // Met Museum
    if (sources.includes('met')) {
      searchPromises.push(this.metMuseumAPI.searchByKeywords(keywords, limit));
      searchSources.push('met');
    }

    // Art Institute of Chicago
    if (sources.includes('chicago')) {
      searchPromises.push(this.chicagoAPI.searchByKeywords(keywords, limit));
      searchSources.push('chicago');
    }

    // Rijksmuseum
    if (sources.includes('rijksmuseum')) {
      searchPromises.push(this.rijksmuseumAPI.searchByKeywords(keywords, limit));
      searchSources.push('rijksmuseum');
    }

    // 국립중앙박물관 (한국어 키워드가 있거나 includeKorean이 true일 때)
    if (sources.includes('korea') && includeKorean) {
      // 영어 키워드를 한국어로 변환하거나 그대로 사용
      const koreanKeywords = this.translateToKorean(keywords);
      searchPromises.push(this.koreaMuseumAPI.searchByKeywords(koreanKeywords, limit));
      searchSources.push('korea');
    }

    // 한국문화정보원 (includeKorean이 true일 때)
    if (sources.includes('korean-cultural') && includeKorean) {
      const koreanKeywords = this.translateToKorean(keywords);
      searchPromises.push(this.koreanCulturalAPI.searchCulturalEvents(koreanKeywords, limit));
      searchSources.push('korean-cultural');
    }

    // 한국 창작 플랫폼들 (완전 제거됨)
    // NOTE: 사용자 요청에 따라 한국 창작 플랫폼 완전 제거 - 검색 자체를 하지 않음
    if (sources.includes('korean-creative') && includeKorean) {
      console.log('🚫 한국 창작 플랫폼이 완전히 제거되었습니다. 검색하지 않음.');
      // 어떤 검색도 하지 않음 - 완전히 건너뜀
    }

    // Artsy
    if (sources.includes('artsy')) {
      searchPromises.push(this.artsyAPI.searchByKeywords(keywords, limit));
      searchSources.push('artsy');
    }

    // Artsonia 학생 작품 (includeStudentArt이 true일 때)
    if (sources.includes('artsonia') && includeStudentArt) {
      searchPromises.push(this.artsoniaAPI.searchByKeywords(keywords, limit));
      searchSources.push('artsonia');
    }

    // Academy of Art University 학생 작품 (includeStudentArt이 true일 때)
    if (sources.includes('academy-art') && includeStudentArt) {
      searchPromises.push(this.academyArtAPI.searchByKeywords(keywords, limit));
      searchSources.push('academy-art');
    }

    // Bluethumb 호주 아트 마켓플레이스 (includeInternational이 true일 때)
    if (sources.includes('bluethumb') && includeInternational) {
      searchPromises.push(this.bluethumbAPI.searchByKeywords(keywords, limit));
      searchSources.push('bluethumb');
    }

    // DegreeArt 영국 아트 플랫폼 (includeInternational이 true일 때)
    if (sources.includes('degreeart') && includeInternational) {
      searchPromises.push(this.degreeArtAPI.searchByKeywords(keywords, limit));
      searchSources.push('degreeart');
    }

    // SVA BFA Fine Arts 학생 작품 (includeStudentArt이 true일 때)
    if (sources.includes('sva-bfa') && includeStudentArt) {
      searchPromises.push(this.svaBfaAPI.searchByKeywords(keywords, limit));
      searchSources.push('sva-bfa');
    }

    try {
      const results = await Promise.allSettled(searchPromises);
      
      const formattedResults = results.map((result, index) => {
        const source = searchSources[index];
        
        if (result.status === 'fulfilled' && result.value.success) {
          // 한국 창작 플랫폼의 경우 results 배열에서 artworks 추출
          let artworks = result.value.artworks || [];
          let total = result.value.total || 0;
          
          if (source === 'korean-creative' && result.value.results) {
            artworks = result.value.results;
            total = result.value.totalCount || result.value.results.length;
          }
          
          return {
            source: this.getSourceDisplayName(source),
            artworks: artworks,
            total: total
          };
        } else {
          console.error(`${source} search failed:`, result);
          return {
            source: this.getSourceDisplayName(source),
            artworks: [],
            total: 0
          };
        }
      });

      const totalArtworks = formattedResults.reduce((sum, result) => 
        sum + result.artworks.length, 0
      );

      return {
        success: true,
        results: formattedResults,
        totalArtworks
      };

    } catch (error) {
      console.error('Expanded art search error:', error);
      return {
        success: false,
        results: [],
        totalArtworks: 0,
        error: error instanceof Error ? error.message : '통합 검색 실패'
      };
    }
  }

  /**
   * 색상 기반 검색 (지원하는 API만)
   */
  async searchByColor(
    hexColor: string, 
    options: ExpandedSearchOptions = {}
  ): Promise<{
    success: boolean;
    results: any[];
    error?: string;
  }> {
    const { limit = 10 } = options;
    const searchPromises = [];

    // Rijksmuseum은 색상 검색 지원
    searchPromises.push(this.rijksmuseumAPI.searchByColor(hexColor, limit));

    // Chicago는 HSL 색상으로 검색 (hex를 hsl로 변환 필요)
    const hue = this.hexToHue(hexColor);
    if (hue !== null) {
      searchPromises.push(this.chicagoAPI.findSimilarByColor(hue, 15, limit));
    }

    try {
      const results = await Promise.allSettled(searchPromises);
      const allArtworks: any[] = [];

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          allArtworks.push(...result.value.artworks);
        }
      });

      return {
        success: true,
        results: allArtworks
      };

    } catch (error) {
      return {
        success: false,
        results: [],
        error: error instanceof Error ? error.message : '색상 검색 실패'
      };
    }
  }

  /**
   * 한국 문화재 특화 검색
   */
  async searchKoreanHeritage(
    category: string,
    period?: string,
    limit: number = 20
  ): Promise<{
    success: boolean;
    artworks: any[];
    error?: string;
  }> {
    try {
      let searchQuery = category;
      if (period) {
        searchQuery = `${period} ${category}`;
      }

      return await this.koreaMuseumAPI.searchByKeywords([searchQuery], limit);

    } catch (error) {
      return {
        success: false,
        artworks: [],
        error: error instanceof Error ? error.message : '한국 문화재 검색 실패'
      };
    }
  }

  /**
   * 학생 작품 전용 검색 (교육 목적)
   */
  async searchStudentArt(
    keywords: string[],
    grade?: 'elementary' | 'middle' | 'high',
    project?: string,
    limit: number = 20
  ): Promise<{
    success: boolean;
    artworks: any[];
    total: number;
    educational_notice: string;
    error?: string;
  }> {
    try {
      let searchResult;
      
      if (grade) {
        searchResult = await this.artsoniaAPI.searchByGrade(grade, keywords, limit);
      } else if (project) {
        searchResult = await this.artsoniaAPI.searchByProject(project, keywords, limit);
      } else {
        searchResult = await this.artsoniaAPI.searchByKeywords(keywords, limit);
      }

      return {
        ...searchResult,
        educational_notice: '🎓 교육 목적으로만 사용되며, 학생 프라이버시가 보호됩니다. (COPPA/FERPA 준수)'
      };

    } catch (error) {
      return {
        success: false,
        artworks: [],
        total: 0,
        educational_notice: '교육적 사용을 위한 Mock 데이터입니다.',
        error: error instanceof Error ? error.message : '학생 작품 검색 실패'
      };
    }
  }

  /**
   * Academy of Art University 전용 검색
   */
  async searchAcademyArt(
    keywords: string[],
    options: {
      school?: string;
      level?: 'undergraduate' | 'graduate';
      springShow?: boolean;
      limit?: number;
    } = {}
  ): Promise<{
    success: boolean;
    artworks: any[];
    total: number;
    university: string;
    error?: string;
  }> {
    try {
      const { school, level, springShow = false, limit = 20 } = options;
      
      let searchResult;
      
      if (springShow) {
        searchResult = await this.academyArtAPI.searchSpringShow(keywords, limit);
      } else if (school) {
        searchResult = await this.academyArtAPI.searchBySchool(school, keywords, limit);
      } else if (level) {
        searchResult = await this.academyArtAPI.searchByLevel(level, keywords, limit);
      } else {
        searchResult = await this.academyArtAPI.searchByKeywords(keywords, limit);
      }

      return {
        success: searchResult.success,
        artworks: searchResult.artworks,
        total: searchResult.total,
        university: 'Academy of Art University',
        error: searchResult.error
      };

    } catch (error) {
      return {
        success: false,
        artworks: [],
        total: 0,
        university: 'Academy of Art University',
        error: error instanceof Error ? error.message : 'Academy of Art University 검색 실패'
      };
    }
  }

  /**
   * Bluethumb 호주 아트 마켓플레이스 전용 검색
   */
  async searchBluethumb(
    keywords: string[],
    options: {
      category?: string;
      priceRange?: string;
      aboriginalArt?: boolean;
      limit?: number;
    } = {}
  ): Promise<{
    success: boolean;
    artworks: any[];
    total: number;
    marketplace: string;
    error?: string;
  }> {
    try {
      const { category, priceRange, aboriginalArt = false, limit = 20 } = options;
      
      let searchResult;
      
      if (aboriginalArt) {
        searchResult = await this.bluethumbAPI.searchAboriginalArt(keywords, limit);
      } else if (category) {
        searchResult = await this.bluethumbAPI.searchByCategory(category, keywords, limit);
      } else if (priceRange) {
        searchResult = await this.bluethumbAPI.searchByPriceRange(priceRange, keywords, limit);
      } else {
        searchResult = await this.bluethumbAPI.searchByKeywords(keywords, limit);
      }

      return {
        success: searchResult.success,
        artworks: searchResult.artworks,
        total: searchResult.total,
        marketplace: 'Bluethumb Australia',
        error: searchResult.error
      };

    } catch (error) {
      return {
        success: false,
        artworks: [],
        total: 0,
        marketplace: 'Bluethumb Australia',
        error: error instanceof Error ? error.message : 'Bluethumb 검색 실패'
      };
    }
  }

  /**
   * DegreeArt 영국 아트 플랫폼 전용 검색
   */
  async searchDegreeArt(
    keywords: string[],
    options: {
      medium?: string;
      theme?: string;
      priceRange?: string;
      emergingArtists?: boolean;
      limit?: number;
    } = {}
  ): Promise<{
    success: boolean;
    artworks: any[];
    total: number;
    platform: string;
    error?: string;
  }> {
    try {
      const { medium, theme, priceRange, emergingArtists = false, limit = 20 } = options;
      
      let searchResult;
      
      if (emergingArtists) {
        searchResult = await this.degreeArtAPI.searchEmergingArtists(keywords, limit);
      } else if (medium) {
        searchResult = await this.degreeArtAPI.searchByMedium(medium, keywords, limit);
      } else if (theme) {
        searchResult = await this.degreeArtAPI.searchByTheme(theme, keywords, limit);
      } else if (priceRange) {
        searchResult = await this.degreeArtAPI.searchByPriceRange(priceRange, keywords, limit);
      } else {
        searchResult = await this.degreeArtAPI.searchByKeywords(keywords, limit);
      }

      return {
        success: searchResult.success,
        artworks: searchResult.artworks,
        total: searchResult.total,
        platform: 'DegreeArt UK',
        error: searchResult.error
      };

    } catch (error) {
      return {
        success: false,
        artworks: [],
        total: 0,
        platform: 'DegreeArt UK',
        error: error instanceof Error ? error.message : 'DegreeArt 검색 실패'
      };
    }
  }

  /**
   * SVA BFA Fine Arts 전용 검색
   */
  async searchSVABfa(
    keywords: string[],
    options: {
      concentration?: string;
      exhibitionType?: string;
      academicLevel?: string;
      seniorThesis?: boolean;
      limit?: number;
    } = {}
  ): Promise<{
    success: boolean;
    artworks: any[];
    total: number;
    school: string;
    error?: string;
  }> {
    try {
      const { concentration, exhibitionType, academicLevel, seniorThesis = false, limit = 20 } = options;
      
      let searchResult;
      
      if (seniorThesis) {
        searchResult = await this.svaBfaAPI.searchSeniorThesis(keywords, limit);
      } else if (concentration) {
        searchResult = await this.svaBfaAPI.searchByConcentration(concentration, keywords, limit);
      } else if (exhibitionType) {
        searchResult = await this.svaBfaAPI.searchByExhibition(exhibitionType, undefined, keywords, limit);
      } else if (academicLevel) {
        searchResult = await this.svaBfaAPI.searchByAcademicLevel(academicLevel, keywords, limit);
      } else {
        searchResult = await this.svaBfaAPI.searchByKeywords(keywords, limit);
      }

      return {
        success: searchResult.success,
        artworks: searchResult.artworks,
        total: searchResult.total,
        school: 'SVA BFA Fine Arts',
        error: searchResult.error
      };

    } catch (error) {
      return {
        success: false,
        artworks: [],
        total: 0,
        school: 'SVA BFA Fine Arts',
        error: error instanceof Error ? error.message : 'SVA BFA 검색 실패'
      };
    }
  }

  /**
   * 소스별 표시 이름
   */
  private getSourceDisplayName(source: string): string {
    const names: Record<string, string> = {
      met: 'Metropolitan Museum',
      chicago: 'Art Institute of Chicago',
      rijksmuseum: 'Rijksmuseum',
      korea: '국립중앙박물관',
      artsy: 'Artsy',
      'korean-cultural': '한국문화정보원',
      'korean-creative': '한국 창작 플랫폼',
      artsonia: 'Artsonia (학생 작품)',
      'academy-art': 'Academy of Art University',
      bluethumb: 'Bluethumb (호주)',
      degreeart: 'DegreeArt (영국)',
      'sva-bfa': 'SVA BFA Fine Arts'
    };
    return names[source] || source;
  }

  /**
   * 간단한 영어-한국어 키워드 변환
   */
  private translateToKorean(keywords: string[]): string[] {
    const translations: Record<string, string> = {
      'painting': '회화',
      'ceramic': '도자기',
      'pottery': '도기',
      'porcelain': '자기',
      'sculpture': '조각',
      'buddha': '불상',
      'buddhist': '불교',
      'landscape': '산수화',
      'portrait': '초상화',
      'calligraphy': '서예',
      'ink': '수묵',
      'gold': '금',
      'silver': '은',
      'bronze': '청동',
      'iron': '철',
      'wood': '목',
      'stone': '석',
      'jade': '옥',
      'silk': '비단',
      'paper': '종이',
      'ancient': '고대',
      'traditional': '전통',
      'royal': '왕실',
      'temple': '사찰',
      'palace': '궁궐'
    };

    return keywords.map(keyword => 
      translations[keyword.toLowerCase()] || keyword
    );
  }

  /**
   * Hex 색상을 Hue 값으로 변환
   */
  private hexToHue(hex: string): number | null {
    // #RRGGBB 형식에서 RGB 추출
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;

    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    if (delta === 0) return 0;

    let hue;
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }

    return Math.round(hue * 60);
  }
}