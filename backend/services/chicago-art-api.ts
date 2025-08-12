import axios from 'axios';

interface ChicagoArtwork {
  id: number;
  title: string;
  artist_display: string;
  date_display: string;
  medium_display: string;
  image_id: string;
  thumbnail?: {
    lqip: string;
    width: number;
    height: number;
  };
  color?: {
    h: number;
    l: number;
    s: number;
    percentage: number;
    population: number;
  };
  classification_titles?: string[];
  style_titles?: string[];
  subject_titles?: string[];
  technique_titles?: string[];
  theme_titles?: string[];
  material_titles?: string[];
}

interface ChicagoSearchResponse {
  data: ChicagoArtwork[];
  info: {
    total: number;
    limit: number;
    total_pages: number;
    current_page: number;
  };
  config: {
    iiif_url: string;
    website_url: string;
  };
}

export class ChicagoArtAPI {
  private baseUrl = 'https://api.artic.edu/api/v1';
  private iiifBaseUrl = 'https://www.artic.edu/iiif/2';

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
      // 키워드를 검색 쿼리로 변환
      const query = keywords.join(' ');
      
      const response = await axios.get(`${this.baseUrl}/artworks/search`, {
        params: {
          q: query,
          limit: limit,
          fields: 'id,title,artist_display,date_display,image_id,thumbnail,classification_titles,style_titles,subject_titles,color,medium_display'
        }
      });

      const searchData: ChicagoSearchResponse = response.data;
      
      // 이미지가 있는 작품만 필터링
      const artworksWithImages = searchData.data.filter(artwork => artwork.image_id);
      
      // 우리 형식으로 변환
      const formattedArtworks = artworksWithImages.map(artwork => this.formatArtwork(artwork, searchData.config.iiif_url));

      return {
        success: true,
        artworks: formattedArtworks,
        total: searchData.info.total
      };

    } catch (error) {
      logger.error('Chicago Art API search error:', error);
      return {
        success: false,
        artworks: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Chicago Art API 검색 실패'
      };
    }
  }

  /**
   * 특정 분류로 작품 검색
   */
  async searchByClassification(classification: string, limit: number = 20): Promise<{
    success: boolean;
    artworks: any[];
    error?: string;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/artworks`, {
        params: {
          'classification_titles': classification,
          limit: limit,
          fields: 'id,title,artist_display,date_display,image_id,thumbnail,style_titles,subject_titles,color,medium_display'
        }
      });

      const artworks = response.data.data.filter((artwork: ChicagoArtwork) => artwork.image_id);
      const formattedArtworks = artworks.map((artwork: ChicagoArtwork) => 
        this.formatArtwork(artwork, response.data.config.iiif_url)
      );

      return {
        success: true,
        artworks: formattedArtworks
      };

    } catch (error) {
      logger.error('Chicago Art API classification search error:', error);
      return {
        success: false,
        artworks: [],
        error: error instanceof Error ? error.message : 'Classification 검색 실패'
      };
    }
  }

  /**
   * Chicago Art Institute 형식을 우리 형식으로 변환
   */
  private formatArtwork(artwork: ChicagoArtwork, iiifUrl: string): any {
    // 키워드 추출
    const keywords = [
      ...(artwork.classification_titles || []),
      ...(artwork.style_titles || []),
      ...(artwork.subject_titles || []),
      ...(artwork.technique_titles || []),
      ...(artwork.theme_titles || []),
      ...(artwork.material_titles || [])
    ].filter(Boolean);

    // 이미지 URL 생성 (IIIF Image API 사용)
    const imageUrl = artwork.image_id ? 
      `${iiifUrl}/${artwork.image_id}/full/843,/0/default.jpg` : null;
    
    const thumbnailUrl = artwork.image_id ?
      `${iiifUrl}/${artwork.image_id}/full/400,/0/default.jpg` : null;

    return {
      id: `chicago_${artwork.id}`,
      title: artwork.title || 'Untitled',
      artist: artwork.artist_display || 'Unknown Artist',
      date: artwork.date_display || '',
      medium: artwork.medium_display || '',
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      source: 'Art Institute of Chicago',
      source_url: `https://www.artic.edu/artworks/${artwork.id}`,
      keywords: keywords,
      color: artwork.color ? {
        dominant_color: `hsl(${artwork.color.h}, ${artwork.color.s}%, ${artwork.color.l}%)`,
        percentage: artwork.color.percentage
      } : null,
      available: true
    };
  }

  /**
   * 유사한 작품 찾기 (색상 기반)
   */
  async findSimilarByColor(hue: number, tolerance: number = 10, limit: number = 20): Promise<{
    success: boolean;
    artworks: any[];
    error?: string;
  }> {
    try {
      // 색상 범위로 검색
      const minHue = Math.max(0, hue - tolerance);
      const maxHue = Math.min(360, hue + tolerance);

      const response = await axios.get(`${this.baseUrl}/artworks`, {
        params: {
          limit: limit,
          'color.h[gte]': minHue,
          'color.h[lte]': maxHue,
          fields: 'id,title,artist_display,date_display,image_id,thumbnail,style_titles,subject_titles,color,medium_display'
        }
      });

      const artworks = response.data.data.filter((artwork: ChicagoArtwork) => artwork.image_id);
      const formattedArtworks = artworks.map((artwork: ChicagoArtwork) => 
        this.formatArtwork(artwork, response.data.config.iiif_url)
      );

      return {
        success: true,
        artworks: formattedArtworks
      };

    } catch (error) {
      logger.error('Chicago Art API color search error:', error);
      return {
        success: false,
        artworks: [],
        error: error instanceof Error ? error.message : 'Color 검색 실패'
      };
    }
  }
}