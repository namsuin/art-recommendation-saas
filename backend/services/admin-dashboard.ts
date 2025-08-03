/**
 * 관리자 대시보드 서비스
 * 비즈니스 인텔리전스 및 실시간 모니터링 기능 제공
 */

import { supabase } from './supabase';
import { mockDB } from './mock-database';

export interface DashboardStats {
  users: {
    total: number;
    activeToday: number;
    activeThisWeek: number;
    newToday: number;
    growthRate: number;
  };
  analyses: {
    total: number;
    today: number;
    thisWeek: number;
    averagePerUser: number;
    multiImageAnalyses: number;
  };
  revenue: {
    totalRevenue: number;
    monthlyRecurring: number;
    averageOrderValue: number;
    conversionRate: number;
  };
  system: {
    avgResponseTime: number;
    errorRate: number;
    uptime: number;
    aiServiceStatus: Record<string, boolean>;
  };
  content: {
    totalArtworks: number;
    totalReviews: number;
    averageRating: number;
    totalComments: number;
  };
}

export interface UserActivity {
  userId: string;
  userEmail: string;
  displayName: string;
  lastActive: string;
  totalAnalyses: number;
  subscriptionStatus: string;
  joinedDate: string;
  lifetimeValue: number;
}

export interface RevenueMetrics {
  date: string;
  revenue: number;
  subscriptions: number;
  analyses: number;
  conversionRate: number;
}

export class AdminDashboardService {
  /**
   * 대시보드 메인 통계 조회
   */
  async getDashboardStats(): Promise<{ success: boolean; data?: DashboardStats; error?: string }> {
    try {
      // Mock 모드인 경우 샘플 데이터 반환
      if (!supabase) {
        return {
          success: true,
          data: this.generateMockDashboardStats()
        };
      }

      // 사용자 통계
      const userStats = await this.getUserStats();
      
      // 분석 통계
      const analysisStats = await this.getAnalysisStats();
      
      // 수익 통계
      const revenueStats = await this.getRevenueStats();
      
      // 시스템 통계
      const systemStats = await this.getSystemStats();
      
      // 콘텐츠 통계
      const contentStats = await this.getContentStats();

      const dashboardStats: DashboardStats = {
        users: userStats,
        analyses: analysisStats,
        revenue: revenueStats,
        system: systemStats,
        content: contentStats
      };

      return { success: true, data: dashboardStats };

    } catch (error) {
      console.error('Dashboard stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '대시보드 통계 조회 실패'
      };
    }
  }

  /**
   * 사용자 통계 조회
   */
  private async getUserStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    if (!supabase) {
      return {
        total: 1250,
        activeToday: 85,
        activeThisWeek: 420,
        newToday: 12,
        growthRate: 15.3
      };
    }

    // 전체 사용자 수
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // 오늘 활성 사용자
    const { count: activeToday } = await supabase
      .from('user_uploads')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .neq('user_id', null);

    // 이번 주 활성 사용자
    const { count: activeThisWeek } = await supabase
      .from('user_uploads')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString())
      .neq('user_id', null);

    // 오늘 신규 가입자
    const { count: newToday } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // 이번 달 신규 가입자
    const { count: newThisMonth } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString());

    // 지난 달 신규 가입자
    const prevMonth = new Date(monthAgo);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const { count: newLastMonth } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', prevMonth.toISOString())
      .lt('created_at', monthAgo.toISOString());

    const growthRate = newLastMonth ? 
      ((newThisMonth! - newLastMonth) / newLastMonth) * 100 : 0;

    return {
      total: totalUsers || 0,
      activeToday: activeToday || 0,
      activeThisWeek: activeThisWeek || 0,
      newToday: newToday || 0,
      growthRate: Math.round(growthRate * 10) / 10
    };
  }

  /**
   * 분석 통계 조회
   */
  private async getAnalysisStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    if (!supabase) {
      return {
        total: 8420,
        today: 156,
        thisWeek: 1240,
        averagePerUser: 6.7,
        multiImageAnalyses: 890
      };
    }

    // 전체 분석 수
    const { count: totalAnalyses } = await supabase
      .from('user_uploads')
      .select('*', { count: 'exact', head: true });

    // 오늘 분석 수
    const { count: todayAnalyses } = await supabase
      .from('user_uploads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // 이번 주 분석 수
    const { count: weekAnalyses } = await supabase
      .from('user_uploads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    // 다중 이미지 분석 수
    const { count: multiImageAnalyses } = await supabase
      .from('multi_image_analyses')
      .select('*', { count: 'exact', head: true });

    // 사용자당 평균 분석 수
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const averagePerUser = totalUsers ? 
      Math.round((totalAnalyses! / totalUsers) * 10) / 10 : 0;

    return {
      total: totalAnalyses || 0,
      today: todayAnalyses || 0,
      thisWeek: weekAnalyses || 0,
      averagePerUser,
      multiImageAnalyses: multiImageAnalyses || 0
    };
  }

  /**
   * 수익 통계 조회
   */
  private async getRevenueStats() {
    if (!supabase) {
      return {
        totalRevenue: 25680.50,
        monthlyRecurring: 8420.00,
        averageOrderValue: 12.40,
        conversionRate: 3.2
      };
    }

    // 구독 수익 (월 구독)
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('amount, status')
      .eq('status', 'active');

    const monthlyRecurring = subscriptions?.reduce((sum, sub) => sum + sub.amount, 0) || 0;

    // 일회성 결제 (다중 이미지 분석)
    const { data: payments } = await supabase
      .from('multi_image_payments')
      .select('amount')
      .eq('status', 'completed');

    const oneTimeRevenue = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    const totalRevenue = monthlyRecurring + oneTimeRevenue;
    const averageOrderValue = payments?.length ? 
      Math.round((oneTimeRevenue / payments.length) * 100) / 100 : 0;

    // 전환율 계산 (구독한 사용자 / 전체 사용자)
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const conversionRate = totalUsers ? 
      Math.round((subscriptions!.length / totalUsers) * 1000) / 10 : 0;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      monthlyRecurring: Math.round(monthlyRecurring * 100) / 100,
      averageOrderValue,
      conversionRate
    };
  }

  /**
   * 시스템 통계 조회
   */
  private async getSystemStats() {
    // 실제 시스템 메트릭스는 별도 모니터링 서비스에서 수집
    return {
      avgResponseTime: 245, // ms
      errorRate: 0.8, // %
      uptime: 99.7, // %
      aiServiceStatus: {
        googleVision: true,
        replicate: false,
        clarifai: false,
        localClip: false
      }
    };
  }

  /**
   * 콘텐츠 통계 조회
   */
  private async getContentStats() {
    if (!supabase) {
      return {
        totalArtworks: 15420,
        totalReviews: 3280,
        averageRating: 4.3,
        totalComments: 8960
      };
    }

    // 작품 수
    const { count: totalArtworks } = await supabase
      .from('artworks')
      .select('*', { count: 'exact', head: true })
      .eq('available', true);

    // 리뷰 수
    const { count: totalReviews } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true });

    // 평균 별점
    const { data: ratings } = await supabase
      .from('reviews')
      .select('rating');

    const averageRating = ratings?.length ? 
      Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 10) / 10 : 0;

    // 댓글 수
    const { count: totalComments } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true });

    return {
      totalArtworks: totalArtworks || 0,
      totalReviews: totalReviews || 0,
      averageRating,
      totalComments: totalComments || 0
    };
  }

  /**
   * 활성 사용자 목록 조회
   */
  async getActiveUsers(limit: number = 50): Promise<{ success: boolean; data?: UserActivity[]; error?: string }> {
    try {
      if (!supabase) {
        return {
          success: true,
          data: this.generateMockUserActivity(limit)
        };
      }

      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          display_name,
          created_at,
          last_active_at,
          subscription_status,
          user_uploads (count)
        `)
        .order('last_active_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const userActivities: UserActivity[] = users?.map(user => ({
        userId: user.id,
        userEmail: user.email,
        displayName: user.display_name || user.email.split('@')[0],
        lastActive: user.last_active_at || user.created_at,
        totalAnalyses: user.user_uploads?.length || 0,
        subscriptionStatus: user.subscription_status || 'free',
        joinedDate: user.created_at,
        lifetimeValue: this.calculateLifetimeValue(user)
      })) || [];

      return { success: true, data: userActivities };

    } catch (error) {
      console.error('Active users error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '활성 사용자 조회 실패'
      };
    }
  }

  /**
   * 수익 트렌드 조회
   */
  async getRevenueMetrics(days: number = 30): Promise<{ success: boolean; data?: RevenueMetrics[]; error?: string }> {
    try {
      if (!supabase) {
        return {
          success: true,
          data: this.generateMockRevenueMetrics(days)
        };
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 일별 수익 데이터 수집
      const metrics: RevenueMetrics[] = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        // 해당 날짜의 결제 데이터
        const { data: payments } = await supabase
          .from('multi_image_payments')
          .select('amount')
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString())
          .eq('status', 'completed');

        // 해당 날짜의 구독 데이터
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('amount')
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString())
          .eq('status', 'active');

        // 해당 날짜의 분석 수
        const { count: analyses } = await supabase
          .from('user_uploads')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString());

        const dailyRevenue = (payments?.reduce((sum, p) => sum + p.amount, 0) || 0) +
                           (subscriptions?.reduce((sum, s) => sum + s.amount, 0) || 0);

        const totalTransactions = (payments?.length || 0) + (subscriptions?.length || 0);
        const conversionRate = analyses ? (totalTransactions / analyses) * 100 : 0;

        metrics.push({
          date: date.toISOString().split('T')[0],
          revenue: Math.round(dailyRevenue * 100) / 100,
          subscriptions: subscriptions?.length || 0,
          analyses: analyses || 0,
          conversionRate: Math.round(conversionRate * 100) / 100
        });
      }

      return { success: true, data: metrics };

    } catch (error) {
      console.error('Revenue metrics error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '수익 메트릭 조회 실패'
      };
    }
  }

  /**
   * Mock 대시보드 통계 생성
   */
  private generateMockDashboardStats(): DashboardStats {
    return {
      users: {
        total: 1250,
        activeToday: 85,
        activeThisWeek: 420,
        newToday: 12,
        growthRate: 15.3
      },
      analyses: {
        total: 8420,
        today: 156,
        thisWeek: 1240,
        averagePerUser: 6.7,
        multiImageAnalyses: 890
      },
      revenue: {
        totalRevenue: 25680.50,
        monthlyRecurring: 8420.00,
        averageOrderValue: 12.40,
        conversionRate: 3.2
      },
      system: {
        avgResponseTime: 245,
        errorRate: 0.8,
        uptime: 99.7,
        aiServiceStatus: {
          googleVision: true,
          replicate: false,
          clarifai: false,
          localClip: false
        }
      },
      content: {
        totalArtworks: 15420,
        totalReviews: 3280,
        averageRating: 4.3,
        totalComments: 8960
      }
    };
  }

  /**
   * Mock 사용자 활동 데이터 생성
   */
  private generateMockUserActivity(limit: number): UserActivity[] {
    const activities: UserActivity[] = [];
    const statuses = ['free', 'standard', 'premium'];
    
    for (let i = 0; i < limit; i++) {
      activities.push({
        userId: `user_${i + 1}`,
        userEmail: `user${i + 1}@example.com`,
        displayName: `User ${i + 1}`,
        lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        totalAnalyses: Math.floor(Math.random() * 50) + 1,
        subscriptionStatus: statuses[Math.floor(Math.random() * statuses.length)],
        joinedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        lifetimeValue: Math.round((Math.random() * 500 + 10) * 100) / 100
      });
    }

    return activities.sort((a, b) => 
      new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
    );
  }

  /**
   * Mock 수익 메트릭 데이터 생성
   */
  private generateMockRevenueMetrics(days: number): RevenueMetrics[] {
    const metrics: RevenueMetrics[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      
      metrics.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.round((Math.random() * 500 + 100) * 100) / 100,
        subscriptions: Math.floor(Math.random() * 10) + 1,
        analyses: Math.floor(Math.random() * 50) + 10,
        conversionRate: Math.round((Math.random() * 5 + 1) * 100) / 100
      });
    }

    return metrics;
  }

  /**
   * 사용자 생애 가치 계산
   */
  private calculateLifetimeValue(user: any): number {
    // 간단한 LTV 계산: 구독료 + 분석 비용
    const monthlySubscription = user.subscription_status === 'premium' ? 29.99 : 
                               user.subscription_status === 'standard' ? 9.99 : 0;
    const analysisRevenue = (user.user_uploads?.length || 0) * 2.5; // 평균 분석당 $2.5
    
    return Math.round((monthlySubscription + analysisRevenue) * 100) / 100;
  }
}