import { SupabaseService } from './supabase';

interface ShareableArtwork {
  id: string;
  artwork_id: string;
  user_id: string;
  title?: string;
  description?: string;
  tags: string[];
  privacy_level: 'public' | 'followers' | 'private';
  share_type: 'discovery' | 'collection' | 'review';
  metadata: {
    analysis_data?: any;
    user_rating?: number;
    custom_notes?: string;
    color_palette?: string[];
    detected_style?: string;
  };
  created_at: string;
}

interface ArtworkReview {
  id: string;
  artwork_id: string;
  user_id: string;
  rating: number; // 1-5 stars
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  tags: string[];
  helpful_count: number;
  verified_purchase: boolean;
  created_at: string;
  updated_at: string;
}

interface UserFollow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

interface SocialInteraction {
  id: string;
  user_id: string;
  target_type: 'share' | 'review' | 'user';
  target_id: string;
  interaction_type: 'like' | 'comment' | 'bookmark' | 'share';
  metadata?: any;
  created_at: string;
}

interface Comment {
  id: string;
  user_id: string;
  target_type: 'share' | 'review';
  target_id: string;
  content: string;
  parent_comment_id?: string;
  mentions: string[]; // @username mentions
  created_at: string;
  updated_at: string;
}

export class SocialFeaturesService {
  private supabase: SupabaseService;

  constructor() {
    this.supabase = new SupabaseService();
  }

  // 작품 공유 기능
  async shareArtwork(
    userId: string,
    artworkId: string,
    shareData: {
      title?: string;
      description?: string;
      tags?: string[];
      privacy_level?: 'public' | 'followers' | 'private';
      share_type?: 'discovery' | 'collection' | 'review';
      user_rating?: number;
      custom_notes?: string;
    }
  ): Promise<{ success: boolean; share_id?: string; error?: string }> {
    try {
      // 작품 정보 및 분석 데이터 가져오기
      const { data: artwork } = await this.supabase.getClient()
        .from('artworks')
        .select(`
          *,
          image_analyses(*)
        `)
        .eq('id', artworkId)
        .single();

      if (!artwork) {
        return { success: false, error: '작품을 찾을 수 없습니다.' };
      }

      // 공유 데이터 생성
      const shareableArtwork: Partial<ShareableArtwork> = {
        artwork_id: artworkId,
        user_id: userId,
        title: shareData.title || artwork.title,
        description: shareData.description || `${artwork.artist}의 작품을 공유합니다.`,
        tags: shareData.tags || artwork.keywords || [],
        privacy_level: shareData.privacy_level || 'public',
        share_type: shareData.share_type || 'discovery',
        metadata: {
          analysis_data: artwork.image_analyses?.[0] || null,
          user_rating: shareData.user_rating,
          custom_notes: shareData.custom_notes,
          color_palette: artwork.image_analyses?.[0]?.colors || [],
          detected_style: artwork.image_analyses?.[0]?.style
        }
      };

      // DB에 공유 정보 저장
      const { data: share, error } = await this.supabase.getClient()
        .from('artwork_shares')
        .insert(shareableArtwork)
        .select()
        .single();

      if (error) {
        console.error('Failed to share artwork:', error);
        return { success: false, error: '작품 공유에 실패했습니다.' };
      }

      // 팔로워들에게 알림 발송 (공개 또는 팔로워 공개인 경우)
      if (shareData.privacy_level !== 'private') {
        await this.notifyFollowers(userId, 'artwork_shared', {
          share_id: share.id,
          artwork_title: artwork.title,
          artist: artwork.artist
        });
      }

      console.log(`✅ Artwork shared successfully: ${share.id}`);
      return { success: true, share_id: share.id };

    } catch (error) {
      console.error('Share artwork error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '작품 공유 중 오류가 발생했습니다.' 
      };
    }
  }

  // 작품 리뷰 작성
  async createReview(
    userId: string,
    artworkId: string,
    reviewData: {
      rating: number;
      title: string;
      content: string;
      pros?: string[];
      cons?: string[];
      tags?: string[];
      verified_purchase?: boolean;
    }
  ): Promise<{ success: boolean; review_id?: string; error?: string }> {
    try {
      // 이미 리뷰를 작성했는지 확인
      const { data: existingReview } = await this.supabase.getClient()
        .from('artwork_reviews')
        .select('id')
        .eq('user_id', userId)
        .eq('artwork_id', artworkId)
        .single();

      if (existingReview) {
        return { success: false, error: '이미 이 작품에 대한 리뷰를 작성했습니다.' };
      }

      // 리뷰 데이터 검증
      if (reviewData.rating < 1 || reviewData.rating > 5) {
        return { success: false, error: '평점은 1-5 사이여야 합니다.' };
      }

      if (reviewData.content.length < 10) {
        return { success: false, error: '리뷰 내용은 최소 10자 이상이어야 합니다.' };
      }

      // 구매 이력 확인 (구매 대행 서비스 이용 시)
      let verifiedPurchase = false;
      if (reviewData.verified_purchase) {
        const { data: purchaseRequest } = await this.supabase.getClient()
          .from('purchase_requests')
          .select('id')
          .eq('user_id', userId)
          .eq('artwork_id', artworkId)
          .eq('status', 'completed')
          .single();
        
        verifiedPurchase = !!purchaseRequest;
      }

      // 리뷰 생성
      const review: Partial<ArtworkReview> = {
        artwork_id: artworkId,
        user_id: userId,
        rating: reviewData.rating,
        title: reviewData.title,
        content: reviewData.content,
        pros: reviewData.pros || [],
        cons: reviewData.cons || [],
        tags: reviewData.tags || [],
        helpful_count: 0,
        verified_purchase: verifiedPurchase
      };

      const { data: createdReview, error } = await this.supabase.getClient()
        .from('artwork_reviews')
        .insert(review)
        .select()
        .single();

      if (error) {
        console.error('Failed to create review:', error);
        return { success: false, error: '리뷰 작성에 실패했습니다.' };
      }

      // 작품의 평균 평점 업데이트
      await this.updateArtworkRating(artworkId);

      console.log(`✅ Review created successfully: ${createdReview.id}`);
      return { success: true, review_id: createdReview.id };

    } catch (error) {
      console.error('Create review error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '리뷰 작성 중 오류가 발생했습니다.' 
      };
    }
  }

  // 사용자 팔로우/언팔로우
  async followUser(
    followerId: string,
    followingId: string
  ): Promise<{ success: boolean; action: 'followed' | 'unfollowed'; error?: string }> {
    try {
      if (followerId === followingId) {
        return { success: false, action: 'followed', error: '자기 자신을 팔로우할 수 없습니다.' };
      }

      // 이미 팔로우하고 있는지 확인
      const { data: existingFollow } = await this.supabase.getClient()
        .from('user_follows')
        .select('*')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .single();

      if (existingFollow) {
        // 언팔로우
        const { error } = await this.supabase.getClient()
          .from('user_follows')
          .delete()
          .eq('follower_id', followerId)
          .eq('following_id', followingId);

        if (error) {
          return { success: false, action: 'unfollowed', error: '언팔로우에 실패했습니다.' };
        }

        return { success: true, action: 'unfollowed' };
      } else {
        // 팔로우
        const { error } = await this.supabase.getClient()
          .from('user_follows')
          .insert({
            follower_id: followerId,
            following_id: followingId
          });

        if (error) {
          return { success: false, action: 'followed', error: '팔로우에 실패했습니다.' };
        }

        // 팔로우 알림 발송
        await this.sendNotification(followingId, 'new_follower', {
          follower_id: followerId
        });

        return { success: true, action: 'followed' };
      }

    } catch (error) {
      console.error('Follow user error:', error);
      return { 
        success: false, 
        action: 'followed',
        error: error instanceof Error ? error.message : '팔로우 처리 중 오류가 발생했습니다.' 
      };
    }
  }

  // 소셜 상호작용 (좋아요, 북마크 등)
  async addInteraction(
    userId: string,
    targetType: 'share' | 'review' | 'user',
    targetId: string,
    interactionType: 'like' | 'comment' | 'bookmark' | 'share',
    metadata?: any
  ): Promise<{ success: boolean; action: 'added' | 'removed'; error?: string }> {
    try {
      // 기존 상호작용 확인
      const { data: existingInteraction } = await this.supabase.getClient()
        .from('social_interactions')
        .select('*')
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .eq('interaction_type', interactionType)
        .single();

      if (existingInteraction) {
        // 상호작용 제거
        const { error } = await this.supabase.getClient()
          .from('social_interactions')
          .delete()
          .eq('id', existingInteraction.id);

        if (error) {
          return { success: false, action: 'removed', error: '상호작용 제거에 실패했습니다.' };
        }

        // 카운트 업데이트
        await this.updateInteractionCount(targetType, targetId, interactionType, -1);

        return { success: true, action: 'removed' };
      } else {
        // 새 상호작용 추가
        const interaction: Partial<SocialInteraction> = {
          user_id: userId,
          target_type: targetType,
          target_id: targetId,
          interaction_type: interactionType,
          metadata: metadata || {}
        };

        const { error } = await this.supabase.getClient()
          .from('social_interactions')
          .insert(interaction);

        if (error) {
          return { success: false, action: 'added', error: '상호작용 추가에 실패했습니다.' };
        }

        // 카운트 업데이트
        await this.updateInteractionCount(targetType, targetId, interactionType, 1);

        return { success: true, action: 'added' };
      }

    } catch (error) {
      console.error('Add interaction error:', error);
      return { 
        success: false, 
        action: 'added',
        error: error instanceof Error ? error.message : '상호작용 처리 중 오류가 발생했습니다.' 
      };
    }
  }

  // 댓글 작성
  async addComment(
    userId: string,
    targetType: 'share' | 'review',
    targetId: string,
    content: string,
    parentCommentId?: string
  ): Promise<{ success: boolean; comment_id?: string; error?: string }> {
    try {
      if (content.length < 1 || content.length > 500) {
        return { success: false, error: '댓글은 1-500자 사이여야 합니다.' };
      }

      // 멘션 추출 (@username 형태)
      const mentions = this.extractMentions(content);

      const comment: Partial<Comment> = {
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
        content: content,
        parent_comment_id: parentCommentId,
        mentions: mentions
      };

      const { data: createdComment, error } = await this.supabase.getClient()
        .from('comments')
        .insert(comment)
        .select()
        .single();

      if (error) {
        console.error('Failed to create comment:', error);
        return { success: false, error: '댓글 작성에 실패했습니다.' };
      }

      // 멘션된 사용자들에게 알림 발송
      for (const mention of mentions) {
        await this.sendMentionNotification(mention, userId, createdComment.id);
      }

      return { success: true, comment_id: createdComment.id };

    } catch (error) {
      console.error('Add comment error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '댓글 작성 중 오류가 발생했습니다.' 
      };
    }
  }

  // 개인화된 피드 가져오기
  async getPersonalizedFeed(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    success: boolean;
    feed?: Array<{
      type: 'share' | 'review' | 'follow';
      data: any;
      user: any;
      artwork?: any;
      engagement: {
        likes: number;
        comments: number;
        bookmarks: number;
        user_liked: boolean;
        user_bookmarked: boolean;
      };
      created_at: string;
    }>;
    error?: string;
  }> {
    try {
      // 팔로우하는 사용자들의 활동 가져오기
      const { data: followingUsers } = await this.supabase.getClient()
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);

      const followingIds = followingUsers?.map(f => f.following_id) || [];
      followingIds.push(userId); // 자신의 활동도 포함

      // 공유된 작품들
      const { data: shares } = await this.supabase.getClient()
        .from('artwork_shares')
        .select(`
          *,
          users!user_id(id, email, display_name, avatar_url),
          artworks!artwork_id(*)
        `)
        .in('user_id', followingIds)
        .in('privacy_level', ['public', 'followers'])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // 리뷰들
      const { data: reviews } = await this.supabase.getClient()
        .from('artwork_reviews')
        .select(`
          *,
          users!user_id(id, email, display_name, avatar_url),
          artworks!artwork_id(*)
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // 피드 아이템 통합 및 정렬
      const feedItems: any[] = [];

      // 공유 아이템 처리
      if (shares) {
        for (const share of shares) {
          const engagement = await this.getEngagementStats('share', share.id, userId);
          feedItems.push({
            type: 'share',
            data: share,
            user: share.users,
            artwork: share.artworks,
            engagement,
            created_at: share.created_at
          });
        }
      }

      // 리뷰 아이템 처리
      if (reviews) {
        for (const review of reviews) {
          const engagement = await this.getEngagementStats('review', review.id, userId);
          feedItems.push({
            type: 'review',
            data: review,
            user: review.users,
            artwork: review.artworks,
            engagement,
            created_at: review.created_at
          });
        }
      }

      // 시간순 정렬
      feedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return {
        success: true,
        feed: feedItems.slice(0, limit)
      };

    } catch (error) {
      console.error('Get personalized feed error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '피드 조회 중 오류가 발생했습니다.' 
      };
    }
  }

  // 사용자 프로필 조회 (소셜 정보 포함)
  async getUserSocialProfile(
    targetUserId: string,
    requestingUserId?: string
  ): Promise<{
    success: boolean;
    profile?: {
      user: any;
      stats: {
        followers_count: number;
        following_count: number;
        shares_count: number;
        reviews_count: number;
        total_likes_received: number;
      };
      is_following?: boolean;
      recent_activity: any[];
    };
    error?: string;
  }> {
    try {
      // 사용자 기본 정보
      const { data: user } = await this.supabase.getClient()
        .from('users')
        .select('id, email, display_name, avatar_url, created_at')
        .eq('id', targetUserId)
        .single();

      if (!user) {
        return { success: false, error: '사용자를 찾을 수 없습니다.' };
      }

      // 통계 정보 계산
      const stats = await this.calculateUserStats(targetUserId);

      // 팔로우 관계 확인 (요청자가 있는 경우)
      let isFollowing = false;
      if (requestingUserId && requestingUserId !== targetUserId) {
        const { data: followRelation } = await this.supabase.getClient()
          .from('user_follows')
          .select('*')
          .eq('follower_id', requestingUserId)
          .eq('following_id', targetUserId)
          .single();
        
        isFollowing = !!followRelation;
      }

      // 최근 활동 (공개된 것만)
      const recentActivity = await this.getUserRecentActivity(targetUserId, 10);

      return {
        success: true,
        profile: {
          user,
          stats,
          is_following: isFollowing,
          recent_activity: recentActivity
        }
      };

    } catch (error) {
      console.error('Get user social profile error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '사용자 프로필 조회 중 오류가 발생했습니다.' 
      };
    }
  }

  // 트렌딩 콘텐츠 조회
  async getTrendingContent(
    period: 'day' | 'week' | 'month' = 'week',
    limit: number = 20
  ): Promise<{
    success: boolean;
    trending?: {
      shares: any[];
      reviews: any[];
      artworks: any[];
      users: any[];
    };
    error?: string;
  }> {
    try {
      const periodDate = this.getPeriodDate(period);

      // 트렌딩 공유
      const { data: trendingShares } = await this.supabase.getClient()
        .from('artwork_shares')
        .select(`
          *,
          users!user_id(id, display_name, avatar_url),
          artworks!artwork_id(*),
          social_interactions!target_id(count)
        `)
        .eq('privacy_level', 'public')
        .gte('created_at', periodDate)
        .order('created_at', { ascending: false })
        .limit(limit);

      // 트렌딩 리뷰
      const { data: trendingReviews } = await this.supabase.getClient()
        .from('artwork_reviews')
        .select(`
          *,
          users!user_id(id, display_name, avatar_url),
          artworks!artwork_id(*)
        `)
        .gte('created_at', periodDate)
        .order('helpful_count', { ascending: false })
        .limit(limit);

      // 인기 작품 (상호작용 기준)
      const { data: popularArtworks } = await this.supabase.getClient()
        .from('artworks')
        .select(`
          *,
          artwork_reviews!artwork_id(count),
          artwork_shares!artwork_id(count)
        `)
        .eq('is_active', true)
        .limit(limit);

      // 인기 사용자 (팔로워 증가 기준)
      const { data: popularUsers } = await this.supabase.getClient()
        .from('users')
        .select(`
          id, display_name, avatar_url,
          user_follows!following_id(count)
        `)
        .limit(limit);

      return {
        success: true,
        trending: {
          shares: trendingShares || [],
          reviews: trendingReviews || [],
          artworks: popularArtworks || [],
          users: popularUsers || []
        }
      };

    } catch (error) {
      console.error('Get trending content error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '트렌딩 콘텐츠 조회 중 오류가 발생했습니다.' 
      };
    }
  }

  // 유틸리티 메서드들
  private async updateArtworkRating(artworkId: string): Promise<void> {
    try {
      const { data: reviews } = await this.supabase.getClient()
        .from('artwork_reviews')
        .select('rating')
        .eq('artwork_id', artworkId);

      if (reviews && reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;

        await this.supabase.getClient()
          .from('artworks')
          .update({
            average_rating: averageRating,
            total_reviews: reviews.length
          })
          .eq('id', artworkId);
      }
    } catch (error) {
      console.error('Failed to update artwork rating:', error);
    }
  }

  private async updateInteractionCount(
    targetType: string,
    targetId: string,
    interactionType: string,
    delta: number
  ): Promise<void> {
    try {
      const table = targetType === 'share' ? 'artwork_shares' : 'artwork_reviews';
      const column = `${interactionType}_count`;

      // 현재 카운트 조회
      const { data: current } = await this.supabase.getClient()
        .from(table)
        .select(column)
        .eq('id', targetId)
        .single();

      if (current) {
        const newCount = Math.max(0, (current[column] || 0) + delta);
        
        await this.supabase.getClient()
          .from(table)
          .update({ [column]: newCount })
          .eq('id', targetId);
      }
    } catch (error) {
      console.error('Failed to update interaction count:', error);
    }
  }

  private async getEngagementStats(
    targetType: 'share' | 'review',
    targetId: string,
    userId: string
  ): Promise<{
    likes: number;
    comments: number;
    bookmarks: number;
    user_liked: boolean;
    user_bookmarked: boolean;
  }> {
    try {
      // 전체 상호작용 카운트
      const { data: interactions } = await this.supabase.getClient()
        .from('social_interactions')
        .select('interaction_type')
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      // 댓글 카운트
      const { data: comments } = await this.supabase.getClient()
        .from('comments')
        .select('id')
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      // 사용자의 상호작용 확인
      const { data: userInteractions } = await this.supabase.getClient()
        .from('social_interactions')
        .select('interaction_type')
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      const likes = interactions?.filter(i => i.interaction_type === 'like').length || 0;
      const bookmarks = interactions?.filter(i => i.interaction_type === 'bookmark').length || 0;
      const userLiked = userInteractions?.some(i => i.interaction_type === 'like') || false;
      const userBookmarked = userInteractions?.some(i => i.interaction_type === 'bookmark') || false;

      return {
        likes,
        comments: comments?.length || 0,
        bookmarks,
        user_liked: userLiked,
        user_bookmarked: userBookmarked
      };

    } catch (error) {
      console.error('Failed to get engagement stats:', error);
      return {
        likes: 0,
        comments: 0,
        bookmarks: 0,
        user_liked: false,
        user_bookmarked: false
      };
    }
  }

  private async calculateUserStats(userId: string): Promise<{
    followers_count: number;
    following_count: number;
    shares_count: number;
    reviews_count: number;
    total_likes_received: number;
  }> {
    try {
      // 팔로워/팔로잉 수
      const [followersResult, followingResult, sharesResult, reviewsResult] = await Promise.all([
        this.supabase.getClient()
          .from('user_follows')
          .select('id')
          .eq('following_id', userId),
        
        this.supabase.getClient()
          .from('user_follows')
          .select('id')
          .eq('follower_id', userId),
        
        this.supabase.getClient()
          .from('artwork_shares')
          .select('id')
          .eq('user_id', userId),
        
        this.supabase.getClient()
          .from('artwork_reviews')
          .select('id')
          .eq('user_id', userId)
      ]);

      // 받은 좋아요 수 계산
      const { data: userShares } = await this.supabase.getClient()
        .from('artwork_shares')
        .select('id')
        .eq('user_id', userId);

      const { data: userReviews } = await this.supabase.getClient()
        .from('artwork_reviews')
        .select('id')
        .eq('user_id', userId);

      const shareIds = userShares?.map(s => s.id) || [];
      const reviewIds = userReviews?.map(r => r.id) || [];
      const allTargetIds = [...shareIds, ...reviewIds];

      let totalLikes = 0;
      if (allTargetIds.length > 0) {
        const { data: likes } = await this.supabase.getClient()
          .from('social_interactions')
          .select('id')
          .eq('interaction_type', 'like')
          .in('target_id', allTargetIds);
        
        totalLikes = likes?.length || 0;
      }

      return {
        followers_count: followersResult.data?.length || 0,
        following_count: followingResult.data?.length || 0,
        shares_count: sharesResult.data?.length || 0,
        reviews_count: reviewsResult.data?.length || 0,
        total_likes_received: totalLikes
      };

    } catch (error) {
      console.error('Failed to calculate user stats:', error);
      return {
        followers_count: 0,
        following_count: 0,
        shares_count: 0,
        reviews_count: 0,
        total_likes_received: 0
      };
    }
  }

  private async getUserRecentActivity(userId: string, limit: number): Promise<any[]> {
    try {
      const [shares, reviews] = await Promise.all([
        this.supabase.getClient()
          .from('artwork_shares')
          .select(`
            *,
            artworks!artwork_id(title, artist, image_url)
          `)
          .eq('user_id', userId)
          .eq('privacy_level', 'public')
          .order('created_at', { ascending: false })
          .limit(limit),
        
        this.supabase.getClient()
          .from('artwork_reviews')
          .select(`
            *,
            artworks!artwork_id(title, artist, image_url)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)
      ]);

      const activities: any[] = [];

      if (shares.data) {
        activities.push(...shares.data.map(share => ({
          type: 'share',
          data: share,
          created_at: share.created_at
        })));
      }

      if (reviews.data) {
        activities.push(...reviews.data.map(review => ({
          type: 'review',
          data: review,
          created_at: review.created_at
        })));
      }

      return activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('Failed to get user recent activity:', error);
      return [];
    }
  }

  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return [...new Set(mentions)]; // 중복 제거
  }

  private async notifyFollowers(userId: string, type: string, data: any): Promise<void> {
    try {
      // 팔로워 목록 조회
      const { data: followers } = await this.supabase.getClient()
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', userId);

      if (followers) {
        // 각 팔로워에게 알림 발송
        for (const follower of followers) {
          await this.sendNotification(follower.follower_id, type, data);
        }
      }
    } catch (error) {
      console.error('Failed to notify followers:', error);
    }
  }

  private async sendNotification(userId: string, type: string, data: any): Promise<void> {
    try {
      await this.supabase.getClient()
        .from('notifications')
        .insert({
          user_id: userId,
          type: type,
          data: data,
          is_read: false
        });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  private async sendMentionNotification(username: string, mentionerUserId: string, commentId: string): Promise<void> {
    try {
      // 사용자명으로 사용자 찾기
      const { data: mentionedUser } = await this.supabase.getClient()
        .from('users')
        .select('id')
        .eq('display_name', username)
        .single();

      if (mentionedUser) {
        await this.sendNotification(mentionedUser.id, 'mention', {
          mentioner_id: mentionerUserId,
          comment_id: commentId
        });
      }
    } catch (error) {
      console.error('Failed to send mention notification:', error);
    }
  }

  private getPeriodDate(period: 'day' | 'week' | 'month'): string {
    const now = new Date();
    switch (period) {
      case 'day':
        now.setDate(now.getDate() - 1);
        break;
      case 'week':
        now.setDate(now.getDate() - 7);
        break;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        break;
    }
    return now.toISOString();
  }
}