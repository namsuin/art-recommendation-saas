import axios from 'axios';

interface SocialMediaArtwork {
  id: string;
  title: string;
  artist: string;
  image_url: string;
  thumbnail_url: string;
  source: 'instagram' | 'behance';
  source_url: string;
  description: string;
  keywords: string[];
  engagement?: {
    likes?: number;
    views?: number;
    comments?: number;
  };
  created_at?: string;
}

export class SocialMediaIntegration {
  
  /**
   * Instagram 기본 디스플레이 API를 사용한 검색
   * 주의: Instagram은 직접적인 키워드 검색을 지원하지 않으므로
   * 해시태그 기반 검색이나 특정 사용자의 포스트를 가져오는 방식 사용
   */
  async searchInstagram(hashtags: string[], limit: number = 20): Promise<SocialMediaArtwork[]> {
    // Instagram Basic Display API는 검색 기능이 제한적
    // 실제 구현시에는 Instagram Graph API 또는 크롤링 서비스 사용 필요
    
    console.warn('Instagram API integration requires approved Instagram Business account');
    
    // Mock response for development
    if (process.env.NODE_ENV === 'development') {
      return this.getMockInstagramResults(hashtags, limit);
    }

    return [];
  }

  /**
   * Behance API를 사용한 프로젝트 검색
   */
  async searchBehance(keywords: string[], limit: number = 20): Promise<SocialMediaArtwork[]> {
    const apiKey = process.env.BEHANCE_API_KEY;
    
    if (!apiKey) {
      console.warn('Behance API key not configured');
      return [];
    }

    try {
      const query = keywords.join(' ');
      
      // Behance API v2 프로젝트 검색
      const response = await axios.get('https://api.behance.net/v2/projects', {
        params: {
          q: query,
          client_id: apiKey,
          field: 'fine arts,illustration,digital art',
          sort: 'appreciations',
          per_page: limit
        }
      });

      const projects = response.data.projects || [];

      return projects.map((project: any) => ({
        id: `behance_${project.id}`,
        title: project.name,
        artist: project.owners[0]?.display_name || 'Unknown Artist',
        image_url: project.covers?.['808'] || project.covers?.original || '',
        thumbnail_url: project.covers?.['404'] || project.covers?.['202'] || '',
        source: 'behance' as const,
        source_url: project.url,
        description: project.fields.join(', '),
        keywords: [
          ...project.fields,
          ...project.tags || []
        ].map(k => k.toLowerCase()),
        engagement: {
          views: project.stats?.views || 0,
          likes: project.stats?.appreciations || 0,
          comments: project.stats?.comments || 0
        },
        created_at: new Date(project.published_on * 1000).toISOString()
      }));

    } catch (error) {
      console.error('Behance search failed:', error);
      return [];
    }
  }

  /**
   * Pinterest API를 사용한 핀 검색 (추가 옵션)
   */
  async searchPinterest(keywords: string[], limit: number = 20): Promise<SocialMediaArtwork[]> {
    // Pinterest API는 승인된 앱만 사용 가능
    // 실제 구현시 Pinterest API v5 사용
    
    console.warn('Pinterest API requires approved application');
    return [];
  }

  /**
   * 여러 소셜 미디어 플랫폼에서 통합 검색
   */
  async searchAllPlatforms(
    keywords: string[], 
    platforms: ('instagram' | 'behance' | 'pinterest')[] = ['behance'],
    limitPerPlatform: number = 10
  ): Promise<{
    results: SocialMediaArtwork[];
    sources: { [key: string]: number };
  }> {
    const results: SocialMediaArtwork[] = [];
    const sources: { [key: string]: number } = {};

    // 병렬로 각 플랫폼 검색
    const searchPromises = platforms.map(async (platform) => {
      try {
        let platformResults: SocialMediaArtwork[] = [];

        switch (platform) {
          case 'instagram':
            platformResults = await this.searchInstagram(keywords, limitPerPlatform);
            break;
          case 'behance':
            platformResults = await this.searchBehance(keywords, limitPerPlatform);
            break;
          case 'pinterest':
            platformResults = await this.searchPinterest(keywords, limitPerPlatform);
            break;
        }

        results.push(...platformResults);
        sources[platform] = platformResults.length;
      } catch (error) {
        console.error(`Failed to search ${platform}:`, error);
        sources[platform] = 0;
      }
    });

    await Promise.all(searchPromises);

    // 인기도/관련성 순으로 정렬
    results.sort((a, b) => {
      const scoreA = (a.engagement?.likes || 0) + (a.engagement?.views || 0) / 100;
      const scoreB = (b.engagement?.likes || 0) + (b.engagement?.views || 0) / 100;
      return scoreB - scoreA;
    });

    return { results, sources };
  }

  /**
   * 개발용 Mock Instagram 결과
   */
  private getMockInstagramResults(hashtags: string[], limit: number): SocialMediaArtwork[] {
    const mockResults: SocialMediaArtwork[] = [];
    
    for (let i = 0; i < Math.min(limit, 5); i++) {
      mockResults.push({
        id: `ig_mock_${i}`,
        title: `${hashtags[0]} artwork ${i + 1}`,
        artist: `@artist_${i}`,
        image_url: `https://picsum.photos/800/800?random=${i}`,
        thumbnail_url: `https://picsum.photos/400/400?random=${i}`,
        source: 'instagram',
        source_url: `https://instagram.com/p/mock_${i}`,
        description: `Beautiful artwork featuring ${hashtags.join(', ')}`,
        keywords: hashtags,
        engagement: {
          likes: Math.floor(Math.random() * 10000),
          comments: Math.floor(Math.random() * 100)
        },
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    return mockResults;
  }

  /**
   * 작품의 원본 출처 정보 포맷팅
   */
  formatSourceAttribution(artwork: SocialMediaArtwork): string {
    const sourceName = artwork.source.charAt(0).toUpperCase() + artwork.source.slice(1);
    const date = artwork.created_at ? new Date(artwork.created_at).toLocaleDateString() : '';
    
    return `출처: ${sourceName} | 작가: ${artwork.artist}${date ? ` | ${date}` : ''}`;
  }
}