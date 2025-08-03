import axios from 'axios';

interface RijksmuseumArtwork {
  id: string;
  objectNumber: string;
  title: string;
  longTitle: string;
  principalOrFirstMaker: string;
  dating?: {
    presentingDate: string;
    sortingDate: number;
    period: number;
  };
  webImage?: {
    url: string;
    width: number;
    height: number;
  };
  headerImage?: {
    url: string;
    width: number;
    height: number;
  };
  productionPlaces?: string[];
  materials?: string[];
  techniques?: string[];
  objectTypes?: string[];
  colors?: string[];
  normalized32Colors?: string[];
}

interface RijksmuseumSearchResponse {
  artObjects: RijksmuseumArtwork[];
  count: number;
  countFacets: {
    hasimage: number;
    ondisplay: number;
  };
}

export class RijksmuseumAPI {
  private baseUrl = 'https://www.rijksmuseum.nl/api/en';
  private apiKey: string;

  constructor(apiKey?: string) {
    // 환경 변수에서 API 키를 가져오거나 기본값 사용
    this.apiKey = apiKey || process.env.RIJKSMUSEUM_API_KEY || 'fakekey'; // 실제 사용시 유효한 키 필요
  }

  /**
   * 키워드로 작품 검색
   */
  async searchByKeywords(keywords: string[], limit: number = 20): Promise<{
    success: boolean;
    artworks: any[];
    total: number;
    error?: string;
  }> {
    try {
      const query = keywords.join(' ');
      
      const response = await axios.get(`${this.baseUrl}/collection`, {
        params: {
          key: this.apiKey,
          q: query,
          ps: limit, // page size
          imgonly: true, // 이미지가 있는 작품만
          format: 'json',
          culture: 'en'
        }
      });

      const searchData: RijksmuseumSearchResponse = response.data;
      
      // 우리 형식으로 변환
      const formattedArtworks = searchData.artObjects.map(artwork => this.formatArtwork(artwork));

      return {
        success: true,
        artworks: formattedArtworks,
        total: searchData.count
      };

    } catch (error) {
      console.error('Rijksmuseum API search error:', error);
      return {
        success: false,
        artworks: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Rijksmuseum API 검색 실패'
      };
    }
  }

  /**
   * 특정 아티스트의 작품 검색
   */
  async searchByArtist(artistName: string, limit: number = 20): Promise<{
    success: boolean;
    artworks: any[];
    error?: string;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/collection`, {
        params: {
          key: this.apiKey,
          involvedMaker: artistName,
          ps: limit,
          imgonly: true,
          format: 'json'
        }
      });

      const artworks = response.data.artObjects;
      const formattedArtworks = artworks.map((artwork: RijksmuseumArtwork) => 
        this.formatArtwork(artwork)
      );

      return {
        success: true,
        artworks: formattedArtworks
      };

    } catch (error) {
      console.error('Rijksmuseum API artist search error:', error);
      return {
        success: false,
        artworks: [],
        error: error instanceof Error ? error.message : 'Artist 검색 실패'
      };
    }
  }

  /**
   * 색상으로 작품 검색
   */
  async searchByColor(hexColor: string, limit: number = 20): Promise<{
    success: boolean;
    artworks: any[];
    error?: string;
  }> {
    try {
      // Rijksmuseum은 정규화된 32가지 색상으로 검색
      const response = await axios.get(`${this.baseUrl}/collection`, {
        params: {
          key: this.apiKey,
          'f.normalized32Colors.hex': hexColor,
          ps: limit,
          imgonly: true,
          format: 'json'
        }
      });

      const artworks = response.data.artObjects;
      const formattedArtworks = artworks.map((artwork: RijksmuseumArtwork) => 
        this.formatArtwork(artwork)
      );

      return {
        success: true,
        artworks: formattedArtworks
      };

    } catch (error) {
      console.error('Rijksmuseum API color search error:', error);
      return {
        success: false,
        artworks: [],
        error: error instanceof Error ? error.message : 'Color 검색 실패'
      };
    }
  }

  /**
   * Rijksmuseum 형식을 우리 형식으로 변환
   */
  private formatArtwork(artwork: RijksmuseumArtwork): any {
    // 키워드 추출
    const keywords = [
      ...(artwork.objectTypes || []),
      ...(artwork.materials || []),
      ...(artwork.techniques || []),
      ...(artwork.productionPlaces || [])
    ].filter(Boolean);

    // 색상 정보가 있으면 추가
    if (artwork.colors && artwork.colors.length > 0) {
      keywords.push(...artwork.colors);
    }

    // 이미지 URL 선택 (webImage 우선, 없으면 headerImage)
    const imageUrl = artwork.webImage?.url || artwork.headerImage?.url || null;
    
    // 썸네일은 원본 이미지에 크기 파라미터 추가
    const thumbnailUrl = imageUrl ? imageUrl.replace('=s0', '=s400') : null;

    return {
      id: `rijks_${artwork.objectNumber}`,
      title: artwork.title || artwork.longTitle || 'Untitled',
      artist: artwork.principalOrFirstMaker || 'Unknown Artist',
      date: artwork.dating?.presentingDate || '',
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      source: 'Rijksmuseum',
      source_url: `https://www.rijksmuseum.nl/en/collection/${artwork.objectNumber}`,
      keywords: keywords,
      colors: artwork.normalized32Colors || [],
      available: true
    };
  }

  /**
   * 여러 컬렉션 카테고리
   */
  async getCollectionCategories(): Promise<string[]> {
    return [
      'painting',
      'print',
      'drawing',
      'photograph',
      'sculpture',
      'ceramic',
      'furniture',
      'jewellery',
      'fashion',
      'weapon'
    ];
  }
}