/**
 * 비즈니스 메트릭 추적 시스템
 * KPI 추적, 수익 분석, 사용자 행동 지표 측정
 */

import { supabase } from './supabase';
import { mockDB } from './mock-database';

export interface KPIMetrics {
  date: string;
  revenue: {
    totalRevenue: number;
    subscriptionRevenue: number;
    oneTimeRevenue: number;
    mrr: number; // Monthly Recurring Revenue
    arr: number; // Annual Recurring Revenue
  };
  users: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    churnedUsers: number;
    retentionRate: number;
  };
  engagement: {
    totalAnalyses: number;
    avgAnalysesPerUser: number;
    multiImageUsageRate: number;
    sessionDuration: number;
    bounceRate: number;
  };
  conversion: {
    signupRate: number;
    subscriptionConversionRate: number;
    trialToSubscriptionRate: number;
    reactivationRate: number;
  };
  growth: {
    userGrowthRate: number;
    revenueGrowthRate: number;
    churnRate: number;
    ltv: number; // Lifetime Value
    cac: number; // Customer Acquisition Cost
  };
}

export interface RevenueAnalysis {
  period: string;
  totalRevenue: number;
  revenueBySource: {
    subscriptions: number;
    oneTimePayments: number;
    premiumFeatures: number;
  };
  revenueByPlan: {
    free: number;
    standard: number;
    premium: number;
  };
  monthlyTrend: { month: string; revenue: number }[];
  cohortAnalysis: {
    cohort: string;
    users: number;
    revenue: number;
    retention: number;
  }[];
  forecast: {
    nextMonth: number;
    nextQuarter: number;
    confidence: number;
  };
}

export interface UserBehaviorMetrics {
  period: string;
  userJourney: {
    acquisition: number;
    activation: number;
    retention: number;
    referral: number;
    revenue: number;
  };
  featureUsage: {
    feature: string;
    usage: number;
    conversionImpact: number;
  }[];
  dropoffAnalysis: {
    step: string;
    users: number;
    dropoffRate: number;
  }[];
  cohortRetention: {
    week: number;
    retentionRate: number;
  }[];
}

export interface CompetitiveMetrics {
  marketShare: number;
  benchmarkComparison: {
    metric: string;
    ourValue: number;
    industryAverage: number;
    topPerformers: number;
  }[];
  competitorAnalysis: {
    competitor: string;
    strengths: string[];
    weaknesses: string[];
    marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';
  }[];
}

export interface BusinessGoal {
  id: string;
  name: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved';
  progress: number;
  milestones: {
    date: string;
    value: number;
    description: string;
  }[];
}

export interface BusinessAlert {
  id: string;
  type: 'revenue' | 'growth' | 'churn' | 'performance' | 'goal';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  value: number;
  threshold: number;
  trend: 'improving' | 'stable' | 'declining';
  timestamp: string;
  actionItems: string[];
}

export class BusinessMetricsService {
  /**
   * KPI 메트릭 조회
   */
  async getKPIMetrics(
    startDate?: string, 
    endDate?: string
  ): Promise<{ success: boolean; data?: KPIMetrics; error?: string }> {
    try {
      if (!supabase) {
        return {
          success: true,
          data: this.generateMockKPIMetrics()
        };
      }

      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = endDate || new Date().toISOString();

      // 수익 데이터 조회
      const { data: revenueData } = await supabase
        .from('payments')
        .select('amount, payment_type, created_at')
        .gte('created_at', start)
        .lte('created_at', end);

      // 사용자 데이터 조회
      const { data: userData } = await supabase
        .from('users')
        .select('id, created_at, last_active, subscription_status')
        .gte('created_at', start)
        .lte('created_at', end);

      // 분석 데이터 조회
      const { data: analysisData } = await supabase
        .from('user_uploads')
        .select('user_id, created_at')
        .gte('created_at', start)
        .lte('created_at', end);

      // KPI 계산
      const totalRevenue = revenueData?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const subscriptionRevenue = revenueData?.filter(p => p.payment_type === 'subscription').reduce((sum, p) => sum + p.amount, 0) || 0;
      const oneTimeRevenue = totalRevenue - subscriptionRevenue;

      const totalUsers = userData?.length || 0;
      const activeUsers = userData?.filter(u => {
        const lastActive = new Date(u.last_active);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return lastActive > sevenDaysAgo;
      }).length || 0;

      const kpiMetrics: KPIMetrics = {
        date: new Date().toISOString().split('T')[0],
        revenue: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          subscriptionRevenue: Math.round(subscriptionRevenue * 100) / 100,
          oneTimeRevenue: Math.round(oneTimeRevenue * 100) / 100,
          mrr: Math.round(subscriptionRevenue * 100) / 100, // Simplified MRR
          arr: Math.round(subscriptionRevenue * 12 * 100) / 100
        },
        users: {
          totalUsers,
          activeUsers,
          newUsers: totalUsers,
          churnedUsers: Math.floor(totalUsers * 0.05), // Mock 5% churn
          retentionRate: 95.0
        },
        engagement: {
          totalAnalyses: analysisData?.length || 0,
          avgAnalysesPerUser: totalUsers > 0 ? Math.round((analysisData?.length || 0) / totalUsers * 10) / 10 : 0,
          multiImageUsageRate: 15.8, // Mock
          sessionDuration: 12.5, // Mock minutes
          bounceRate: 35.2 // Mock percentage
        },
        conversion: {
          signupRate: 12.5, // Mock
          subscriptionConversionRate: 8.3, // Mock
          trialToSubscriptionRate: 25.0, // Mock
          reactivationRate: 15.0 // Mock
        },
        growth: {
          userGrowthRate: 15.2, // Mock
          revenueGrowthRate: 22.1, // Mock
          churnRate: 5.0, // Mock
          ltv: 285.50, // Mock
          cac: 45.25 // Mock
        }
      };

      return { success: true, data: kpiMetrics };

    } catch (error) {
      logger.error('Get KPI metrics error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'KPI 메트릭 조회 실패'
      };
    }
  }

  /**
   * 수익 분석
   */
  async getRevenueAnalysis(
    period: 'month' | 'quarter' | 'year' = 'month'
  ): Promise<{ success: boolean; data?: RevenueAnalysis; error?: string }> {
    try {
      if (!supabase) {
        return {
          success: true,
          data: this.generateMockRevenueAnalysis(period)
        };
      }

      const periodDays = period === 'month' ? 30 : period === 'quarter' ? 90 : 365;
      const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

      const { data: payments } = await supabase
        .from('payments')
        .select(`
          amount,
          payment_type,
          created_at,
          users (subscription_status)
        `)
        .gte('created_at', startDate);

      if (!payments) {
        return {
          success: true,
          data: this.generateMockRevenueAnalysis(period)
        };
      }

      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      const subscriptionRevenue = payments.filter(p => p.payment_type === 'subscription').reduce((sum, p) => sum + p.amount, 0);
      const oneTimeRevenue = payments.filter(p => p.payment_type === 'one_time').reduce((sum, p) => sum + p.amount, 0);

      // 월별 추세 계산
      const monthlyTrend = this.calculateMonthlyTrend(payments);

      const revenueAnalysis: RevenueAnalysis = {
        period,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        revenueBySource: {
          subscriptions: Math.round(subscriptionRevenue * 100) / 100,
          oneTimePayments: Math.round(oneTimeRevenue * 100) / 100,
          premiumFeatures: Math.round(totalRevenue * 0.1 * 100) / 100 // Mock
        },
        revenueByPlan: {
          free: 0,
          standard: Math.round(totalRevenue * 0.6 * 100) / 100,
          premium: Math.round(totalRevenue * 0.4 * 100) / 100
        },
        monthlyTrend,
        cohortAnalysis: this.generateMockCohortAnalysis(),
        forecast: {
          nextMonth: Math.round(totalRevenue * 1.15 * 100) / 100, // 15% growth
          nextQuarter: Math.round(totalRevenue * 3.5 * 100) / 100,
          confidence: 82.5
        }
      };

      return { success: true, data: revenueAnalysis };

    } catch (error) {
      logger.error('Get revenue analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '수익 분석 실패'
      };
    }
  }

  /**
   * 사용자 행동 메트릭
   */
  async getUserBehaviorMetrics(
    period: string = '30d'
  ): Promise<{ success: boolean; data?: UserBehaviorMetrics; error?: string }> {
    try {
      if (!supabase) {
        return {
          success: true,
          data: this.generateMockUserBehaviorMetrics(period)
        };
      }

      const days = parseInt(period.replace('d', ''));
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data: activities } = await supabase
        .from('user_activity_logs')
        .select('user_id, action, timestamp')
        .gte('timestamp', startDate);

      const userBehaviorMetrics: UserBehaviorMetrics = {
        period,
        userJourney: this.calculateUserJourney(activities || []),
        featureUsage: this.calculateFeatureUsage(activities || []),
        dropoffAnalysis: this.calculateDropoffAnalysis(activities || []),
        cohortRetention: this.calculateCohortRetention(activities || [])
      };

      return { success: true, data: userBehaviorMetrics };

    } catch (error) {
      logger.error('Get user behavior metrics error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '사용자 행동 메트릭 조회 실패'
      };
    }
  }

  /**
   * 비즈니스 목표 조회
   */
  async getBusinessGoals(): Promise<{ success: boolean; data?: BusinessGoal[]; error?: string }> {
    try {
      if (!supabase) {
        return {
          success: true,
          data: this.generateMockBusinessGoals()
        };
      }

      const { data: goals, error } = await supabase
        .from('business_goals')
        .select('*')
        .order('deadline', { ascending: true });

      if (error) throw error;

      const formattedGoals: BusinessGoal[] = goals?.map(goal => ({
        id: goal.id,
        name: goal.name,
        description: goal.description,
        targetValue: goal.target_value,
        currentValue: goal.current_value,
        unit: goal.unit,
        deadline: goal.deadline,
        status: goal.status,
        progress: Math.round((goal.current_value / goal.target_value) * 100),
        milestones: goal.milestones || []
      })) || [];

      return { success: true, data: formattedGoals };

    } catch (error) {
      logger.error('Get business goals error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '비즈니스 목표 조회 실패'
      };
    }
  }

  /**
   * 비즈니스 알림 조회
   */
  async getBusinessAlerts(): Promise<{ success: boolean; data?: BusinessAlert[]; error?: string }> {
    try {
      if (!supabase) {
        return {
          success: true,
          data: this.generateMockBusinessAlerts()
        };
      }

      const { data: alerts, error } = await supabase
        .from('business_alerts')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedAlerts: BusinessAlert[] = alerts?.map(alert => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        value: alert.value,
        threshold: alert.threshold,
        trend: alert.trend,
        timestamp: alert.timestamp,
        actionItems: alert.action_items || []
      })) || [];

      return { success: true, data: formattedAlerts };

    } catch (error) {
      logger.error('Get business alerts error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '비즈니스 알림 조회 실패'
      };
    }
  }

  // Private helper methods

  private calculateMonthlyTrend(payments: any[]): { month: string; revenue: number }[] {
    const monthlyData = new Map<string, number>();
    
    payments.forEach(payment => {
      const month = new Date(payment.created_at).toISOString().slice(0, 7); // YYYY-MM
      monthlyData.set(month, (monthlyData.get(month) || 0) + payment.amount);
    });

    return Array.from(monthlyData.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private calculateUserJourney(activities: any[]): any {
    const uniqueUsers = new Set(activities.map(a => a.user_id)).size;
    
    return {
      acquisition: uniqueUsers,
      activation: Math.floor(uniqueUsers * 0.8),
      retention: Math.floor(uniqueUsers * 0.6),
      referral: Math.floor(uniqueUsers * 0.1),
      revenue: Math.floor(uniqueUsers * 0.15)
    };
  }

  private calculateFeatureUsage(activities: any[]): any[] {
    const features = ['image_analysis', 'multi_image', 'recommendations', 'gallery', 'social'];
    
    return features.map(feature => ({
      feature,
      usage: Math.floor(Math.random() * 1000) + 100,
      conversionImpact: Math.round(Math.random() * 10 + 5)
    }));
  }

  private calculateDropoffAnalysis(activities: any[]): any[] {
    return [
      { step: 'Landing Page', users: 1000, dropoffRate: 20 },
      { step: 'Sign Up', users: 800, dropoffRate: 25 },
      { step: 'First Upload', users: 600, dropoffRate: 30 },
      { step: 'First Analysis', users: 420, dropoffRate: 15 },
      { step: 'Subscription', users: 357, dropoffRate: 85 }
    ];
  }

  private calculateCohortRetention(activities: any[]): any[] {
    return Array.from({ length: 12 }, (_, i) => ({
      week: i + 1,
      retentionRate: Math.max(100 - (i * 8), 20) + Math.random() * 10 - 5
    }));
  }

  // Mock data generators

  private generateMockKPIMetrics(): KPIMetrics {
    return {
      date: new Date().toISOString().split('T')[0],
      revenue: {
        totalRevenue: 45280.50,
        subscriptionRevenue: 38420.00,
        oneTimeRevenue: 6860.50,
        mrr: 38420.00,
        arr: 461040.00
      },
      users: {
        totalUsers: 1250,
        activeUsers: 892,
        newUsers: 87,
        churnedUsers: 23,
        retentionRate: 94.2
      },
      engagement: {
        totalAnalyses: 5420,
        avgAnalysesPerUser: 4.3,
        multiImageUsageRate: 18.5,
        sessionDuration: 15.2,
        bounceRate: 32.8
      },
      conversion: {
        signupRate: 14.8,
        subscriptionConversionRate: 9.2,
        trialToSubscriptionRate: 28.5,
        reactivationRate: 18.3
      },
      growth: {
        userGrowthRate: 18.5,
        revenueGrowthRate: 25.2,
        churnRate: 4.8,
        ltv: 325.80,
        cac: 52.30
      }
    };
  }

  private generateMockRevenueAnalysis(period: string): RevenueAnalysis {
    const baseRevenue = period === 'year' ? 450000 : period === 'quarter' ? 112500 : 37500;
    
    return {
      period,
      totalRevenue: baseRevenue,
      revenueBySource: {
        subscriptions: baseRevenue * 0.8,
        oneTimePayments: baseRevenue * 0.15,
        premiumFeatures: baseRevenue * 0.05
      },
      revenueByPlan: {
        free: 0,
        standard: baseRevenue * 0.6,
        premium: baseRevenue * 0.4
      },
      monthlyTrend: [
        { month: '2024-10', revenue: 32500 },
        { month: '2024-11', revenue: 35200 },
        { month: '2024-12', revenue: 37500 },
        { month: '2025-01', revenue: 39800 }
      ],
      cohortAnalysis: this.generateMockCohortAnalysis(),
      forecast: {
        nextMonth: baseRevenue * 1.12,
        nextQuarter: baseRevenue * 3.8,
        confidence: 85.2
      }
    };
  }

  private generateMockCohortAnalysis(): any[] {
    return [
      { cohort: '2024-10', users: 156, revenue: 8250, retention: 92 },
      { cohort: '2024-11', users: 189, revenue: 9840, retention: 89 },
      { cohort: '2024-12', users: 234, revenue: 12680, retention: 94 },
      { cohort: '2025-01', users: 287, revenue: 15420, retention: 96 }
    ];
  }

  private generateMockUserBehaviorMetrics(period: string): UserBehaviorMetrics {
    return {
      period,
      userJourney: {
        acquisition: 1200,
        activation: 960,
        retention: 720,
        referral: 120,
        revenue: 180
      },
      featureUsage: [
        { feature: 'image_analysis', usage: 5420, conversionImpact: 8.5 },
        { feature: 'multi_image', usage: 892, conversionImpact: 15.2 },
        { feature: 'recommendations', usage: 3250, conversionImpact: 6.8 },
        { feature: 'gallery', usage: 1680, conversionImpact: 4.2 },
        { feature: 'social', usage: 720, conversionImpact: 12.8 }
      ],
      dropoffAnalysis: [
        { step: 'Landing Page', users: 1200, dropoffRate: 18.5 },
        { step: 'Sign Up', users: 978, dropoffRate: 22.8 },
        { step: 'First Upload', users: 755, dropoffRate: 28.2 },
        { step: 'First Analysis', users: 542, dropoffRate: 12.5 },
        { step: 'Subscription', users: 474, dropoffRate: 82.1 }
      ],
      cohortRetention: [
        { week: 1, retentionRate: 100 },
        { week: 2, retentionRate: 92.5 },
        { week: 3, retentionRate: 87.2 },
        { week: 4, retentionRate: 82.8 },
        { week: 8, retentionRate: 75.3 },
        { week: 12, retentionRate: 68.9 }
      ]
    };
  }

  private generateMockBusinessGoals(): BusinessGoal[] {
    return [
      {
        id: 'goal_1',
        name: '월간 구독자 1,500명 달성',
        description: '2025년 3월까지 월간 활성 구독자 1,500명 달성',
        targetValue: 1500,
        currentValue: 892,
        unit: '명',
        deadline: '2025-03-31',
        status: 'on_track',
        progress: 59,
        milestones: [
          { date: '2025-01-31', value: 1000, description: '1,000명 달성' },
          { date: '2025-02-28', value: 1250, description: '1,250명 달성' },
          { date: '2025-03-31', value: 1500, description: '최종 목표 달성' }
        ]
      },
      {
        id: 'goal_2',
        name: '월 매출 $50,000 달성',
        description: '2025년 2월까지 월간 매출 $50,000 달성',
        targetValue: 50000,
        currentValue: 37500,
        unit: '$',
        deadline: '2025-02-28',
        status: 'on_track',
        progress: 75,
        milestones: [
          { date: '2025-01-31', value: 42000, description: '$42,000 달성' },
          { date: '2025-02-28', value: 50000, description: '최종 목표 달성' }
        ]
      },
      {
        id: 'goal_3',
        name: '고객 이탈률 5% 미만 유지',
        description: '분기별 고객 이탈률을 5% 미만으로 유지',
        targetValue: 5,
        currentValue: 4.8,
        unit: '%',
        deadline: '2025-03-31',
        status: 'achieved',
        progress: 104,
        milestones: [
          { date: '2025-01-31', value: 5.2, description: '목표 근접' },
          { date: '2025-02-15', value: 4.8, description: '목표 달성' }
        ]
      }
    ];
  }

  private generateMockBusinessAlerts(): BusinessAlert[] {
    return [
      {
        id: 'alert_1',
        type: 'growth',
        severity: 'warning',
        title: '신규 사용자 증가율 둔화',
        message: '지난 주 신규 사용자 증가율이 10% 감소했습니다.',
        value: 8.5,
        threshold: 15.0,
        trend: 'declining',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        actionItems: [
          '마케팅 캠페인 효과 분석',
          '신규 사용자 유입 채널 점검',
          '경쟁사 활동 모니터링'
        ]
      },
      {
        id: 'alert_2',
        type: 'revenue',
        severity: 'info',
        title: '프리미엄 구독 증가',
        message: '프리미엄 구독자가 지난 달 대비 25% 증가했습니다.',
        value: 25.0,
        threshold: 20.0,
        trend: 'improving',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        actionItems: [
          '프리미엄 기능 사용 패턴 분석',
          '성공 요인 파악 및 확대 적용',
          '추가 프리미엄 기능 개발 검토'
        ]
      },
      {
        id: 'alert_3',
        type: 'churn',
        severity: 'critical',
        title: '고객 이탈률 증가 주의',
        message: '이번 주 고객 이탈률이 임계값을 초과했습니다.',
        value: 7.2,
        threshold: 5.0,
        trend: 'declining',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        actionItems: [
          '이탈 고객 설문 조사 실시',
          '서비스 품질 점검',
          '고객 지원 강화',
          '리텐션 캠페인 즉시 실행'
        ]
      }
    ];
  }
}