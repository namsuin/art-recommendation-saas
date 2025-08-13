import { logger } from '../../shared/logger';
import { supabase } from './supabase';

export class AnalyticsService {
  
  // 일일 사용량 기록 업데이트
  static async recordUsage(userId: string, type: 'image_analysis' | 'api_call' | 'recommendation') {
    if (!supabase) return false;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 오늘 날짜의 기록이 있는지 확인
      const { data: existing, error: selectError } = await supabase
        .from('usage_analytics')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      if (existing) {
        // 기존 기록 업데이트
        const updates: any = {};
        
        if (type === 'image_analysis') {
          updates.images_analyzed = (existing.images_analyzed || 0) + 1;
        } else if (type === 'api_call') {
          updates.api_calls = (existing.api_calls || 0) + 1;
        } else if (type === 'recommendation') {
          updates.recommendations_generated = (existing.recommendations_generated || 0) + 1;
        }

        const { error: updateError } = await supabase
          .from('usage_analytics')
          .update(updates)
          .eq('id', existing.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // 새 기록 생성
        const newRecord: any = {
          user_id: userId,
          date: today,
          images_analyzed: 0,
          api_calls: 0,
          storage_used: 0,
          recommendations_generated: 0
        };

        if (type === 'image_analysis') {
          newRecord.images_analyzed = 1;
        } else if (type === 'api_call') {
          newRecord.api_calls = 1;
        } else if (type === 'recommendation') {
          newRecord.recommendations_generated = 1;
        }

        const { error: insertError } = await supabase
          .from('usage_analytics')
          .insert([newRecord]);

        if (insertError) {
          throw insertError;
        }
      }

      return true;
    } catch (error) {
      logger.error('Failed to record usage:', error);
      return false;
    }
  }

  // 사용자별 사용량 통계 조회
  static async getUserUsageStats(userId: string, days = 30) {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: usageData, error } = await supabase
        .from('usage_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        throw error;
      }

      // 집계 계산
      const totalStats = usageData?.reduce((acc, day) => ({
        totalImages: acc.totalImages + (day.images_analyzed || 0),
        totalApiCalls: acc.totalApiCalls + (day.api_calls || 0),
        totalRecommendations: acc.totalRecommendations + (day.recommendations_generated || 0),
        totalStorageUsed: acc.totalStorageUsed + (day.storage_used || 0)
      }), {
        totalImages: 0,
        totalApiCalls: 0,
        totalRecommendations: 0,
        totalStorageUsed: 0
      }) || {
        totalImages: 0,
        totalApiCalls: 0,
        totalRecommendations: 0,
        totalStorageUsed: 0
      };

      // 오늘 사용량
      const today = new Date().toISOString().split('T')[0];
      const todayStats = usageData?.find(day => day.date === today) || {
        images_analyzed: 0,
        api_calls: 0,
        recommendations_generated: 0,
        storage_used: 0
      };

      return {
        success: true,
        stats: {
          period: `${days}일`,
          dailyData: usageData || [],
          totals: totalStats,
          today: {
            images: todayStats.images_analyzed || 0,
            apiCalls: todayStats.api_calls || 0,
            recommendations: todayStats.recommendations_generated || 0,
            storageUsed: todayStats.storage_used || 0
          }
        }
      };
    } catch (error) {
      logger.error('Failed to get user usage stats:', error);
      return {
        success: false,
        error: 'Failed to fetch usage statistics'
      };
    }
  }

  // 전체 시스템 사용량 통계 (관리자용)
  static async getSystemUsageStats(days = 30) {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // 일별 시스템 사용량
      const { data: dailyUsage, error: dailyError } = await supabase
        .from('usage_analytics')
        .select(`
          date,
          images_analyzed,
          api_calls,
          recommendations_generated,
          storage_used
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (dailyError) {
        throw dailyError;
      }

      // 일별 데이터를 날짜별로 집계
      const dailyAggregated = dailyUsage?.reduce((acc: any, record) => {
        const date = record.date;
        if (!acc[date]) {
          acc[date] = {
            date,
            images_analyzed: 0,
            api_calls: 0,
            recommendations_generated: 0,
            storage_used: 0
          };
        }
        
        acc[date].images_analyzed += record.images_analyzed || 0;
        acc[date].api_calls += record.api_calls || 0;
        acc[date].recommendations_generated += record.recommendations_generated || 0;
        acc[date].storage_used += record.storage_used || 0;
        
        return acc;
      }, {});

      const dailyData = Object.values(dailyAggregated || {});

      // 총 사용량 계산
      const totals = dailyUsage?.reduce((acc, record) => ({
        totalImages: acc.totalImages + (record.images_analyzed || 0),
        totalApiCalls: acc.totalApiCalls + (record.api_calls || 0),
        totalRecommendations: acc.totalRecommendations + (record.recommendations_generated || 0),
        totalStorageUsed: acc.totalStorageUsed + (record.storage_used || 0)
      }), {
        totalImages: 0,
        totalApiCalls: 0,
        totalRecommendations: 0,
        totalStorageUsed: 0
      }) || {
        totalImages: 0,
        totalApiCalls: 0,
        totalRecommendations: 0,
        totalStorageUsed: 0
      };

      // 활성 사용자 수 (기간 내 사용한 고유 사용자)
      const { data: activeUsers, error: activeUsersError } = await supabase
        .from('usage_analytics')
        .select('user_id')
        .gte('date', startDate.toISOString().split('T')[0]);

      if (activeUsersError) {
        logger.warn('Failed to get active users:', activeUsersError);
      }

      const uniqueActiveUsers = new Set(activeUsers?.map(u => u.user_id) || []).size;

      return {
        success: true,
        stats: {
          period: `${days}일`,
          dailyData,
          totals,
          activeUsers: uniqueActiveUsers,
          averageDaily: {
            images: Math.round(totals.totalImages / days),
            apiCalls: Math.round(totals.totalApiCalls / days),
            recommendations: Math.round(totals.totalRecommendations / days),
            storageUsed: Math.round(totals.totalStorageUsed / days)
          }
        }
      };
    } catch (error) {
      logger.error('Failed to get system usage stats:', error);
      return {
        success: false,
        error: 'Failed to fetch system usage statistics'
      };
    }
  }

  // 사용자별 월별 사용량 (결제 관련)
  static async getMonthlyUsageForBilling(userId: string, year: number, month: number) {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      // 해당 월의 시작일과 종료일
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const { data: monthlyUsage, error } = await supabase
        .from('usage_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        throw error;
      }

      // 월별 총합 계산
      const monthlyTotals = monthlyUsage?.reduce((acc, day) => ({
        images_analyzed: acc.images_analyzed + (day.images_analyzed || 0),
        api_calls: acc.api_calls + (day.api_calls || 0),
        recommendations_generated: acc.recommendations_generated + (day.recommendations_generated || 0),
        storage_used: Math.max(acc.storage_used, day.storage_used || 0) // 최대 저장 공간 사용량
      }), {
        images_analyzed: 0,
        api_calls: 0,
        recommendations_generated: 0,
        storage_used: 0
      }) || {
        images_analyzed: 0,
        api_calls: 0,
        recommendations_generated: 0,
        storage_used: 0
      };

      return {
        success: true,
        usage: {
          year,
          month,
          dailyData: monthlyUsage || [],
          totals: monthlyTotals,
          daysInMonth: endDate.getDate()
        }
      };
    } catch (error) {
      logger.error('Failed to get monthly usage for billing:', error);
      return {
        success: false,
        error: 'Failed to fetch monthly usage data'
      };
    }
  }

  // 스토리지 사용량 업데이트
  static async updateStorageUsage(userId: string, bytesUsed: number) {
    if (!supabase) return false;

    try {
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('usage_analytics')
        .upsert({
          user_id: userId,
          date: today,
          storage_used: bytesUsed
        });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      logger.error('Failed to update storage usage:', error);
      return false;
    }
  }

  // 추천 클릭률 분석
  static async getRecommendationAnalytics(userId?: string) {
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      let query = supabase
        .from('recommendations')
        .select(`
          id,
          similarity_score,
          clicked,
          created_at,
          user_id
        `);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: recommendations, error } = await query;

      if (error) {
        throw error;
      }

      const analytics = {
        totalRecommendations: recommendations?.length || 0,
        clickedRecommendations: recommendations?.filter(r => r.clicked).length || 0,
        clickRate: 0,
        averageSimilarity: 0,
        clicksByScore: {} as Record<string, { total: number; clicked: number }>
      };

      if (analytics.totalRecommendations > 0) {
        analytics.clickRate = (analytics.clickedRecommendations / analytics.totalRecommendations) * 100;
        
        analytics.averageSimilarity = recommendations!.reduce((sum, r) => sum + (r.similarity_score || 0), 0) / analytics.totalRecommendations;

        // 유사도 점수대별 클릭률 분석
        recommendations!.forEach(rec => {
          const scoreRange = Math.floor((rec.similarity_score || 0) * 10) / 10; // 0.0, 0.1, 0.2 등으로 반올림
          const key = scoreRange.toString();
          
          if (!analytics.clicksByScore[key]) {
            analytics.clicksByScore[key] = { total: 0, clicked: 0 };
          }
          
          analytics.clicksByScore[key].total++;
          if (rec.clicked) {
            analytics.clicksByScore[key].clicked++;
          }
        });
      }

      return {
        success: true,
        analytics
      };
    } catch (error) {
      logger.error('Failed to get recommendation analytics:', error);
      return {
        success: false,
        error: 'Failed to fetch recommendation analytics'
      };
    }
  }
}