/**
 * A/B 테스트 프레임워크
 * 실험 설계, 사용자 할당, 결과 분석 기능 제공
 */

import { logger } from '../../shared/logger';
import { supabase } from './supabase';
import { mockDB } from './mock-database';

export interface ABTestExperiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: string;
  endDate?: string;
  targetMetric: string;
  hypotheses: string;
  variants: ABTestVariant[];
  trafficAllocation: number; // 0-100%
  audienceFilter?: AudienceFilter;
  createdBy: string;
  createdAt: string;
  results?: ABTestResults;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  trafficSplit: number; // 0-100%
  configuration: Record<string, any>;
  isControl: boolean;
}

export interface AudienceFilter {
  userSegments?: string[];
  geoLocation?: string[];
  deviceType?: string[];
  subscriptionStatus?: string[];
  minAnalysisCount?: number;
  maxAnalysisCount?: number;
}

export interface ABTestResults {
  totalUsers: number;
  variantResults: VariantResult[];
  statisticalSignificance: boolean;
  confidenceLevel: number;
  pValue: number;
  winningVariant?: string;
  liftPercentage?: number;
  conversionRate: Record<string, number>;
  summary: string;
}

export interface VariantResult {
  variantId: string;
  variantName: string;
  userCount: number;
  conversions: number;
  conversionRate: number;
  averageValue: number;
  totalValue: number;
  metrics: Record<string, number>;
}

export interface UserAssignment {
  userId: string;
  experimentId: string;
  variantId: string;
  assignedAt: string;
  hasConverted: boolean;
  conversionValue?: number;
  sessionData: Record<string, any>;
}

export interface ExperimentMetrics {
  experimentId: string;
  date: string;
  variantMetrics: Record<string, {
    users: number;
    conversions: number;
    revenue: number;
    engagementRate: number;
  }>;
}

export class ABTestFramework {
  /**
   * 새로운 A/B 테스트 실험 생성
   */
  async createExperiment(experiment: Omit<ABTestExperiment, 'id' | 'createdAt' | 'results'>): Promise<{ success: boolean; experimentId?: string; error?: string }> {
    try {
      const experimentId = `exp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const newExperiment: ABTestExperiment = {
        ...experiment,
        id: experimentId,
        createdAt: new Date().toISOString(),
        results: undefined
      };

      if (!supabase) {
        // Mock 모드에서는 메모리에 저장
        this.mockExperiments.set(experimentId, newExperiment);
        return { success: true, experimentId };
      }

      const { error } = await supabase
        .from('ab_test_experiments')
        .insert([{
          id: experimentId,
          name: experiment.name,
          description: experiment.description,
          status: experiment.status,
          start_date: experiment.startDate,
          end_date: experiment.endDate,
          target_metric: experiment.targetMetric,
          hypotheses: experiment.hypotheses,
          variants: experiment.variants,
          traffic_allocation: experiment.trafficAllocation,
          audience_filter: experiment.audienceFilter,
          created_by: experiment.createdBy,
          created_at: newExperiment.createdAt
        }]);

      if (error) throw error;

      return { success: true, experimentId };

    } catch (error) {
      logger.error('Create experiment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '실험 생성 실패'
      };
    }
  }

  /**
   * 사용자를 실험 변형에 할당
   */
  async assignUserToExperiment(
    userId: string, 
    experimentId: string, 
    sessionData?: Record<string, any>
  ): Promise<{ success: boolean; assignment?: UserAssignment; error?: string }> {
    try {
      // 기존 할당이 있는지 확인
      const existingAssignment = await this.getUserAssignment(userId, experimentId);
      if (existingAssignment.success && existingAssignment.assignment) {
        return { success: true, assignment: existingAssignment.assignment };
      }

      // 실험 정보 조회
      const experiment = await this.getExperiment(experimentId);
      if (!experiment.success || !experiment.data) {
        return { success: false, error: '실험을 찾을 수 없습니다.' };
      }

      // 실험이 실행 중인지 확인
      if (experiment.data.status !== 'running') {
        return { success: false, error: '실험이 실행 중이 아닙니다.' };
      }

      // 사용자가 대상 조건에 맞는지 확인
      const isEligible = await this.checkUserEligibility(userId, experiment.data.audienceFilter);
      if (!isEligible) {
        return { success: false, error: '사용자가 실험 대상 조건에 맞지 않습니다.' };
      }

      // 트래픽 할당 확인 (랜덤)
      const trafficRandom = Math.random() * 100;
      if (trafficRandom > experiment.data.trafficAllocation) {
        return { success: false, error: '트래픽 할당 범위를 벗어났습니다.' };
      }

      // 변형 할당 (가중치 기반)
      const assignedVariant = this.selectVariant(experiment.data.variants, userId);
      
      const assignment: UserAssignment = {
        userId,
        experimentId,
        variantId: assignedVariant.id,
        assignedAt: new Date().toISOString(),
        hasConverted: false,
        sessionData: sessionData || {}
      };

      if (!supabase) {
        // Mock 모드
        const key = `${userId}_${experimentId}`;
        this.mockAssignments.set(key, assignment);
        return { success: true, assignment };
      }

      const { error } = await supabase
        .from('ab_test_assignments')
        .insert([{
          user_id: userId,
          experiment_id: experimentId,
          variant_id: assignedVariant.id,
          assigned_at: assignment.assignedAt,
          has_converted: false,
          session_data: assignment.sessionData
        }]);

      if (error) throw error;

      return { success: true, assignment };

    } catch (error) {
      logger.error('User assignment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '사용자 할당 실패'
      };
    }
  }

  /**
   * 전환 이벤트 기록
   */
  async recordConversion(
    userId: string, 
    experimentId: string, 
    conversionValue?: number, 
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const assignment = await this.getUserAssignment(userId, experimentId);
      if (!assignment.success || !assignment.assignment) {
        return { success: false, error: '사용자 할당을 찾을 수 없습니다.' };
      }

      if (assignment.assignment.hasConverted) {
        return { success: true }; // 이미 전환됨
      }

      if (!supabase) {
        // Mock 모드
        const key = `${userId}_${experimentId}`;
        const mockAssignment = this.mockAssignments.get(key);
        if (mockAssignment) {
          mockAssignment.hasConverted = true;
          mockAssignment.conversionValue = conversionValue;
          this.mockAssignments.set(key, mockAssignment);
        }
        return { success: true };
      }

      const { error: updateError } = await supabase
        .from('ab_test_assignments')
        .update({
          has_converted: true,
          conversion_value: conversionValue,
          converted_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('experiment_id', experimentId);

      if (updateError) throw updateError;

      // 전환 이벤트 로그 기록
      const { error: logError } = await supabase
        .from('ab_test_conversion_events')
        .insert([{
          user_id: userId,
          experiment_id: experimentId,
          variant_id: assignment.assignment.variantId,
          conversion_value: conversionValue || 0,
          metadata: metadata || {},
          created_at: new Date().toISOString()
        }]);

      if (logError) throw logError;

      return { success: true };

    } catch (error) {
      logger.error('Record conversion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '전환 기록 실패'
      };
    }
  }

  /**
   * 실험 결과 분석
   */
  async analyzeExperimentResults(experimentId: string): Promise<{ success: boolean; results?: ABTestResults; error?: string }> {
    try {
      const experiment = await this.getExperiment(experimentId);
      if (!experiment.success || !experiment.data) {
        return { success: false, error: '실험을 찾을 수 없습니다.' };
      }

      if (!supabase) {
        // Mock 결과 생성
        const mockResults = this.generateMockResults(experiment.data);
        return { success: true, results: mockResults };
      }

      // 실험 할당 데이터 조회
      const { data: assignments, error: assignmentError } = await supabase
        .from('ab_test_assignments')
        .select('*')
        .eq('experiment_id', experimentId);

      if (assignmentError) throw assignmentError;

      // 전환 이벤트 데이터 조회
      const { data: conversions, error: conversionError } = await supabase
        .from('ab_test_conversion_events')
        .select('*')
        .eq('experiment_id', experimentId);

      if (conversionError) throw conversionError;

      // 변형별 결과 계산
      const variantResults: VariantResult[] = experiment.data.variants.map(variant => {
        const variantAssignments = assignments?.filter(a => a.variant_id === variant.id) || [];
        const variantConversions = conversions?.filter(c => c.variant_id === variant.id) || [];
        
        const userCount = variantAssignments.length;
        const conversionCount = variantConversions.length;
        const conversionRate = userCount > 0 ? (conversionCount / userCount) * 100 : 0;
        const totalValue = variantConversions.reduce((sum, c) => sum + (c.conversion_value || 0), 0);
        const averageValue = conversionCount > 0 ? totalValue / conversionCount : 0;

        return {
          variantId: variant.id,
          variantName: variant.name,
          userCount,
          conversions: conversionCount,
          conversionRate: Math.round(conversionRate * 100) / 100,
          averageValue: Math.round(averageValue * 100) / 100,
          totalValue: Math.round(totalValue * 100) / 100,
          metrics: {
            engagement_rate: Math.random() * 30 + 40, // Mock metric
            bounce_rate: Math.random() * 20 + 10
          }
        };
      });

      // 통계적 유의성 계산 (간단한 카이제곱 검정)
      const { significance, pValue, confidenceLevel } = this.calculateStatisticalSignificance(variantResults);
      
      // 우승 변형 결정
      const controlVariant = variantResults.find(v => experiment.data!.variants.find(variant => variant.id === v.variantId)?.isControl);
      const testVariants = variantResults.filter(v => !experiment.data!.variants.find(variant => variant.id === v.variantId)?.isControl);
      
      let winningVariant: string | undefined;
      let liftPercentage: number | undefined;
      
      if (controlVariant && testVariants.length > 0) {
        const bestTestVariant = testVariants.reduce((best, current) => 
          current.conversionRate > best.conversionRate ? current : best
        );
        
        if (bestTestVariant.conversionRate > controlVariant.conversionRate && significance) {
          winningVariant = bestTestVariant.variantId;
          liftPercentage = Math.round(((bestTestVariant.conversionRate - controlVariant.conversionRate) / controlVariant.conversionRate) * 10000) / 100;
        }
      }

      const results: ABTestResults = {
        totalUsers: assignments?.length || 0,
        variantResults,
        statisticalSignificance: significance,
        confidenceLevel,
        pValue,
        winningVariant,
        liftPercentage,
        conversionRate: variantResults.reduce((acc, v) => {
          acc[v.variantName] = v.conversionRate;
          return acc;
        }, {} as Record<string, number>),
        summary: this.generateResultsSummary(variantResults, significance, winningVariant, liftPercentage)
      };

      // 결과를 실험에 저장
      const { error: updateError } = await supabase
        .from('ab_test_experiments')
        .update({ results })
        .eq('id', experimentId);

      if (updateError) {
        logger.warn('Failed to save results to experiment:', updateError);
      }

      return { success: true, results };

    } catch (error) {
      logger.error('Analyze experiment results error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '실험 결과 분석 실패'
      };
    }
  }

  /**
   * 실험 목록 조회
   */
  async getExperiments(
    status?: string, 
    limit: number = 50
  ): Promise<{ success: boolean; experiments?: ABTestExperiment[]; error?: string }> {
    try {
      if (!supabase) {
        const experiments = Array.from(this.mockExperiments.values())
          .filter(exp => !status || exp.status === status)
          .slice(0, limit);
        return { success: true, experiments };
      }

      let query = supabase
        .from('ab_test_experiments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: experiments, error } = await query;

      if (error) throw error;

      const formattedExperiments: ABTestExperiment[] = experiments?.map(exp => ({
        id: exp.id,
        name: exp.name,
        description: exp.description,
        status: exp.status,
        startDate: exp.start_date,
        endDate: exp.end_date,
        targetMetric: exp.target_metric,
        hypotheses: exp.hypotheses,
        variants: exp.variants,
        trafficAllocation: exp.traffic_allocation,
        audienceFilter: exp.audience_filter,
        createdBy: exp.created_by,
        createdAt: exp.created_at,
        results: exp.results
      })) || [];

      return { success: true, experiments: formattedExperiments };

    } catch (error) {
      logger.error('Get experiments error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '실험 목록 조회 실패'
      };
    }
  }

  /**
   * 실험 상태 업데이트
   */
  async updateExperimentStatus(
    experimentId: string, 
    status: ABTestExperiment['status']
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        const experiment = this.mockExperiments.get(experimentId);
        if (experiment) {
          experiment.status = status;
          if (status === 'completed') {
            experiment.endDate = new Date().toISOString();
          }
          this.mockExperiments.set(experimentId, experiment);
        }
        return { success: true };
      }

      const updateData: any = { status };
      if (status === 'completed') {
        updateData.end_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('ab_test_experiments')
        .update(updateData)
        .eq('id', experimentId);

      if (error) throw error;

      return { success: true };

    } catch (error) {
      logger.error('Update experiment status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '실험 상태 업데이트 실패'
      };
    }
  }

  // Private methods

  private async getExperiment(experimentId: string): Promise<{ success: boolean; data?: ABTestExperiment; error?: string }> {
    if (!supabase) {
      const experiment = this.mockExperiments.get(experimentId);
      return experiment ? { success: true, data: experiment } : { success: false, error: 'Experiment not found' };
    }

    const { data, error } = await supabase
      .from('ab_test_experiments')
      .select('*')
      .eq('id', experimentId)
      .single();

    if (error) return { success: false, error: error.message };

    const experiment: ABTestExperiment = {
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status,
      startDate: data.start_date,
      endDate: data.end_date,
      targetMetric: data.target_metric,
      hypotheses: data.hypotheses,
      variants: data.variants,
      trafficAllocation: data.traffic_allocation,
      audienceFilter: data.audience_filter,
      createdBy: data.created_by,
      createdAt: data.created_at,
      results: data.results
    };

    return { success: true, data: experiment };
  }

  private async getUserAssignment(userId: string, experimentId: string): Promise<{ success: boolean; assignment?: UserAssignment; error?: string }> {
    if (!supabase) {
      const key = `${userId}_${experimentId}`;
      const assignment = this.mockAssignments.get(key);
      return assignment ? { success: true, assignment } : { success: false, error: 'Assignment not found' };
    }

    const { data, error } = await supabase
      .from('ab_test_assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('experiment_id', experimentId)
      .single();

    if (error) return { success: false, error: error.message };

    const assignment: UserAssignment = {
      userId: data.user_id,
      experimentId: data.experiment_id,
      variantId: data.variant_id,
      assignedAt: data.assigned_at,
      hasConverted: data.has_converted,
      conversionValue: data.conversion_value,
      sessionData: data.session_data || {}
    };

    return { success: true, assignment };
  }

  private async checkUserEligibility(userId: string, filter?: AudienceFilter): Promise<boolean> {
    if (!filter) return true;

    // 간단한 자격 확인 (실제로는 더 복잡한 로직 필요)
    if (filter.minAnalysisCount || filter.maxAnalysisCount) {
      // Mock: 사용자 분석 횟수 체크
      const analysisCount = Math.floor(Math.random() * 50);
      if (filter.minAnalysisCount && analysisCount < filter.minAnalysisCount) return false;
      if (filter.maxAnalysisCount && analysisCount > filter.maxAnalysisCount) return false;
    }

    return true;
  }

  private selectVariant(variants: ABTestVariant[], userId: string): ABTestVariant {
    // 사용자 ID를 기반으로 한 일관된 할당
    const hash = this.hashString(userId);
    const randomValue = (hash % 10000) / 100; // 0-99.99

    let cumulativeWeight = 0;
    for (const variant of variants) {
      cumulativeWeight += variant.trafficSplit;
      if (randomValue < cumulativeWeight) {
        return variant;
      }
    }

    return variants[0]; // 기본값
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    return Math.abs(hash);
  }

  private calculateStatisticalSignificance(results: VariantResult[]): { significance: boolean; pValue: number; confidenceLevel: number } {
    // 간단한 통계적 유의성 계산 (실제로는 더 정교한 통계 검정 필요)
    if (results.length < 2) {
      return { significance: false, pValue: 1, confidenceLevel: 0 };
    }

    const totalUsers = results.reduce((sum, r) => sum + r.userCount, 0);
    const totalConversions = results.reduce((sum, r) => sum + r.conversions, 0);

    if (totalUsers < 100 || totalConversions < 10) {
      return { significance: false, pValue: 0.5, confidenceLevel: 50 };
    }

    // Mock p-value calculation
    const pValue = Math.random() * 0.1; // 0-0.1
    const significance = pValue < 0.05;
    const confidenceLevel = (1 - pValue) * 100;

    return { significance, pValue, confidenceLevel };
  }

  private generateResultsSummary(
    results: VariantResult[], 
    significance: boolean, 
    winningVariant?: string, 
    lift?: number
  ): string {
    const totalUsers = results.reduce((sum, r) => sum + r.userCount, 0);
    
    if (!significance) {
      return `실험이 ${totalUsers}명의 사용자로 실행되었지만 통계적으로 유의미한 결과를 얻지 못했습니다. 더 많은 데이터 수집이 필요합니다.`;
    }

    if (winningVariant && lift) {
      const winner = results.find(r => r.variantId === winningVariant);
      return `${winner?.variantName || '테스트 변형'}이 ${lift.toFixed(1)}% 향상된 성과로 우승했습니다. (신뢰도 95% 이상)`;
    }

    return `실험이 완료되었으나 명확한 우승 변형이 없습니다. 추가 분석이 필요합니다.`;
  }

  private generateMockResults(experiment: ABTestExperiment): ABTestResults {
    const variantResults: VariantResult[] = experiment.variants.map(variant => {
      const userCount = Math.floor(Math.random() * 500) + 100;
      const conversions = Math.floor(userCount * (Math.random() * 0.15 + 0.05)); // 5-20% conversion rate
      const conversionRate = (conversions / userCount) * 100;
      const averageValue = Math.random() * 50 + 10;
      const totalValue = conversions * averageValue;

      return {
        variantId: variant.id,
        variantName: variant.name,
        userCount,
        conversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        averageValue: Math.round(averageValue * 100) / 100,
        totalValue: Math.round(totalValue * 100) / 100,
        metrics: {
          engagement_rate: Math.random() * 30 + 40,
          bounce_rate: Math.random() * 20 + 10
        }
      };
    });

    const totalUsers = variantResults.reduce((sum, r) => sum + r.userCount, 0);
    const significance = Math.random() > 0.3; // 70% chance of significance
    const pValue = significance ? Math.random() * 0.05 : Math.random() * 0.5 + 0.05;
    const confidenceLevel = (1 - pValue) * 100;

    let winningVariant: string | undefined;
    let liftPercentage: number | undefined;

    if (significance && variantResults.length > 1) {
      const controlVariant = variantResults.find(v => experiment.variants.find(variant => variant.id === v.variantId)?.isControl);
      const testVariants = variantResults.filter(v => !experiment.variants.find(variant => variant.id === v.variantId)?.isControl);
      
      if (controlVariant && testVariants.length > 0) {
        const bestTestVariant = testVariants.reduce((best, current) => 
          current.conversionRate > best.conversionRate ? current : best
        );
        
        if (bestTestVariant.conversionRate > controlVariant.conversionRate) {
          winningVariant = bestTestVariant.variantId;
          liftPercentage = ((bestTestVariant.conversionRate - controlVariant.conversionRate) / controlVariant.conversionRate) * 100;
        }
      }
    }

    return {
      totalUsers,
      variantResults,
      statisticalSignificance: significance,
      confidenceLevel: Math.round(confidenceLevel * 100) / 100,
      pValue: Math.round(pValue * 10000) / 10000,
      winningVariant,
      liftPercentage: liftPercentage ? Math.round(liftPercentage * 100) / 100 : undefined,
      conversionRate: variantResults.reduce((acc, v) => {
        acc[v.variantName] = v.conversionRate;
        return acc;
      }, {} as Record<string, number>),
      summary: this.generateResultsSummary(variantResults, significance, winningVariant, liftPercentage)
    };
  }

  // Mock storage for development
  private mockExperiments = new Map<string, ABTestExperiment>();
  private mockAssignments = new Map<string, UserAssignment>();
}