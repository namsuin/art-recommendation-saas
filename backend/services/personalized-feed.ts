import { supabase } from './supabase';

interface FeedItem {
  id: string;
  type: 'artwork' | 'collection' | 'review' | 'follow' | 'like';
  user_id: string;
  target_id: string;
  score: number;
  reason: string;
  created_at: string;
  data: any;
}

interface UserPreferences {
  preferred_styles: string[];
  preferred_colors: string[];
  preferred_artists: string[];
  interaction_weights: {
    likes: number;
    views: number;
    comments: number;
    follows: number;
  };
}

export class PersonalizedFeedService {

  /**
   * 개인화된 피드 생성
   */
  async generatePersonalizedFeed(userId: string, options: {
    limit?: number;
    offset?: number;
    timeRange?: 'day' | 'week' | 'month' | 'all';
    includeTypes?: ('artwork' | 'collection' | 'review' | 'follow')[];
  } = {}): Promise<{
    success: boolean;
    feed?: FeedItem[];
    total?: number;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    const { 
      limit = 20, 
      offset = 0, 
      timeRange = 'week',
      includeTypes = ['artwork', 'collection', 'review', 'follow']
    } = options;

    try {
      // 사용자 선호도 분석
      const userPreferences = await this.analyzeUserPreferences(userId);
      
      // 여러 소스에서 피드 아이템 수집
      const feedItems: FeedItem[] = [];

      // 1. 팔로우하는 사용자들의 새 작품
      if (includeTypes.includes('artwork')) {
        const followingArtworks = await this.getFollowingArtworks(userId, userPreferences, timeRange);
        feedItems.push(...followingArtworks);
      }

      // 2. 추천 작품 (취향 기반)
      if (includeTypes.includes('artwork')) {
        const recommendedArtworks = await this.getRecommendedArtworks(userId, userPreferences, timeRange);
        feedItems.push(...recommendedArtworks);
      }

      // 3. 새로운 컬렉션
      if (includeTypes.includes('collection')) {
        const newCollections = await this.getNewCollections(userId, userPreferences, timeRange);
        feedItems.push(...newCollections);
      }

      // 4. 관련 리뷰
      if (includeTypes.includes('review')) {
        const relevantReviews = await this.getRelevantReviews(userId, userPreferences, timeRange);
        feedItems.push(...relevantReviews);
      }

      // 5. 팔로우 추천
      if (includeTypes.includes('follow')) {
        const followSuggestions = await this.getFollowSuggestions(userId);
        feedItems.push(...followSuggestions);
      }

      // 점수순으로 정렬
      feedItems.sort((a, b) => b.score - a.score);

      // 다양성 보장을 위한 재정렬 (같은 타입의 아이템이 연속되지 않도록)
      const diversifiedFeed = this.diversifyFeed(feedItems);

      // 페이지네이션 적용
      const paginatedFeed = diversifiedFeed.slice(offset, offset + limit);

      return {
        success: true,
        feed: paginatedFeed,
        total: diversifiedFeed.length
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '피드 생성 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 사용자 선호도 분석
   */
  private async analyzeUserPreferences(userId: string): Promise<UserPreferences> {
    if (!supabase) {
      return {
        preferred_styles: [],
        preferred_colors: [],
        preferred_artists: [],
        interaction_weights: { likes: 1, views: 0.5, comments: 2, follows: 3 }
      };
    }

    try {
      // 사용자가 좋아요한 작품들의 키워드 분석
      const { data: likedArtworks } = await supabase
        .from('artwork_likes')
        .select(`
          gallery_artworks(analysis_keywords, user_galleries(display_name))
        `)
        .eq('user_id', userId)
        .limit(50);

      // 사용자가 높은 평점을 준 작품들 분석
      const { data: highRatedArtworks } = await supabase
        .from('artwork_reviews')
        .select(`
          rating,
          gallery_artworks(analysis_keywords, user_galleries(display_name))
        `)
        .eq('user_id', userId)
        .gte('rating', 4)
        .limit(30);

      // 키워드 빈도 분석
      const keywordFreq: { [key: string]: number } = {};
      const artistFreq: { [key: string]: number } = {};

      // 좋아요한 작품들의 키워드
      likedArtworks?.forEach(like => {
        const artwork = like.gallery_artworks as any;
        if (artwork?.analysis_keywords) {
          artwork.analysis_keywords.forEach((keyword: string) => {
            keywordFreq[keyword] = (keywordFreq[keyword] || 0) + 2; // 좋아요 가중치
          });
        }
        if (artwork?.user_galleries?.display_name) {
          const artist = artwork.user_galleries.display_name;
          artistFreq[artist] = (artistFreq[artist] || 0) + 2;
        }
      });

      // 높은 평점을 준 작품들의 키워드
      highRatedArtworks?.forEach(review => {
        const artwork = review.gallery_artworks as any;
        if (artwork?.analysis_keywords) {
          artwork.analysis_keywords.forEach((keyword: string) => {
            keywordFreq[keyword] = (keywordFreq[keyword] || 0) + review.rating; // 평점 가중치
          });
        }
        if (artwork?.user_galleries?.display_name) {
          const artist = artwork.user_galleries.display_name;
          artistFreq[artist] = (artistFreq[artist] || 0) + review.rating;
        }
      });

      // 상위 키워드들 추출
      const sortedKeywords = Object.entries(keywordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([keyword]) => keyword);

      const sortedArtists = Object.entries(artistFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([artist]) => artist);

      // 스타일과 색상 분리
      const styleKeywords = ['abstract', 'realistic', 'impressionist', 'modern', 'classical', 'contemporary'];
      const colorKeywords = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'colorful', 'monochrome'];

      const preferredStyles = sortedKeywords.filter(k => 
        styleKeywords.some(style => k.toLowerCase().includes(style.toLowerCase()))
      );

      const preferredColors = sortedKeywords.filter(k => 
        colorKeywords.some(color => k.toLowerCase().includes(color.toLowerCase()))
      );

      return {
        preferred_styles: preferredStyles,
        preferred_colors: preferredColors,
        preferred_artists: sortedArtists,
        interaction_weights: {
          likes: 3,
          views: 1,
          comments: 4,
          follows: 5
        }
      };

    } catch (error) {
      console.error('Failed to analyze user preferences:', error);
      return {
        preferred_styles: [],
        preferred_colors: [],
        preferred_artists: [],
        interaction_weights: { likes: 1, views: 0.5, comments: 2, follows: 3 }
      };
    }
  }

  /**
   * 팔로우하는 사용자들의 새 작품
   */
  private async getFollowingArtworks(userId: string, preferences: UserPreferences, timeRange: string): Promise<FeedItem[]> {
    if (!supabase) return [];

    try {
      const timeFilter = this.getTimeFilter(timeRange);

      // 팔로우하는 사용자들의 새 작품 조회
      const { data: followingArtworks } = await supabase
        .from('user_follows')
        .select(`
          following:user_galleries!user_follows_following_id_fkey(
            user_id,
            display_name,
            gallery_artworks!inner(
              id, title, image_url, thumbnail_url, analysis_keywords, 
              likes_count, views_count, created_at
            )
          )
        `)
        .eq('follower_id', userId);

      const feedItems: FeedItem[] = [];

      followingArtworks?.forEach(follow => {
        const following = follow.following as any;
        following.gallery_artworks?.forEach((artwork: any) => {
          if (new Date(artwork.created_at) >= timeFilter) {
            const score = this.calculateArtworkScore(artwork, preferences, 'following');
            
            feedItems.push({
              id: `artwork_${artwork.id}`,
              type: 'artwork',
              user_id: following.user_id,
              target_id: artwork.id,
              score,
              reason: `${following.display_name}님이 새 작품을 업로드했습니다`,
              created_at: artwork.created_at,
              data: {
                ...artwork,
                artist: following.display_name
              }
            });
          }
        });
      });

      return feedItems;

    } catch (error) {
      console.error('Failed to get following artworks:', error);
      return [];
    }
  }

  /**
   * 추천 작품 (취향 기반)
   */
  private async getRecommendedArtworks(userId: string, preferences: UserPreferences, timeRange: string): Promise<FeedItem[]> {
    if (!supabase) return [];

    try {
      const timeFilter = this.getTimeFilter(timeRange);

      // 선호하는 키워드가 포함된 작품들
      let query = supabase
        .from('gallery_artworks')
        .select(`
          *,
          user_galleries(display_name, avatar_url)
        `)
        .eq('is_public', true)
        .gte('created_at', timeFilter.toISOString())
        .neq('user_id', userId) // 자신의 작품 제외
        .order('likes_count', { ascending: false })
        .limit(30);

      // 선호 키워드가 있는 경우 필터 적용
      if (preferences.preferred_styles.length > 0 || preferences.preferred_colors.length > 0) {
        const preferredKeywords = [...preferences.preferred_styles, ...preferences.preferred_colors];
        query = query.overlaps('analysis_keywords', preferredKeywords);
      }

      const { data: artworks } = await query;

      const feedItems: FeedItem[] = artworks?.map(artwork => ({
        id: `recommended_${artwork.id}`,
        type: 'artwork' as const,
        user_id: artwork.user_id,
        target_id: artwork.id,
        score: this.calculateArtworkScore(artwork, preferences, 'recommended'),
        reason: '당신의 취향에 맞는 작품입니다',
        created_at: artwork.created_at,
        data: {
          ...artwork,
          artist: artwork.user_galleries?.display_name
        }
      })) || [];

      return feedItems;

    } catch (error) {
      console.error('Failed to get recommended artworks:', error);
      return [];
    }
  }

  /**
   * 새로운 컬렉션
   */
  private async getNewCollections(userId: string, preferences: UserPreferences, timeRange: string): Promise<FeedItem[]> {
    if (!supabase) return [];

    try {
      const timeFilter = this.getTimeFilter(timeRange);

      const { data: collections } = await supabase
        .from('gallery_collections')
        .select(`
          *,
          user_galleries(display_name, avatar_url)
        `)
        .eq('is_public', true)
        .gte('created_at', timeFilter.toISOString())
        .neq('user_id', userId)
        .order('likes_count', { ascending: false })
        .limit(10);

      const feedItems: FeedItem[] = collections?.map(collection => ({
        id: `collection_${collection.id}`,
        type: 'collection' as const,
        user_id: collection.user_id,
        target_id: collection.id,
        score: 60 + (collection.likes_count * 2), // 기본 점수 60 + 좋아요 가중치
        reason: '새로운 컬렉션이 추가되었습니다',
        created_at: collection.created_at,
        data: {
          ...collection,
          artist: collection.user_galleries?.display_name
        }
      })) || [];

      return feedItems;

    } catch (error) {
      console.error('Failed to get new collections:', error);
      return [];
    }
  }

  /**
   * 관련 리뷰
   */
  private async getRelevantReviews(userId: string, preferences: UserPreferences, timeRange: string): Promise<FeedItem[]> {
    if (!supabase) return [];

    try {
      const timeFilter = this.getTimeFilter(timeRange);

      // 선호하는 아티스트들의 작품에 대한 리뷰
      const { data: reviews } = await supabase
        .from('artwork_reviews')
        .select(`
          *,
          gallery_artworks(title, thumbnail_url, user_galleries(display_name)),
          user_galleries(display_name, avatar_url)
        `)
        .gte('created_at', timeFilter.toISOString())
        .neq('user_id', userId)
        .gte('rating', 4) // 높은 평점 리뷰만
        .order('helpful_count', { ascending: false })
        .limit(15);

      const feedItems: FeedItem[] = reviews?.map(review => ({
        id: `review_${review.id}`,
        type: 'review' as const,
        user_id: review.user_id,
        target_id: review.id,
        score: 40 + (review.helpful_count * 3) + (review.rating * 5),
        reason: `${(review.gallery_artworks as any)?.title}에 대한 리뷰`,
        created_at: review.created_at,
        data: {
          ...review,
          reviewer: review.user_galleries?.display_name,
          artwork: review.gallery_artworks
        }
      })) || [];

      return feedItems;

    } catch (error) {
      console.error('Failed to get relevant reviews:', error);
      return [];
    }
  }

  /**
   * 팔로우 추천
   */
  private async getFollowSuggestions(userId: string): Promise<FeedItem[]> {
    if (!supabase) return [];

    try {
      // 이미 팔로우 중인 사용자들 조회
      const { data: followingIds } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

      const excludeIds = [userId, ...(followingIds?.map(f => f.following_id) || [])];

      // 인기 갤러리 사용자들 추천
      const { data: suggestions } = await supabase
        .from('user_galleries')
        .select('*')
        .eq('is_public', true)
        .not('user_id', 'in', `(${excludeIds.join(',')})`)
        .order('total_likes', { ascending: false })
        .order('followers_count', { ascending: false })
        .limit(5);

      const feedItems: FeedItem[] = suggestions?.map(user => ({
        id: `follow_${user.user_id}`,
        type: 'follow' as const,
        user_id: user.user_id,
        target_id: user.user_id,
        score: 30 + (user.followers_count * 0.1) + (user.total_likes * 0.05),
        reason: '팔로우할 만한 아티스트입니다',
        created_at: new Date().toISOString(),
        data: user
      })) || [];

      return feedItems;

    } catch (error) {
      console.error('Failed to get follow suggestions:', error);
      return [];
    }
  }

  /**
   * 작품 점수 계산
   */
  private calculateArtworkScore(artwork: any, preferences: UserPreferences, source: 'following' | 'recommended'): number {
    let score = 50; // 기본 점수

    // 소스별 가중치
    if (source === 'following') {
      score += 30; // 팔로잉 보너스
    }

    // 좋아요/조회수 점수
    score += artwork.likes_count * preferences.interaction_weights.likes;
    score += (artwork.views_count || 0) * preferences.interaction_weights.views;

    // 키워드 매칭 점수
    if (artwork.analysis_keywords) {
      const matchingStyles = artwork.analysis_keywords.filter((k: string) => 
        preferences.preferred_styles.some(style => 
          k.toLowerCase().includes(style.toLowerCase())
        )
      ).length;

      const matchingColors = artwork.analysis_keywords.filter((k: string) => 
        preferences.preferred_colors.some(color => 
          k.toLowerCase().includes(color.toLowerCase())
        )
      ).length;

      score += matchingStyles * 15; // 스타일 매칭 보너스
      score += matchingColors * 10; // 색상 매칭 보너스
    }

    // 시간 감쇠 (최신 작품일수록 높은 점수)
    const daysSinceCreated = Math.max(1, Math.floor(
      (Date.now() - new Date(artwork.created_at).getTime()) / (1000 * 60 * 60 * 24)
    ));
    score *= Math.pow(0.95, daysSinceCreated); // 하루마다 5% 감소

    return Math.round(score);
  }

  /**
   * 시간 필터 생성
   */
  private getTimeFilter(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0); // 전체 기간
    }
  }

  /**
   * 피드 다양성 보장
   */
  private diversifyFeed(feedItems: FeedItem[]): FeedItem[] {
    const diversified: FeedItem[] = [];
    const typeGroups: { [key: string]: FeedItem[] } = {};

    // 타입별로 그룹화
    feedItems.forEach(item => {
      if (!typeGroups[item.type]) {
        typeGroups[item.type] = [];
      }
      typeGroups[item.type].push(item);
    });

    // 라운드 로빈 방식으로 다양성 보장
    const types = Object.keys(typeGroups);
    let maxLength = Math.max(...types.map(type => typeGroups[type].length));

    for (let i = 0; i < maxLength; i++) {
      types.forEach(type => {
        if (typeGroups[type][i]) {
          diversified.push(typeGroups[type][i]);
        }
      });
    }

    return diversified;
  }

  /**
   * 피드 새로고침 (사용자 액션 기반)
   */
  async refreshFeedBasedOnAction(userId: string, action: {
    type: 'like' | 'comment' | 'follow' | 'view';
    targetId: string;
    targetType: 'artwork' | 'user';
  }): Promise<{
    success: boolean;
    suggestedItems?: FeedItem[];
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      // 액션 기반으로 즉시 추천할 수 있는 아이템들 찾기
      const suggestedItems: FeedItem[] = [];

      if (action.type === 'like' && action.targetType === 'artwork') {
        // 좋아요한 작품과 유사한 다른 작품들 추천
        const { data: likedArtwork } = await supabase
          .from('gallery_artworks')
          .select('analysis_keywords, user_id')
          .eq('id', action.targetId)
          .single();

        if (likedArtwork) {
          // 같은 아티스트의 다른 작품들
          const { data: sameArtistWorks } = await supabase
            .from('gallery_artworks')
            .select(`*, user_galleries(display_name)`)
            .eq('user_id', likedArtwork.user_id)
            .neq('id', action.targetId)
            .eq('is_public', true)
            .order('likes_count', { ascending: false })
            .limit(3);

          sameArtistWorks?.forEach(artwork => {
            suggestedItems.push({
              id: `similar_${artwork.id}`,
              type: 'artwork',
              user_id: artwork.user_id,
              target_id: artwork.id,
              score: 80,
              reason: '비슷한 스타일의 작품입니다',
              created_at: artwork.created_at,
              data: artwork
            });
          });
        }
      }

      return { success: true, suggestedItems };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '피드 새로고침 중 오류가 발생했습니다.'
      };
    }
  }
}