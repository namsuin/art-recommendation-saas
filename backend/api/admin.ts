import { supabase } from '../services/supabase';
import { logger } from '../../shared/logger';

export class AdminAPI {
  
  // 관리자 권한 확인
  static async isAdmin(userId: string): Promise<boolean> {
    if (!supabase) return false;

    try {
      // 간단히 특정 이메일을 관리자로 설정
      const { data: user, error } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (error || !user) return false;

      // 환경변수에서 관리자 이메일 목록 가져오기
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
      return adminEmails.includes(user.email);
    } catch (error) {
      logger.error('Admin check failed:', error);
      return false;
    }
  }

  // 사용자 통계 조회
  static async getUserStats() {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      // 총 사용자 수
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // 프리미엄 사용자 수
      const { count: premiumUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_tier', 'premium');

      // 오늘 가입한 사용자 수
      const today = new Date().toISOString().split('T')[0];
      const { count: todaySignups } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // 활성 구독 수
      const { count: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      return {
        success: true,
        stats: {
          totalUsers: totalUsers || 0,
          premiumUsers: premiumUsers || 0,
          freeUsers: (totalUsers || 0) - (premiumUsers || 0),
          todaySignups: todaySignups || 0,
          activeSubscriptions: activeSubscriptions || 0
        }
      };
    } catch (error) {
      logger.error('Failed to get user stats:', error);
      return {
        success: false,
        error: 'Failed to fetch user statistics'
      };
    }
  }

  // 사용량 통계 조회
  static async getUsageStats() {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      // 오늘 분석된 이미지 수
      const today = new Date().toISOString().split('T')[0];
      const { count: todayAnalysis } = await supabase
        .from('user_uploads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // 이번 달 분석 수
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const { count: monthlyAnalysis } = await supabase
        .from('user_uploads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thisMonth.toISOString());

      // 총 작품 수
      const { count: totalArtworks } = await supabase
        .from('artworks')
        .select('*', { count: 'exact', head: true })
        .eq('available', true);

      // 총 추천 수
      const { count: totalRecommendations } = await supabase
        .from('recommendations')
        .select('*', { count: 'exact', head: true });

      // 클릭된 추천 수
      const { count: clickedRecommendations } = await supabase
        .from('recommendations')
        .select('*', { count: 'exact', head: true })
        .eq('clicked', true);

      return {
        success: true,
        stats: {
          todayAnalysis: todayAnalysis || 0,
          monthlyAnalysis: monthlyAnalysis || 0,
          totalArtworks: totalArtworks || 0,
          totalRecommendations: totalRecommendations || 0,
          clickedRecommendations: clickedRecommendations || 0,
          clickRate: totalRecommendations > 0 ? 
            ((clickedRecommendations || 0) / totalRecommendations * 100).toFixed(1) : '0'
        }
      };
    } catch (error) {
      logger.error('Failed to get usage stats:', error);
      return {
        success: false,
        error: 'Failed to fetch usage statistics'
      };
    }
  }

  // 최근 사용자 활동 조회
  static async getRecentActivity() {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      // 최근 가입 사용자
      const { data: recentUsers, error: usersError } = await supabase
        .from('users')
        .select('id, email, display_name, created_at, subscription_tier')
        .order('created_at', { ascending: false })
        .limit(10);

      if (usersError) {
        throw usersError;
      }

      // 최근 업로드
      const { data: recentUploads, error: uploadsError } = await supabase
        .from('user_uploads')
        .select(`
          id, created_at, analysis_keywords,
          users (email, display_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (uploadsError) {
        logger.warn('Failed to fetch recent uploads:', uploadsError);
      }

      return {
        success: true,
        recentUsers: recentUsers || [],
        recentUploads: recentUploads || []
      };
    } catch (error) {
      logger.error('Failed to get recent activity:', error);
      return {
        success: false,
        error: 'Failed to fetch recent activity'
      };
    }
  }

  // 작품 관리 - 목록 조회
  static async getArtworks(page = 1, limit = 20) {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const offset = (page - 1) * limit;

      const { data: artworks, error, count } = await supabase
        .from('artworks')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return {
        success: true,
        artworks: artworks || [],
        totalCount: count || 0,
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      logger.error('Failed to get artworks:', error);
      return {
        success: false,
        error: 'Failed to fetch artworks'
      };
    }
  }

  // 작품 추가
  static async createArtwork(artworkData: {
    title: string;
    artist: string;
    image_url: string;
    thumbnail_url?: string;
    description?: string;
    keywords: string[];
    price?: number;
    admin_user_id: string;
  }) {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const { data: artwork, error } = await supabase
        .from('artworks')
        .insert([artworkData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        artwork
      };
    } catch (error) {
      logger.error('Failed to create artwork:', error);
      return {
        success: false,
        error: 'Failed to create artwork'
      };
    }
  }

  // 작품 수정
  static async updateArtwork(artworkId: string, updates: Partial<{
    title: string;
    artist: string;
    image_url: string;
    thumbnail_url: string;
    description: string;
    keywords: string[];
    price: number;
    available: boolean;
  }>) {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const { data: artwork, error } = await supabase
        .from('artworks')
        .update(updates)
        .eq('id', artworkId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        artwork
      };
    } catch (error) {
      logger.error('Failed to update artwork:', error);
      return {
        success: false,
        error: 'Failed to update artwork'
      };
    }
  }

  // 작품 삭제
  static async deleteArtwork(artworkId: string) {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const { error } = await supabase
        .from('artworks')
        .delete()
        .eq('id', artworkId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete artwork:', error);
      return {
        success: false,
        error: 'Failed to delete artwork'
      };
    }
  }

  // 사용자 관리 - 구독 변경
  static async updateUserSubscription(userId: string, tier: 'free' | 'premium') {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const { data: user, error } = await supabase
        .from('users')
        .update({ subscription_tier: tier })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        user
      };
    } catch (error) {
      logger.error('Failed to update user subscription:', error);
      return {
        success: false,
        error: 'Failed to update user subscription'
      };
    }
  }
}