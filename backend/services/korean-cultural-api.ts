import axios from 'axios';

interface CulturalContent {
  seq: string;
  title: string;
  startDate: string;
  endDate: string;
  place: string;
  realmName: string;
  area: string;
  thumbnail: string;
  gpsX: string;
  gpsY: string;
  charge: string;
  eventSite: string;
  phone: string;
  contents1: string;
  contents2: string;
}

interface CulturalApiResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items?: {
        item: CulturalContent[];
      };
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

export class KoreanCulturalAPI {
  private baseUrl = 'http://www.culture.go.kr/openapi/rest/publicperformancedisplays/period';
  private serviceKey: string;

  constructor(serviceKey?: string) {
    this.serviceKey = serviceKey || process.env.KOREAN_CULTURAL_SERVICE_KEY || '';
  }

  /**
   * 키워드로 문화 행사/전시 검색
   */
  async searchCulturalEvents(keywords: string[], limit: number = 20): Promise<{
    success: boolean;
    artworks: any[];
    total: number;
    error?: string;
  }> {
    try {
      const today = new Date();
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(today.getMonth() - 1);
      
      const startDate = oneMonthAgo.toISOString().split('T')[0].replace(/-/g, '');
      const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0].replace(/-/g, '');

      const query = keywords.join(' ');

      const response = await axios.get(this.baseUrl, {
        params: {
          serviceKey: this.serviceKey,
          keyword: query,
          sortStdr: '1', // 등록일순
          ComMsgHeader: '',
          RequestTime: '',
          CallBackURI: '',
          MsgBody: '',
          from: startDate,
          to: endDate,
          cPage: 1,
          rows: limit,
          place: '', // 지역 미지정
          gpsxfrom: '',
          gpsyfrom: '',
          gpsxto: '',
          gpsyto: '',
          keyword: query
        }
      });

      const apiData: CulturalApiResponse = response.data;

      if (apiData.response.header.resultCode !== '0000') {
        throw new Error(apiData.response.header.resultMsg);
      }

      const items = apiData.response.body.items?.item || [];
      
      // 예술/전시 관련 필터링
      const artRelatedItems = items.filter(item => 
        item.realmName.includes('미술') || 
        item.realmName.includes('전시') ||
        item.realmName.includes('갤러리') ||
        item.realmName.includes('작품') ||
        item.title.includes('전시') ||
        item.title.includes('미술') ||
        item.title.includes('작품')
      );

      const formattedArtworks = artRelatedItems.map(item => this.formatCulturalContent(item));

      return {
        success: true,
        artworks: formattedArtworks,
        total: apiData.response.body.totalCount
      };

    } catch (error) {
      console.error('Korean Cultural API search error:', error);
      return {
        success: false,
        artworks: [],
        total: 0,
        error: error instanceof Error ? error.message : '한국문화정보원 API 검색 실패'
      };
    }
  }

  /**
   * 지역별 문화 행사 검색
   */
  async searchByRegion(region: string, artType?: string, limit: number = 20): Promise<{
    success: boolean;
    artworks: any[];
    error?: string;
  }> {
    try {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0].replace(/-/g, '');
      const endDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0].replace(/-/g, '');

      const response = await axios.get(this.baseUrl, {
        params: {
          serviceKey: this.serviceKey,
          sortStdr: '1',
          from: startDate,
          to: endDate,
          cPage: 1,
          rows: limit,
          place: region,
          keyword: artType || '미술 전시'
        }
      });

      const apiData: CulturalApiResponse = response.data;
      const items = apiData.response.body.items?.item || [];
      
      const formattedArtworks = items.map(item => this.formatCulturalContent(item));

      return {
        success: true,
        artworks: formattedArtworks
      };

    } catch (error) {
      console.error('Korean Cultural API region search error:', error);
      return {
        success: false,
        artworks: [],
        error: error instanceof Error ? error.message : '지역별 검색 실패'
      };
    }
  }

  /**
   * 한국문화정보원 데이터를 우리 형식으로 변환
   */
  private formatCulturalContent(item: CulturalContent): any {
    // 키워드 추출
    const keywords = [];
    
    // 분야명에서 키워드 추출
    if (item.realmName) {
      keywords.push(...item.realmName.split(/[,\s]+/).filter(Boolean));
    }
    
    // 제목에서 주요 키워드 추출
    if (item.title) {
      const titleWords = item.title.split(/[\s,\-()]+/)
        .filter(word => word.length > 1 && !['전시', '공연', '행사'].includes(word));
      keywords.push(...titleWords);
    }

    // 장소에서 키워드 추출
    if (item.place) {
      const placeWords = item.place.split(/[\s,]+/)
        .filter(word => ['미술관', '갤러리', '문화센터', '박물관'].some(type => word.includes(type)));
      keywords.push(...placeWords);
    }

    // 이미지 URL 처리
    let imageUrl = item.thumbnail;
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `https://www.culture.go.kr${imageUrl}`;
    }

    return {
      id: `korean_cultural_${item.seq}`,
      title: item.title || 'Untitled',
      artist: this.extractArtistFromTitle(item.title) || '주최: ' + (item.place?.split(' ')[0] || '문화기관'),
      date: `${item.startDate} ~ ${item.endDate}`,
      place: item.place || '',
      area: item.area || '',
      image_url: imageUrl,
      thumbnail_url: imageUrl,
      source: '한국문화정보원',
      source_url: item.eventSite || `https://www.culture.go.kr/tm/tmEvent.do?seq=${item.seq}`,
      keywords: [...new Set(keywords)], // 중복 제거
      category: item.realmName || '문화행사',
      charge: item.charge || '정보없음',
      phone: item.phone || '',
      description: item.contents1 || item.contents2 || '',
      coordinates: item.gpsX && item.gpsY ? {
        x: parseFloat(item.gpsX),
        y: parseFloat(item.gpsY)
      } : null,
      available: true,
      korean_cultural: true,
      event_type: 'exhibition'
    };
  }

  /**
   * 제목에서 작가명 추출 시도
   */
  private extractArtistFromTitle(title: string): string | null {
    if (!title) return null;

    // "작가명 개인전", "작가명 작품전" 등의 패턴 찾기
    const patterns = [
      /^([가-힣]{2,4})\s*(개인전|작품전|전시|展)/,
      /([가-힣]{2,4})\s*작가/,
      /작가\s*([가-힣]{2,4})/,
      /^([A-Za-z\s]{2,20})\s*(Exhibition|Solo|Show)/i
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * 한국 문화 카테고리
   */
  getKoreanCulturalCategories(): string[] {
    return [
      '미술',
      '전시',
      '갤러리',
      '조각',
      '회화',
      '설치미술',
      '현대미술',
      '전통미술',
      '공예',
      '디자인',
      '사진',
      '영상미술'
    ];
  }

  /**
   * 주요 도시/지역
   */
  getKoreanRegions(): string[] {
    return [
      '서울',
      '부산',
      '대구',
      '인천',
      '광주',
      '대전',
      '울산',
      '세종',
      '경기',
      '강원',
      '충북',
      '충남',
      '전북',
      '전남',
      '경북',
      '경남',
      '제주'
    ];
  }
}