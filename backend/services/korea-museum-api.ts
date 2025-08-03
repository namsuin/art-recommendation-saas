import axios from 'axios';

interface KoreaMuseumItem {
  연번: string;
  유물번호: string;
  명칭: string;
  명칭한자?: string;
  국적_시대: string;
  재질: string;
  용도_기능: string;
  크기: string;
  설명?: string;
  이미지URL?: string;
  썸네일이미지URL?: string;
}

interface KoreaMuseumResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: {
        item: KoreaMuseumItem[];
      };
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

export class KoreaMuseumAPI {
  private baseUrl = 'http://apis.data.go.kr/1192000/museum/search/v1';
  private serviceKey: string;

  constructor(serviceKey?: string) {
    // 환경 변수에서 서비스 키를 가져오거나 기본값 사용
    this.serviceKey = serviceKey || process.env.KOREA_MUSEUM_SERVICE_KEY || '';
  }

  /**
   * 키워드로 소장품 검색
   */
  async searchByKeywords(keywords: string[], limit: number = 20): Promise<{
    success: boolean;
    artworks: any[];
    total: number;
    error?: string;
  }> {
    try {
      // 한글 키워드 우선
      const query = keywords.join(' ');
      
      const response = await axios.get(`${this.baseUrl}/getMuseumSearch`, {
        params: {
          serviceKey: this.serviceKey,
          searchText: query,
          numOfRows: limit,
          pageNo: 1,
          resultType: 'json'
        }
      });

      const searchData: KoreaMuseumResponse = response.data;
      
      if (searchData.response.header.resultCode !== '00') {
        throw new Error(searchData.response.header.resultMsg);
      }

      const items = searchData.response.body.items?.item || [];
      
      // 우리 형식으로 변환
      const formattedArtworks = items
        .filter(item => item.이미지URL) // 이미지가 있는 항목만
        .map(item => this.formatArtwork(item));

      return {
        success: true,
        artworks: formattedArtworks,
        total: searchData.response.body.totalCount
      };

    } catch (error) {
      console.error('Korea Museum API search error:', error);
      return {
        success: false,
        artworks: [],
        total: 0,
        error: error instanceof Error ? error.message : '국립중앙박물관 API 검색 실패'
      };
    }
  }

  /**
   * 시대별 검색
   */
  async searchByPeriod(period: string, limit: number = 20): Promise<{
    success: boolean;
    artworks: any[];
    error?: string;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/getMuseumSearch`, {
        params: {
          serviceKey: this.serviceKey,
          searchText: period,
          numOfRows: limit,
          pageNo: 1,
          resultType: 'json'
        }
      });

      const searchData: KoreaMuseumResponse = response.data;
      const items = searchData.response.body.items?.item || [];
      
      const formattedArtworks = items
        .filter(item => item.이미지URL && item.국적_시대.includes(period))
        .map(item => this.formatArtwork(item));

      return {
        success: true,
        artworks: formattedArtworks
      };

    } catch (error) {
      console.error('Korea Museum API period search error:', error);
      return {
        success: false,
        artworks: [],
        error: error instanceof Error ? error.message : '시대별 검색 실패'
      };
    }
  }

  /**
   * 재질별 검색
   */
  async searchByMaterial(material: string, limit: number = 20): Promise<{
    success: boolean;
    artworks: any[];
    error?: string;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/getMuseumSearch`, {
        params: {
          serviceKey: this.serviceKey,
          searchText: material,
          numOfRows: limit,
          pageNo: 1,
          resultType: 'json'
        }
      });

      const searchData: KoreaMuseumResponse = response.data;
      const items = searchData.response.body.items?.item || [];
      
      const formattedArtworks = items
        .filter(item => item.이미지URL && item.재질.includes(material))
        .map(item => this.formatArtwork(item));

      return {
        success: true,
        artworks: formattedArtworks
      };

    } catch (error) {
      console.error('Korea Museum API material search error:', error);
      return {
        success: false,
        artworks: [],
        error: error instanceof Error ? error.message : '재질별 검색 실패'
      };
    }
  }

  /**
   * 국립중앙박물관 형식을 우리 형식으로 변환
   */
  private formatArtwork(item: KoreaMuseumItem): any {
    // 키워드 추출
    const keywords = [];
    
    // 시대 정보
    if (item.국적_시대) {
      keywords.push(...item.국적_시대.split(/[,\s]+/).filter(Boolean));
    }
    
    // 재질 정보
    if (item.재질) {
      keywords.push(...item.재질.split(/[,\s]+/).filter(Boolean));
    }
    
    // 용도/기능 정보
    if (item.용도_기능) {
      keywords.push(...item.용도_기능.split(/[,\s]+/).filter(Boolean));
    }

    // 명칭에서 주요 단어 추출
    if (item.명칭) {
      const nameWords = item.명칭.split(/\s+/).filter(word => word.length > 1);
      keywords.push(...nameWords);
    }

    return {
      id: `korea_museum_${item.유물번호}`,
      title: item.명칭 || 'Untitled',
      title_hanja: item.명칭한자 || '',
      artist: '작자미상', // 대부분 작자 정보가 없음
      date: item.국적_시대 || '',
      material: item.재질 || '',
      size: item.크기 || '',
      function: item.용도_기능 || '',
      description: item.설명 || '',
      image_url: item.이미지URL,
      thumbnail_url: item.썸네일이미지URL || item.이미지URL,
      source: '국립중앙박물관',
      source_url: `https://www.museum.go.kr/site/main/relic/search/view?relicId=${item.유물번호}`,
      keywords: [...new Set(keywords)], // 중복 제거
      available: true,
      korean_heritage: true // 한국 문화재 표시
    };
  }

  /**
   * 한국 문화재 주요 카테고리
   */
  getKoreanHeritageCategories(): string[] {
    return [
      '도자기',
      '백자',
      '청자',
      '분청사기',
      '회화',
      '서예',
      '불교미술',
      '금속공예',
      '목공예',
      '석조',
      '토기',
      '와전',
      '복식',
      '무기',
      '고서'
    ];
  }

  /**
   * 한국 역사 시대
   */
  getKoreanPeriods(): string[] {
    return [
      '선사',
      '삼국',
      '통일신라',
      '고려',
      '조선',
      '대한제국',
      '일제강점기',
      '근현대'
    ];
  }
}