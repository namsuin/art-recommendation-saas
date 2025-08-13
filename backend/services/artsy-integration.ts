import { logger } from '../../shared/logger';
import axios from 'axios';

interface ArtsyArtwork {
  id: string;
  title: string;
  artist: {
    name: string;
    id: string;
  };
  images: Array<{
    url: string;
    position: number;
  }>;
  category: string;
  medium: string;
  date: string;
  collecting_institution: string;
  partner: {
    name: string;
    type: string;
  };
  _links: {
    permalink: {
      href: string;
    };
  };
}

interface ArtsySearchResult {
  artworks: ArtsyArtwork[];
  total: number;
  source: 'artsy';
}

export class ArtsyIntegration {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.clientId = process.env.ARTSY_CLIENT_ID || '';
    this.clientSecret = process.env.ARTSY_CLIENT_SECRET || '';
  }

  /**
   * Artsy API 인증 토큰 획득
   */
  private async authenticate(): Promise<boolean> {
    // 기존 토큰이 유효한지 확인
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return true;
    }

    if (!this.clientId || !this.clientSecret) {
      logger.warn('Artsy API credentials not configured');
      return false;
    }

    try {
      const response = await axios.post('https://api.artsy.net/api/tokens/xapp_token', {
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      this.accessToken = response.data.token;
      this.tokenExpiry = new Date(response.data.expires_at);
      
      logger.info('✅ Artsy API authenticated successfully');
      return true;
    } catch (error) {
      logger.error('Failed to authenticate with Artsy API:', error);
      return false;
    }
  }

  /**
   * 키워드로 Artsy 작품 검색
   */
  async searchByKeywords(keywords: string[], limit: number = 20): Promise<ArtsySearchResult> {
    const isAuthenticated = await this.authenticate();
    
    if (!isAuthenticated) {
      logger.warn('Artsy API not available - returning empty results');
      return { artworks: [], total: 0, source: 'artsy' };
    }

    try {
      // 키워드를 검색 쿼리로 변환
      const query = keywords.join(' ');
      
      // Artsy Search API 사용
      const response = await axios.get('https://api.artsy.net/api/search', {
        headers: {
          'X-Xapp-Token': this.accessToken,
          'Accept': 'application/vnd.artsy-v2+json'
        },
        params: {
          q: query,
          type: 'artwork',
          size: limit
        }
      });

      // 검색 결과에서 artwork ID 추출
      const artworkIds = response.data._embedded.results
        .filter((result: any) => result.type === 'artwork')
        .map((result: any) => result._links.self.href.split('/').pop());

      // 각 artwork의 상세 정보 조회
      const artworks = await Promise.all(
        artworkIds.slice(0, limit).map((id: string) => this.getArtworkDetails(id))
      );

      const validArtworks = artworks.filter(artwork => artwork !== null) as ArtsyArtwork[];

      return {
        artworks: validArtworks,
        total: response.data.total_count || validArtworks.length,
        source: 'artsy'
      };

    } catch (error) {
      logger.error('Artsy search failed:', error);
      return { artworks: [], total: 0, source: 'artsy' };
    }
  }

  /**
   * 특정 작품의 상세 정보 조회
   */
  private async getArtworkDetails(artworkId: string): Promise<ArtsyArtwork | null> {
    try {
      const response = await axios.get(`https://api.artsy.net/api/artworks/${artworkId}`, {
        headers: {
          'X-Xapp-Token': this.accessToken,
          'Accept': 'application/vnd.artsy-v2+json'
        }
      });

      const artwork = response.data;
      
      return {
        id: artwork.id,
        title: artwork.title,
        artist: {
          name: artwork.artists?.[0]?.name || 'Unknown Artist',
          id: artwork.artists?.[0]?.id || ''
        },
        images: artwork._embedded?.images?.map((img: any, index: number) => ({
          url: img._links?.large?.href || img._links?.medium?.href || img._links?.thumbnail?.href,
          position: index
        })) || [],
        category: artwork.category || '',
        medium: artwork.medium || '',
        date: artwork.date || '',
        collecting_institution: artwork.collecting_institution || '',
        partner: {
          name: artwork.partner?.name || '',
          type: artwork.partner?.type || ''
        },
        _links: {
          permalink: {
            href: `https://www.artsy.net/artwork/${artwork.id}`
          }
        }
      };

    } catch (error) {
      logger.error(`Failed to get artwork details for ${artworkId}:`, error);
      return null;
    }
  }

  /**
   * 유사한 작품 찾기
   */
  async findSimilarArtworks(artworkId: string, limit: number = 10): Promise<ArtsyArtwork[]> {
    const isAuthenticated = await this.authenticate();
    
    if (!isAuthenticated) {
      return [];
    }

    try {
      // Artsy의 similar artworks API 사용
      const response = await axios.get(`https://api.artsy.net/api/artworks/${artworkId}/similar`, {
        headers: {
          'X-Xapp-Token': this.accessToken,
          'Accept': 'application/vnd.artsy-v2+json'
        },
        params: {
          size: limit
        }
      });

      const similarArtworks = response.data._embedded.artworks.map((artwork: any) => ({
        id: artwork.id,
        title: artwork.title,
        artist: {
          name: artwork.artists?.[0]?.name || 'Unknown Artist',
          id: artwork.artists?.[0]?.id || ''
        },
        images: [{
          url: artwork._links?.image?.href?.replace('{image_version}', 'large') || '',
          position: 0
        }],
        category: artwork.category || '',
        medium: artwork.medium || '',
        date: artwork.date || '',
        collecting_institution: artwork.collecting_institution || '',
        partner: {
          name: '',
          type: ''
        },
        _links: {
          permalink: {
            href: `https://www.artsy.net/artwork/${artwork.id}`
          }
        }
      }));

      return similarArtworks;

    } catch (error) {
      logger.error('Failed to find similar artworks:', error);
      return [];
    }
  }

  /**
   * Artsy 작품을 내부 형식으로 변환
   */
  formatForDisplay(artsyArtwork: ArtsyArtwork): any {
    return {
      id: `artsy_${artsyArtwork.id}`,
      title: artsyArtwork.title,
      artist: artsyArtwork.artist.name,
      image_url: artsyArtwork.images[0]?.url || '',
      thumbnail_url: artsyArtwork.images[0]?.url || '',
      source: 'artsy',
      source_url: artsyArtwork._links.permalink.href,
      description: `${artsyArtwork.medium}${artsyArtwork.date ? `, ${artsyArtwork.date}` : ''}`,
      keywords: [
        artsyArtwork.category,
        artsyArtwork.medium,
        artsyArtwork.artist.name
      ].filter(k => k).map(k => k.toLowerCase()),
      metadata: {
        collecting_institution: artsyArtwork.collecting_institution,
        partner: artsyArtwork.partner
      }
    };
  }
}