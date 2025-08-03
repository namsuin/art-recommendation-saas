import { supabase } from './supabase';

interface TrendingArtwork {
  id: string;
  title: string;
  image_url: string;
  thumbnail_url?: string;
  likes_count: number;
  views_count: number;
  average_rating: number;
  reviews_count: number;
  created_at: string;
  trend_score: number;
  user_profile: {
    display_name: string;
    avatar_url?: string;
  };
}

interface TrendingUser {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  followers_count: number;
  artworks_count: number;
  total_likes: number;
  trend_score: number;
  recent_activity: string;
}

interface PopularCollection {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  likes_count: number;
  created_at: string;
  artworks_count: number;
  trend_score: number;
  user_profile: {
    display_name: string;
    avatar_url?: string;
  };
}

interface TrendingStats {
  period: 'day' | 'week' | 'month';
  total_artworks: number;
  total_interactions: number;
  top_keywords: string[];
  growth_rate: number;
}

export class TrendingContentService {

  /**
   * 트렌딩 작품 조회 (시간별 가중치 적용)
   */
  async getTrendingArtworks(options: {
    period?: 'day' | 'week' | 'month';
    limit?: number;
    offset?: number;
    category?: string[];
  } = {}): Promise<{
    success: boolean;
    artworks?: TrendingArtwork[];
    stats?: TrendingStats;
    total?: number;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    const { period = 'week', limit = 20, offset = 0, category } = options;

    try {
      const timeFilter = this.getTimeFilter(period);
      
      // 기본 작품 데이터 조회
      let query = supabase
        .from('gallery_artworks')
        .select(`
          *,
          user_profile:user_galleries(display_name, avatar_url)
        `)
        .eq('is_public', true)
        .gte('created_at', timeFilter.toISOString())
        .order('likes_count', { ascending: false })
        .order('views_count', { ascending: false });

      // 카테고리 필터 적용
      if (category && category.length > 0) {
        query = query.overlaps('analysis_keywords', category);
      }

      const { data: artworks, error } = await query.limit(limit * 3); // 더 많은 데이터를 가져와서 트렌드 점수 계산

      if (error) {
        return { success: false, error: error.message };
      }

      // 트렌드 점수 계산 및 정렬
      const trendingArtworks = (artworks || [])
        .map(artwork => ({
          ...artwork,
          trend_score: this.calculateTrendScore(artwork, period)
        }))
        .sort((a, b) => b.trend_score - a.trend_score)
        .slice(offset, offset + limit);

      // 트렌딩 통계 계산
      const stats = await this.calculateTrendingStats(period, category);

      return {
        success: true,
        artworks: trendingArtworks,
        stats,
        total: trendingArtworks.length
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '트렌딩 작품 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 인기 아티스트 조회
   */
  async getTrendingArtists(options: {
    period?: 'day' | 'week' | 'month';
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    success: boolean;
    artists?: TrendingUser[];
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    const { period = 'week', limit = 20, offset = 0 } = options;

    try {
      const timeFilter = this.getTimeFilter(period);

      // 최근 활동이 있는 아티스트들 조회
      const { data: artists, error } = await supabase
        .from('user_galleries')
        .select(`
          *,
          gallery_artworks!inner(likes_count, views_count, created_at)
        `)
        .eq('is_public', true)
        .gte('gallery_artworks.created_at', timeFilter.toISOString())
        .order('total_likes', { ascending: false })
        .order('followers_count', { ascending: false })
        .limit(limit * 2);

      if (error) {
        return { success: false, error: error.message };
      }

      // 트렌드 점수 계산
      const trendingArtists = (artists || [])
        .map(artist => {
          const recentArtworks = artist.gallery_artworks || [];
          const recentActivity = recentArtworks.length > 0 
            ? Math.max(...recentArtworks.map((a: any) => new Date(a.created_at).getTime()))
            : new Date(0).getTime();
          
          const trendScore = this.calculateArtistTrendScore(artist, recentArtworks, period);
          
          return {
            ...artist,
            recent_activity: new Date(recentActivity).toISOString(),
            trend_score: trendScore
          };
        })
        .sort((a, b) => b.trend_score - a.trend_score)
        .slice(offset, offset + limit);

      return {
        success: true,
        artists: trendingArtists
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '인기 아티스트 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 인기 컬렉션 조회
   */
  async getTrendingCollections(options: {
    period?: 'day' | 'week' | 'month';
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    success: boolean;
    collections?: PopularCollection[];
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    const { period = 'week', limit = 10, offset = 0 } = options;

    try {
      const timeFilter = this.getTimeFilter(period);

      // 컬렉션 데이터와 작품 수 조회
      const { data: collections, error } = await supabase
        .from('gallery_collections')
        .select(`
          *,
          user_profile:user_galleries(display_name, avatar_url),
          collection_artworks(id)
        `)
        .eq('is_public', true)
        .gte('created_at', timeFilter.toISOString())
        .order('likes_count', { ascending: false })
        .limit(limit * 2);

      if (error) {
        return { success: false, error: error.message };
      }

      // 트렌드 점수 계산
      const trendingCollections = (collections || [])
        .map(collection => ({
          ...collection,
          artworks_count: collection.collection_artworks?.length || 0,
          trend_score: this.calculateCollectionTrendScore(collection, period)
        }))
        .sort((a, b) => b.trend_score - a.trend_score)
        .slice(offset, offset + limit);

      return {
        success: true,
        collections: trendingCollections
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '인기 컬렉션 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 급상승 키워드 조회
   */
  async getTrendingKeywords(period: 'day' | 'week' | 'month' = 'week', limit: number = 20): Promise<{
    success: boolean;
    keywords?: { keyword: string; count: number; growth_rate: number }[];
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      const timeFilter = this.getTimeFilter(period);
      const previousTimeFilter = this.getTimeFilter(period, true); // 이전 기간

      // 현재 기간 키워드 빈도
      const { data: currentArtworks } = await supabase
        .from('gallery_artworks')
        .select('analysis_keywords')
        .eq('is_public', true)
        .gte('created_at', timeFilter.toISOString());

      // 이전 기간 키워드 빈도
      const { data: previousArtworks } = await supabase
        .from('gallery_artworks')
        .select('analysis_keywords')
        .eq('is_public', true)
        .gte('created_at', previousTimeFilter.toISOString())
        .lt('created_at', timeFilter.toISOString());

      // 키워드 빈도 계산
      const currentKeywords = this.extractKeywordFrequency(currentArtworks || []);
      const previousKeywords = this.extractKeywordFrequency(previousArtworks || []);

      // 성장률 계산
      const trendingKeywords = Object.entries(currentKeywords)
        .map(([keyword, currentCount]) => {
          const previousCount = previousKeywords[keyword] || 0;
          const growthRate = previousCount > 0 
            ? ((currentCount - previousCount) / previousCount) * 100
            : currentCount > 0 ? 100 : 0;

          return {
            keyword,
            count: currentCount,
            growth_rate: Math.round(growthRate * 10) / 10
          };
        })
        .filter(item => item.count >= 3) // 최소 3회 이상 등장
        .sort((a, b) => b.growth_rate - a.growth_rate)
        .slice(0, limit);

      return {
        success: true,
        keywords: trendingKeywords
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '트렌딩 키워드 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 전체 트렌딩 대시보드 데이터
   */
  async getTrendingDashboard(period: 'day' | 'week' | 'month' = 'week'): Promise<{
    success: boolean;
    dashboard?: {
      trending_artworks: TrendingArtwork[];
      trending_artists: TrendingUser[];
      trending_collections: PopularCollection[];
      trending_keywords: { keyword: string; count: number; growth_rate: number }[];
      stats: TrendingStats;
    };
    error?: string;
  }> {
    try {
      const [artworksResult, artistsResult, collectionsResult, keywordsResult] = await Promise.all([
        this.getTrendingArtworks({ period, limit: 10 }),
        this.getTrendingArtists({ period, limit: 10 }),
        this.getTrendingCollections({ period, limit: 5 }),
        this.getTrendingKeywords(period, 10)
      ]);

      if (!artworksResult.success || !artistsResult.success || 
          !collectionsResult.success || !keywordsResult.success) {
        return {
          success: false,
          error: '트렌딩 대시보드 데이터 조회 중 오류가 발생했습니다.'
        };
      }

      return {
        success: true,
        dashboard: {
          trending_artworks: artworksResult.artworks || [],
          trending_artists: artistsResult.artists || [],
          trending_collections: collectionsResult.collections || [],
          trending_keywords: keywordsResult.keywords || [],
          stats: artworksResult.stats || {
            period,
            total_artworks: 0,
            total_interactions: 0,
            top_keywords: [],
            growth_rate: 0
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '트렌딩 대시보드 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 트렌드 점수 계산 (작품용)
   */
  private calculateTrendScore(artwork: any, period: string): number {
    const now = Date.now();
    const createdAt = new Date(artwork.created_at).getTime();
    const ageInHours = (now - createdAt) / (1000 * 60 * 60);
    
    // 기본 인기도 점수
    const popularityScore = (artwork.likes_count * 3) + 
                          (artwork.views_count * 0.5) + 
                          (artwork.average_rating * artwork.reviews_count * 2);
    
    // 시간 감쇠 (최신일수록 높은 점수)
    let timeDecay;
    switch (period) {
      case 'day':
        timeDecay = Math.max(0.1, 1 - (ageInHours / 24) * 0.5);
        break;
      case 'week':
        timeDecay = Math.max(0.2, 1 - (ageInHours / (24 * 7)) * 0.3);
        break;
      case 'month':
        timeDecay = Math.max(0.3, 1 - (ageInHours / (24 * 30)) * 0.2);
        break;
      default:
        timeDecay = 0.5;
    }
    
    // 상호작용 밀도 (단위 시간당 상호작용 수)
    const interactionDensity = (artwork.likes_count + artwork.views_count) / Math.max(1, ageInHours);
    
    return Math.round((popularityScore * timeDecay * (1 + interactionDensity * 0.1)) * 100) / 100;
  }

  /**
   * 아티스트 트렌드 점수 계산
   */
  private calculateArtistTrendScore(artist: any, recentArtworks: any[], period: string): number {
    const baseScore = (artist.followers_count * 2) + 
                     (artist.total_likes * 1.5) + 
                     (artist.artworks_count * 0.5);
    
    // 최근 활동 가중치
    const recentActivity = recentArtworks.reduce((sum, artwork) => {
      return sum + artwork.likes_count + (artwork.views_count * 0.3);
    }, 0);
    
    // 업로드 빈도 보너스
    const uploadFrequency = recentArtworks.length;
    
    return Math.round((baseScore + recentActivity + (uploadFrequency * 10)) * 100) / 100;
  }

  /**
   * 컬렉션 트렌드 점수 계산
   */
  private calculateCollectionTrendScore(collection: any, period: string): number {
    const now = Date.now();
    const createdAt = new Date(collection.created_at).getTime();
    const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
    
    const baseScore = (collection.likes_count * 5) + 
                     ((collection.collection_artworks?.length || 0) * 2);
    
    // 시간 감쇠
    const timeDecay = Math.max(0.1, 1 - (ageInDays / 30) * 0.3);
    
    return Math.round(baseScore * timeDecay * 100) / 100;
  }

  /**
   * 키워드 빈도 추출
   */
  private extractKeywordFrequency(artworks: any[]): { [key: string]: number } {
    const keywordFreq: { [key: string]: number } = {};
    
    artworks.forEach(artwork => {
      if (artwork.analysis_keywords && Array.isArray(artwork.analysis_keywords)) {
        artwork.analysis_keywords.forEach((keyword: string) => {
          keywordFreq[keyword] = (keywordFreq[keyword] || 0) + 1;
        });
      }
    });
    
    return keywordFreq;
  }

  /**
   * 트렌딩 통계 계산
   */
  private async calculateTrendingStats(period: string, category?: string[]): Promise<TrendingStats> {
    if (!supabase) {
      return {
        period: period as any,
        total_artworks: 0,
        total_interactions: 0,
        top_keywords: [],
        growth_rate: 0
      };
    }

    try {
      const timeFilter = this.getTimeFilter(period);
      const previousTimeFilter = this.getTimeFilter(period, true);

      // 현재 기간 통계
      let currentQuery = supabase
        .from('gallery_artworks')
        .select('likes_count, views_count, analysis_keywords')
        .eq('is_public', true)
        .gte('created_at', timeFilter.toISOString());

      if (category && category.length > 0) {
        currentQuery = currentQuery.overlaps('analysis_keywords', category);
      }

      const { data: currentData } = await currentQuery;

      // 이전 기간 통계
      let previousQuery = supabase
        .from('gallery_artworks')
        .select('likes_count, views_count')
        .eq('is_public', true)
        .gte('created_at', previousTimeFilter.toISOString())
        .lt('created_at', timeFilter.toISOString());

      if (category && category.length > 0) {
        previousQuery = previousQuery.overlaps('analysis_keywords', category);
      }

      const { data: previousData } = await previousQuery;

      const currentTotal = currentData?.reduce((sum, item) => 
        sum + item.likes_count + item.views_count, 0) || 0;
      const previousTotal = previousData?.reduce((sum, item) => 
        sum + item.likes_count + item.views_count, 0) || 0;

      const growthRate = previousTotal > 0 
        ? ((currentTotal - previousTotal) / previousTotal) * 100 
        : 0;

      // 상위 키워드 추출
      const keywordFreq = this.extractKeywordFrequency(currentData || []);
      const topKeywords = Object.entries(keywordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([keyword]) => keyword);

      return {
        period: period as any,
        total_artworks: currentData?.length || 0,
        total_interactions: currentTotal,
        top_keywords: topKeywords,
        growth_rate: Math.round(growthRate * 10) / 10
      };

    } catch (error) {
      console.error('Failed to calculate trending stats:', error);
      return {
        period: period as any,
        total_artworks: 0,
        total_interactions: 0,
        top_keywords: [],
        growth_rate: 0
      };
    }
  }

  /**
   * 시간 필터 생성
   */
  private getTimeFilter(period: string, previous: boolean = false): Date {
    const now = new Date();
    let days: number;
    
    switch (period) {
      case 'day':
        days = 1;
        break;
      case 'week':
        days = 7;
        break;
      case 'month':
        days = 30;
        break;
      default:
        days = 7;
    }
    
    if (previous) {
      // 이전 기간 (예: 이번 주의 경우 지난 주)
      return new Date(now.getTime() - (days * 2 * 24 * 60 * 60 * 1000));
    } else {
      // 현재 기간
      return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    }
  }
}