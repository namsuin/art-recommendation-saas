import { logger } from '../../shared/logger';
import { supabase } from './supabase';

interface ArtworkReview {
  id: string;
  user_id: string;
  artwork_id: string;
  rating: number; // 1-5 stars
  title: string;
  content: string;
  is_verified_purchase?: boolean;
  helpful_count: number;
  reported_count: number;
  created_at: string;
  updated_at: string;
  user_profile?: {
    display_name: string;
    avatar_url?: string;
  };
}

interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_distribution: {
    five_star: number;
    four_star: number;
    three_star: number;
    two_star: number;
    one_star: number;
  };
}

interface ReviewHelpful {
  id: string;
  user_id: string;
  review_id: string;
  is_helpful: boolean;
  created_at: string;
}

export class ReviewSystemService {

  /**
   * 작품 리뷰 작성
   */
  async createReview(userId: string, artworkId: string, reviewData: {
    rating: number;
    title: string;
    content: string;
    is_verified_purchase?: boolean;
  }): Promise<{
    success: boolean;
    review?: ArtworkReview;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    // 평점 유효성 검사
    if (reviewData.rating < 1 || reviewData.rating > 5) {
      return { success: false, error: '평점은 1-5 사이의 값이어야 합니다.' };
    }

    // 내용 길이 검사
    if (reviewData.title.length < 5 || reviewData.title.length > 100) {
      return { success: false, error: '제목은 5-100자 사이여야 합니다.' };
    }

    if (reviewData.content.length < 10 || reviewData.content.length > 2000) {
      return { success: false, error: '내용은 10-2000자 사이여야 합니다.' };
    }

    try {
      // 기존 리뷰 확인 (한 작품당 한 사용자당 하나의 리뷰만)
      const { data: existingReview } = await supabase
        .from('artwork_reviews')
        .select('id')
        .eq('user_id', userId)
        .eq('artwork_id', artworkId)
        .single();

      if (existingReview) {
        return { success: false, error: '이미 이 작품에 대한 리뷰를 작성하셨습니다.' };
      }

      // 자신의 작품에 리뷰 작성 방지
      const { data: artwork } = await supabase
        .from('gallery_artworks')
        .select('user_id')
        .eq('id', artworkId)
        .single();

      if (artwork?.user_id === userId) {
        return { success: false, error: '자신의 작품에는 리뷰를 작성할 수 없습니다.' };
      }

      // 리뷰 생성
      const { data: review, error: insertError } = await supabase
        .from('artwork_reviews')
        .insert({
          user_id: userId,
          artwork_id: artworkId,
          rating: reviewData.rating,
          title: reviewData.title,
          content: reviewData.content,
          is_verified_purchase: reviewData.is_verified_purchase || false,
          helpful_count: 0,
          reported_count: 0
        })
        .select(`
          *,
          user_profile:user_galleries(display_name, avatar_url)
        `)
        .single();

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      // 작품의 평균 평점 업데이트
      await this.updateArtworkRating(artworkId);

      return { success: true, review };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '리뷰 작성 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 작품 리뷰 목록 조회
   */
  async getArtworkReviews(artworkId: string, options: {
    limit?: number;
    offset?: number;
    sortBy?: 'newest' | 'oldest' | 'highest_rating' | 'lowest_rating' | 'most_helpful';
    rating_filter?: number;
  } = {}): Promise<{
    success: boolean;
    reviews?: ArtworkReview[];
    stats?: ReviewStats;
    total?: number;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    const { limit = 20, offset = 0, sortBy = 'newest', rating_filter } = options;

    try {
      // 리뷰 목록 쿼리 생성
      let query = supabase
        .from('artwork_reviews')
        .select(`
          *,
          user_profile:user_galleries(display_name, avatar_url)
        `, { count: 'exact' })
        .eq('artwork_id', artworkId);

      // 평점 필터 적용
      if (rating_filter) {
        query = query.eq('rating', rating_filter);
      }

      // 정렬 옵션 적용
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'highest_rating':
          query = query.order('rating', { ascending: false });
          break;
        case 'lowest_rating':
          query = query.order('rating', { ascending: true });
          break;
        case 'most_helpful':
          query = query.order('helpful_count', { ascending: false });
          break;
      }

      const { data: reviews, error, count } = await query
        .range(offset, offset + limit - 1);

      if (error) {
        return { success: false, error: error.message };
      }

      // 리뷰 통계 조회
      const stats = await this.getReviewStats(artworkId);

      return {
        success: true,
        reviews: reviews || [],
        stats,
        total: count || 0
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '리뷰 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 리뷰 통계 조회
   */
  async getReviewStats(artworkId: string): Promise<ReviewStats> {
    if (!supabase) {
      return {
        total_reviews: 0,
        average_rating: 0,
        rating_distribution: {
          five_star: 0,
          four_star: 0,
          three_star: 0,
          two_star: 0,
          one_star: 0
        }
      };
    }

    try {
      const { data: reviews } = await supabase
        .from('artwork_reviews')
        .select('rating')
        .eq('artwork_id', artworkId);

      if (!reviews || reviews.length === 0) {
        return {
          total_reviews: 0,
          average_rating: 0,
          rating_distribution: {
            five_star: 0,
            four_star: 0,
            three_star: 0,
            two_star: 0,
            one_star: 0
          }
        };
      }

      const totalReviews = reviews.length;
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / totalReviews;

      const ratingDistribution = {
        five_star: reviews.filter(r => r.rating === 5).length,
        four_star: reviews.filter(r => r.rating === 4).length,
        three_star: reviews.filter(r => r.rating === 3).length,
        two_star: reviews.filter(r => r.rating === 2).length,
        one_star: reviews.filter(r => r.rating === 1).length
      };

      return {
        total_reviews: totalReviews,
        average_rating: Math.round(averageRating * 10) / 10, // 소수점 첫째자리까지
        rating_distribution: ratingDistribution
      };

    } catch (error) {
      logger.error('Failed to get review stats:', error);
      return {
        total_reviews: 0,
        average_rating: 0,
        rating_distribution: {
          five_star: 0,
          four_star: 0,
          three_star: 0,
          two_star: 0,
          one_star: 0
        }
      };
    }
  }

  /**
   * 리뷰 도움됨/도움안됨 표시
   */
  async markReviewHelpful(userId: string, reviewId: string, isHelpful: boolean): Promise<{
    success: boolean;
    helpfulCount: number;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, helpfulCount: 0, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      // 기존 평가 확인
      const { data: existingHelpful } = await supabase
        .from('review_helpful')
        .select('*')
        .eq('user_id', userId)
        .eq('review_id', reviewId)
        .single();

      if (existingHelpful) {
        if (existingHelpful.is_helpful === isHelpful) {
          // 같은 평가인 경우 제거
          await supabase
            .from('review_helpful')
            .delete()
            .eq('id', existingHelpful.id);
        } else {
          // 다른 평가인 경우 업데이트
          await supabase
            .from('review_helpful')
            .update({ is_helpful: isHelpful })
            .eq('id', existingHelpful.id);
        }
      } else {
        // 새로운 평가 생성
        await supabase
          .from('review_helpful')
          .insert({
            user_id: userId,
            review_id: reviewId,
            is_helpful: isHelpful
          });
      }

      // 리뷰의 도움됨 카운트 업데이트
      const helpfulCount = await this.updateReviewHelpfulCount(reviewId);

      return { success: true, helpfulCount };

    } catch (error) {
      return {
        success: false,
        helpfulCount: 0,
        error: error instanceof Error ? error.message : '리뷰 평가 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 리뷰 신고
   */
  async reportReview(userId: string, reviewId: string, reason: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      // 중복 신고 방지
      const { data: existingReport } = await supabase
        .from('review_reports')
        .select('id')
        .eq('user_id', userId)
        .eq('review_id', reviewId)
        .single();

      if (existingReport) {
        return { success: false, error: '이미 신고한 리뷰입니다.' };
      }

      // 신고 생성
      await supabase
        .from('review_reports')
        .insert({
          user_id: userId,
          review_id: reviewId,
          reason: reason,
          status: 'pending'
        });

      // 리뷰 신고 카운트 증가
      await supabase.rpc('increment_review_reports', { review_id: reviewId });

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '리뷰 신고 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 사용자가 작성한 리뷰 목록
   */
  async getUserReviews(userId: string, limit: number = 20, offset: number = 0): Promise<{
    success: boolean;
    reviews?: (ArtworkReview & { artwork: any })[];
    total?: number;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      const { data: reviews, error, count } = await supabase
        .from('artwork_reviews')
        .select(`
          *,
          artwork:gallery_artworks(id, title, image_url, thumbnail_url)
        `, { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        reviews: reviews || [],
        total: count || 0
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '사용자 리뷰 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 리뷰 수정
   */
  async updateReview(userId: string, reviewId: string, updateData: {
    rating?: number;
    title?: string;
    content?: string;
  }): Promise<{
    success: boolean;
    review?: ArtworkReview;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      // 리뷰 소유권 확인
      const { data: existingReview } = await supabase
        .from('artwork_reviews')
        .select('user_id, artwork_id')
        .eq('id', reviewId)
        .single();

      if (!existingReview || existingReview.user_id !== userId) {
        return { success: false, error: '리뷰를 수정할 권한이 없습니다.' };
      }

      // 리뷰 업데이트
      const { data: updatedReview, error: updateError } = await supabase
        .from('artwork_reviews')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .select(`
          *,
          user_profile:user_galleries(display_name, avatar_url)
        `)
        .single();

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // 평점이 변경된 경우 작품 평균 평점 업데이트
      if (updateData.rating) {
        await this.updateArtworkRating(existingReview.artwork_id);
      }

      return { success: true, review: updatedReview };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '리뷰 수정 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 리뷰 삭제
   */
  async deleteReview(userId: string, reviewId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!supabase) {
      return { success: false, error: '데이터베이스가 구성되지 않았습니다.' };
    }

    try {
      // 리뷰 소유권 확인
      const { data: existingReview } = await supabase
        .from('artwork_reviews')
        .select('user_id, artwork_id')
        .eq('id', reviewId)
        .single();

      if (!existingReview || existingReview.user_id !== userId) {
        return { success: false, error: '리뷰를 삭제할 권한이 없습니다.' };
      }

      // 리뷰 삭제 (CASCADE로 관련 데이터도 함께 삭제됨)
      const { error: deleteError } = await supabase
        .from('artwork_reviews')
        .delete()
        .eq('id', reviewId);

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }

      // 작품 평균 평점 업데이트
      await this.updateArtworkRating(existingReview.artwork_id);

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '리뷰 삭제 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 작품 평균 평점 업데이트
   */
  private async updateArtworkRating(artworkId: string): Promise<void> {
    if (!supabase) return;

    try {
      const stats = await this.getReviewStats(artworkId);
      
      await supabase
        .from('gallery_artworks')
        .update({
          average_rating: stats.average_rating,
          reviews_count: stats.total_reviews
        })
        .eq('id', artworkId);

    } catch (error) {
      logger.error('Failed to update artwork rating:', error);
    }
  }

  /**
   * 리뷰 도움됨 카운트 업데이트
   */
  private async updateReviewHelpfulCount(reviewId: string): Promise<number> {
    if (!supabase) return 0;

    try {
      const { data: helpfulVotes } = await supabase
        .from('review_helpful')
        .select('is_helpful')
        .eq('review_id', reviewId);

      const helpfulCount = helpfulVotes?.filter(vote => vote.is_helpful).length || 0;

      await supabase
        .from('artwork_reviews')
        .update({ helpful_count: helpfulCount })
        .eq('id', reviewId);

      return helpfulCount;

    } catch (error) {
      logger.error('Failed to update review helpful count:', error);
      return 0;
    }
  }
}