/**
 * 고급 개인화 추천 시스템
 * 머신러닝 기반 사용자 취향 학습 및 예측
 */

import { supabase } from './supabase';
import { mockDB } from './mock-database';

export interface UserPreference {
  userId: string;
  categories: Record<string, number>; // 카테고리별 선호도 (0-1)
  styles: Record<string, number>; // 스타일별 선호도 (0-1)
  colors: Record<string, number>; // 색상별 선호도 (0-1)
  artists: Record<string, number>; // 아티스트별 선호도 (0-1)
  complexity: number; // 복잡도 선호도 (0-1)
  abstractness: number; // 추상도 선호도 (0-1)
  modernness: number; // 현대성 선호도 (0-1)
  lastUpdated: string;
  confidence: number; // 예측 신뢰도 (0-1)
}

export interface InteractionData {
  userId: string;
  artworkId: string;
  interactionType: 'view' | 'like' | 'save' | 'share' | 'download' | 'skip';
  duration: number; // 시간 (초)
  timestamp: string;
  context: {
    sessionId: string;
    device: string;
    location?: string;
    referrer?: string;
  };
}

export interface RecommendationRequest {
  userId: string;
  count?: number;
  categories?: string[];
  excludeViewed?: boolean;
  diversityFactor?: number; // 0-1, 높을수록 다양성 중시
  freshnessFactor?: number; // 0-1, 높을수록 최신 작품 중시
  similarUsers?: boolean; // 유사 사용자 기반 추천 포함
}

export interface SmartRecommendation {
  artworkId: string;
  title: string;
  artist: string;
  imageUrl: string;
  thumbnailUrl: string;
  category: string;
  style: string;
  colors: string[];
  score: number; // 추천 점수 (0-1)
  confidence: number; // 신뢰도 (0-1)
  reasoning: string[]; // 추천 이유
  similarityFactors: {
    styleMatch: number;
    colorMatch: number;
    categoryMatch: number;
    userBehaviorMatch: number;
    collaborativeFiltering: number;
  };
  metadata: {
    created: string;
    popularity: number;
    trendingScore: number;
    viewCount: number;
    likeCount: number;
  };
}

export interface UserCluster {
  clusterId: string;
  name: string;
  description: string;
  userCount: number;
  characteristics: {
    preferredCategories: string[];
    preferredStyles: string[];
    avgSessionDuration: number;
    engagementLevel: 'low' | 'medium' | 'high';
    diversityPreference: number;
  };
  representative: {
    categories: Record<string, number>;
    styles: Record<string, number>;
    colors: Record<string, number>;
  };
}

export interface RecommendationAnalytics {
  userId: string;
  period: string;
  metrics: {
    totalRecommendations: number;
    clickThroughRate: number;
    averageTimeSpent: number;
    conversionRate: number;
    diversityIndex: number;
    noveltyScore: number;
  };
  topCategories: { category: string; engagement: number }[];
  preferenceEvolution: {
    date: string;
    categories: Record<string, number>;
    styles: Record<string, number>;
  }[];
  similarUsers: {
    userId: string;
    similarity: number;
    sharedPreferences: string[];
  }[];
}

export class AdvancedRecommendationService {
  private userPreferences: Map<string, UserPreference> = new Map();
  private userClusters: Map<string, UserCluster> = new Map();
  private interactionBuffer: InteractionData[] = [];

  constructor() {
    this.initializeClusters();
    // 배치 프로세서는 필요시에만 실행 (성능 개선)
    // setInterval(() => this.processBatchInteractions(), 10000); // 10초마다
  }

  /**
   * 사용자 상호작용 기록
   */
  async recordInteraction(interaction: InteractionData): Promise<{ success: boolean; error?: string }> {
    try {
      // 상호작용 버퍼에 추가
      this.interactionBuffer.push(interaction);

      // 실시간 선호도 업데이트 (중요한 상호작용의 경우)
      if (['like', 'save', 'share', 'download'].includes(interaction.interactionType)) {
        await this.updateUserPreferencesRealtime(interaction);
      }

      // 데이터베이스 저장
      if (supabase) {
        await supabase
          .from('user_interactions')
          .insert([{
            user_id: interaction.userId,
            artwork_id: interaction.artworkId,
            interaction_type: interaction.interactionType,
            duration: interaction.duration,
            timestamp: interaction.timestamp,
            context: interaction.context
          }]);
      }

      return { success: true };

    } catch (error) {
      console.error('Record interaction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '상호작용 기록 실패'
      };
    }
  }

  /**
   * 개인화 추천 생성
   */
  async generatePersonalizedRecommendations(
    request: RecommendationRequest
  ): Promise<{ success: boolean; data?: SmartRecommendation[]; error?: string }> {
    try {
      const count = Math.min(request.count || 20, 50);
      
      // 사용자 선호도 로드
      let userPrefs = await this.getUserPreferences(request.userId);
      if (!userPrefs) {
        // 신규 사용자인 경우 기본 추천
        return await this.generateDefaultRecommendations(count);
      }

      // 다양한 추천 알고리즘 결합
      const recommendations: SmartRecommendation[] = [];
      
      // 1. 콘텐츠 기반 필터링 (40%)
      const contentBased = await this.getContentBasedRecommendations(userPrefs, Math.ceil(count * 0.4));
      recommendations.push(...contentBased);

      // 2. 협업 필터링 (30%)
      if (request.similarUsers) {
        const collaborative = await this.getCollaborativeRecommendations(request.userId, Math.ceil(count * 0.3));
        recommendations.push(...collaborative);
      }

      // 3. 트렌딩 기반 (15%)
      const trending = await this.getTrendingRecommendations(userPrefs, Math.ceil(count * 0.15));
      recommendations.push(...trending);

      // 4. 탐색적 추천 (15%) - 다양성 확보
      const exploratory = await this.getExploratoryRecommendations(userPrefs, Math.ceil(count * 0.15));
      recommendations.push(...exploratory);

      // 중복 제거 및 점수 기반 정렬
      const uniqueRecommendations = this.deduplicateAndRank(recommendations, request);
      
      // 다양성 조정
      const diversifiedRecommendations = this.applyDiversification(
        uniqueRecommendations, 
        request.diversityFactor || 0.3
      );

      // 최신성 조정
      const finalRecommendations = this.applyFreshnessBoost(
        diversifiedRecommendations,
        request.freshnessFactor || 0.2
      );

      return { 
        success: true, 
        data: finalRecommendations.slice(0, count)
      };

    } catch (error) {
      console.error('Generate personalized recommendations error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '개인화 추천 생성 실패'
      };
    }
  }

  /**
   * 사용자 선호도 분석
   */
  async analyzeUserPreferences(userId: string): Promise<{ success: boolean; data?: UserPreference; error?: string }> {
    try {
      const preferences = await this.computeUserPreferences(userId);
      
      if (preferences) {
        this.userPreferences.set(userId, preferences);
        
        // 데이터베이스 저장
        if (supabase) {
          await supabase
            .from('user_preferences')
            .upsert([{
              user_id: userId,
              categories: preferences.categories,
              styles: preferences.styles,
              colors: preferences.colors,
              artists: preferences.artists,
              complexity: preferences.complexity,
              abstractness: preferences.abstractness,
              modernness: preferences.modernness,
              last_updated: preferences.lastUpdated,
              confidence: preferences.confidence
            }]);
        }
      }

      return { success: true, data: preferences };

    } catch (error) {
      console.error('Analyze user preferences error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '사용자 선호도 분석 실패'
      };
    }
  }

  /**
   * 사용자 클러스터링
   */
  async getUserCluster(userId: string): Promise<{ success: boolean; data?: UserCluster; error?: string }> {
    try {
      const userPrefs = await this.getUserPreferences(userId);
      if (!userPrefs) {
        return { success: false, error: '사용자 선호도 데이터가 없습니다.' };
      }

      // 가장 유사한 클러스터 찾기
      let bestCluster: UserCluster | null = null;
      let bestSimilarity = 0;

      for (const cluster of this.userClusters.values()) {
        const similarity = this.calculateClusterSimilarity(userPrefs, cluster);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestCluster = cluster;
        }
      }

      return { success: true, data: bestCluster };

    } catch (error) {
      console.error('Get user cluster error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '사용자 클러스터 조회 실패'
      };
    }
  }

  /**
   * 추천 성과 분석
   */
  async getRecommendationAnalytics(
    userId: string, 
    period: string = '30d'
  ): Promise<{ success: boolean; data?: RecommendationAnalytics; error?: string }> {
    try {
      if (!supabase) {
        return {
          success: true,
          data: this.generateMockAnalytics(userId, period)
        };
      }

      const days = parseInt(period.replace('d', ''));
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // 추천 및 상호작용 데이터 조회
      const { data: interactions } = await supabase
        .from('user_interactions')
        .select(`
          *,
          artworks (category, style, colors)
        `)
        .eq('user_id', userId)
        .gte('created_at', startDate);

      const analytics = this.computeRecommendationAnalytics(userId, period, interactions || []);
      
      return { success: true, data: analytics };

    } catch (error) {
      console.error('Get recommendation analytics error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '추천 분석 조회 실패'
      };
    }
  }

  // Private helper methods

  private async getUserPreferences(userId: string): Promise<UserPreference | null> {
    // 캐시에서 먼저 확인
    if (this.userPreferences.has(userId)) {
      return this.userPreferences.get(userId)!;
    }

    // 데이터베이스에서 조회
    if (supabase) {
      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) {
        const preferences: UserPreference = {
          userId: data.user_id,
          categories: data.categories,
          styles: data.styles,
          colors: data.colors,
          artists: data.artists,
          complexity: data.complexity,
          abstractness: data.abstractness,
          modernness: data.modernness,
          lastUpdated: data.last_updated,
          confidence: data.confidence
        };
        
        this.userPreferences.set(userId, preferences);
        return preferences;
      }
    }

    // 선호도가 없으면 계산
    return await this.computeUserPreferences(userId);
  }

  private async computeUserPreferences(userId: string): Promise<UserPreference | null> {
    // Mock 구현 - 실제로는 사용자 상호작용 데이터 기반으로 계산
    const mockPreferences: UserPreference = {
      userId,
      categories: {
        'portrait': Math.random() * 0.5 + 0.3,
        'landscape': Math.random() * 0.5 + 0.2,
        'abstract': Math.random() * 0.4 + 0.1,
        'modern': Math.random() * 0.6 + 0.2,
        'classical': Math.random() * 0.3 + 0.1,
      },
      styles: {
        'impressionist': Math.random() * 0.4 + 0.1,
        'cubist': Math.random() * 0.3 + 0.1,
        'pop_art': Math.random() * 0.5 + 0.2,
        'contemporary': Math.random() * 0.6 + 0.3,
      },
      colors: {
        'warm': Math.random() * 0.6 + 0.2,
        'cool': Math.random() * 0.4 + 0.3,
        'neutral': Math.random() * 0.3 + 0.4,
        'vibrant': Math.random() * 0.5 + 0.2,
      },
      artists: {
        'van_gogh': Math.random() * 0.4 + 0.1,
        'picasso': Math.random() * 0.3 + 0.1,
        'monet': Math.random() * 0.5 + 0.2,
      },
      complexity: Math.random() * 0.6 + 0.2,
      abstractness: Math.random() * 0.4 + 0.3,
      modernness: Math.random() * 0.7 + 0.2,
      lastUpdated: new Date().toISOString(),
      confidence: Math.random() * 0.3 + 0.6
    };

    return mockPreferences;
  }

  private async updateUserPreferencesRealtime(interaction: InteractionData): Promise<void> {
    const preferences = await this.getUserPreferences(interaction.userId);
    if (!preferences) return;

    // Mock 업데이트 로직
    const weight = this.getInteractionWeight(interaction.interactionType);
    const learningRate = 0.1;

    // 실제로는 작품 메타데이터를 기반으로 선호도 업데이트
    // 여기서는 Mock으로 랜덤 업데이트
    Object.keys(preferences.categories).forEach(category => {
      preferences.categories[category] = Math.max(0, Math.min(1, 
        preferences.categories[category] + (Math.random() - 0.5) * learningRate * weight
      ));
    });

    preferences.lastUpdated = new Date().toISOString();
    this.userPreferences.set(interaction.userId, preferences);
  }

  private getInteractionWeight(type: string): number {
    const weights = {
      'view': 0.1,
      'like': 0.8,
      'save': 0.9,
      'share': 0.95,
      'download': 1.0,
      'skip': -0.5
    };
    return weights[type] || 0.1;
  }

  private async getContentBasedRecommendations(
    userPrefs: UserPreference, 
    count: number
  ): Promise<SmartRecommendation[]> {
    // Mock 콘텐츠 기반 추천
    return this.generateMockRecommendations(count, 'content_based', userPrefs);
  }

  private async getCollaborativeRecommendations(
    userId: string, 
    count: number
  ): Promise<SmartRecommendation[]> {
    // Mock 협업 필터링 추천
    return this.generateMockRecommendations(count, 'collaborative');
  }

  private async getTrendingRecommendations(
    userPrefs: UserPreference, 
    count: number
  ): Promise<SmartRecommendation[]> {
    // Mock 트렌딩 추천
    return this.generateMockRecommendations(count, 'trending', userPrefs);
  }

  private async getExploratoryRecommendations(
    userPrefs: UserPreference, 
    count: number
  ): Promise<SmartRecommendation[]> {
    // Mock 탐색적 추천
    return this.generateMockRecommendations(count, 'exploratory', userPrefs);
  }

  private async generateDefaultRecommendations(count: number): Promise<{ success: boolean; data: SmartRecommendation[] }> {
    const recommendations = this.generateMockRecommendations(count, 'default');
    return { success: true, data: recommendations };
  }

  private deduplicateAndRank(
    recommendations: SmartRecommendation[], 
    request: RecommendationRequest
  ): SmartRecommendation[] {
    const seen = new Set<string>();
    const unique = recommendations.filter(rec => {
      if (seen.has(rec.artworkId)) return false;
      seen.add(rec.artworkId);
      return true;
    });

    return unique.sort((a, b) => b.score - a.score);
  }

  private applyDiversification(
    recommendations: SmartRecommendation[], 
    diversityFactor: number
  ): SmartRecommendation[] {
    // Mock 다양성 적용
    return recommendations.map(rec => ({
      ...rec,
      score: rec.score * (1 - diversityFactor) + Math.random() * diversityFactor
    })).sort((a, b) => b.score - a.score);
  }

  private applyFreshnessBoost(
    recommendations: SmartRecommendation[], 
    freshnessFactor: number
  ): SmartRecommendation[] {
    // Mock 최신성 부스트
    return recommendations.map(rec => {
      const daysSinceCreated = (Date.now() - new Date(rec.metadata.created).getTime()) / (1000 * 60 * 60 * 24);
      const freshnessBoost = Math.max(0, 1 - daysSinceCreated / 365) * freshnessFactor;
      return {
        ...rec,
        score: Math.min(1, rec.score + freshnessBoost)
      };
    }).sort((a, b) => b.score - a.score);
  }

  private calculateClusterSimilarity(userPrefs: UserPreference, cluster: UserCluster): number {
    // Mock 클러스터 유사도 계산
    let similarity = 0;
    let totalWeight = 0;

    // 카테고리 유사도
    Object.entries(cluster.representative.categories).forEach(([category, clusterValue]) => {
      const userValue = userPrefs.categories[category] || 0;
      similarity += (1 - Math.abs(userValue - clusterValue)) * 0.4;
      totalWeight += 0.4;
    });

    // 스타일 유사도
    Object.entries(cluster.representative.styles).forEach(([style, clusterValue]) => {
      const userValue = userPrefs.styles[style] || 0;
      similarity += (1 - Math.abs(userValue - clusterValue)) * 0.3;
      totalWeight += 0.3;
    });

    return totalWeight > 0 ? similarity / totalWeight : 0;
  }

  private computeRecommendationAnalytics(
    userId: string, 
    period: string, 
    interactions: any[]
  ): RecommendationAnalytics {
    // Mock 분석 계산
    return this.generateMockAnalytics(userId, period);
  }

  private processBatchInteractions(): void {
    if (this.interactionBuffer.length === 0) return;

    // 배치 처리 로직
    const interactions = [...this.interactionBuffer];
    this.interactionBuffer = [];

    // 비동기 처리
    this.processBatchInteractionsAsync(interactions);
  }

  private async processBatchInteractionsAsync(interactions: InteractionData[]): Promise<void> {
    // 사용자별 상호작용 그룹화
    const userInteractions = new Map<string, InteractionData[]>();
    
    interactions.forEach(interaction => {
      if (!userInteractions.has(interaction.userId)) {
        userInteractions.set(interaction.userId, []);
      }
      userInteractions.get(interaction.userId)!.push(interaction);
    });

    // 각 사용자의 선호도 업데이트
    for (const [userId, userInteractionList] of userInteractions) {
      await this.batchUpdateUserPreferences(userId, userInteractionList);
    }
  }

  private async batchUpdateUserPreferences(userId: string, interactions: InteractionData[]): Promise<void> {
    // 배치 선호도 업데이트 로직
    console.log(`Batch updating preferences for user ${userId} with ${interactions.length} interactions`);
  }

  private initializeClusters(): void {
    const clusters: UserCluster[] = [
      {
        clusterId: 'art_enthusiasts',
        name: '아트 애호가',
        description: '고전 미술과 현대 미술을 모두 즐기는 사용자',
        userCount: 1250,
        characteristics: {
          preferredCategories: ['classical', 'modern', 'contemporary'],
          preferredStyles: ['impressionist', 'cubist', 'abstract'],
          avgSessionDuration: 25.5,
          engagementLevel: 'high',
          diversityPreference: 0.7
        },
        representative: {
          categories: { 'classical': 0.8, 'modern': 0.7, 'contemporary': 0.6 },
          styles: { 'impressionist': 0.8, 'cubist': 0.6, 'abstract': 0.5 },
          colors: { 'warm': 0.6, 'cool': 0.7, 'neutral': 0.4 }
        }
      },
      {
        clusterId: 'modern_collectors',
        name: '현대 미술 컬렉터',
        description: '현대 미술과 팝 아트를 선호하는 사용자',
        userCount: 892,
        characteristics: {
          preferredCategories: ['modern', 'contemporary', 'pop_art'],
          preferredStyles: ['pop_art', 'contemporary', 'abstract'],
          avgSessionDuration: 18.2,
          engagementLevel: 'medium',
          diversityPreference: 0.4
        },
        representative: {
          categories: { 'modern': 0.9, 'contemporary': 0.8, 'pop_art': 0.7 },
          styles: { 'pop_art': 0.8, 'contemporary': 0.7, 'abstract': 0.6 },
          colors: { 'vibrant': 0.8, 'warm': 0.5, 'cool': 0.6 }
        }
      },
      {
        clusterId: 'casual_browsers',
        name: '일반 감상자',
        description: '다양한 스타일을 가볍게 감상하는 사용자',
        userCount: 2150,
        characteristics: {
          preferredCategories: ['portrait', 'landscape', 'modern'],
          preferredStyles: ['impressionist', 'contemporary'],
          avgSessionDuration: 12.8,
          engagementLevel: 'low',
          diversityPreference: 0.8
        },
        representative: {
          categories: { 'portrait': 0.6, 'landscape': 0.7, 'modern': 0.5 },
          styles: { 'impressionist': 0.6, 'contemporary': 0.5 },
          colors: { 'neutral': 0.7, 'warm': 0.5, 'cool': 0.4 }
        }
      }
    ];

    clusters.forEach(cluster => {
      this.userClusters.set(cluster.clusterId, cluster);
    });
  }

  private generateMockRecommendations(
    count: number, 
    type: string, 
    userPrefs?: UserPreference
  ): SmartRecommendation[] {
    const artworks = [
      'Starry Night Interpretation', 'Modern City Abstract', 'Sunset Landscape',
      'Contemporary Portrait', 'Geometric Composition', 'Floral Still Life',
      'Urban Street Scene', 'Mountain Vista', 'Abstract Color Study',
      'Classic Portrait Study', 'Minimalist Composition', 'Nature Abstraction'
    ];

    const artists = ['김현수', '박미영', '이준호', '최서연', '정민우', '한예진'];
    const categories = ['portrait', 'landscape', 'abstract', 'modern', 'contemporary'];
    const styles = ['impressionist', 'cubist', 'pop_art', 'contemporary', 'abstract'];

    return Array.from({ length: count }, (_, i) => ({
      artworkId: `artwork_${type}_${i + 1}`,
      title: artworks[i % artworks.length] + ` #${i + 1}`,
      artist: artists[i % artists.length],
      imageUrl: `https://art-gallery.example.com/artworks/${type}_${i + 1}.jpg`,
      thumbnailUrl: `https://art-gallery.example.com/thumbs/${type}_${i + 1}.jpg`,
      category: categories[i % categories.length],
      style: styles[i % styles.length],
      colors: ['warm', 'cool', 'vibrant'].slice(0, Math.floor(Math.random() * 3) + 1),
      score: Math.random() * 0.3 + 0.7,
      confidence: Math.random() * 0.2 + 0.8,
      reasoning: [
        '사용자의 스타일 선호도와 일치',
        '유사한 색감의 작품을 선호함',
        '비슷한 카테고리 작품에 높은 관심 표시'
      ].slice(0, Math.floor(Math.random() * 3) + 1),
      similarityFactors: {
        styleMatch: Math.random() * 0.3 + 0.7,
        colorMatch: Math.random() * 0.4 + 0.6,
        categoryMatch: Math.random() * 0.2 + 0.8,
        userBehaviorMatch: Math.random() * 0.3 + 0.6,
        collaborativeFiltering: Math.random() * 0.4 + 0.5
      },
      metadata: {
        created: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        popularity: Math.random() * 100,
        trendingScore: Math.random() * 10,
        viewCount: Math.floor(Math.random() * 5000),
        likeCount: Math.floor(Math.random() * 500)
      }
    }));
  }

  private generateMockAnalytics(userId: string, period: string): RecommendationAnalytics {
    return {
      userId,
      period,
      metrics: {
        totalRecommendations: 245,
        clickThroughRate: 12.8,
        averageTimeSpent: 18.5,
        conversionRate: 3.2,
        diversityIndex: 0.75,
        noveltyScore: 0.68
      },
      topCategories: [
        { category: 'contemporary', engagement: 85.2 },
        { category: 'abstract', engagement: 72.8 },
        { category: 'modern', engagement: 68.5 },
        { category: 'portrait', engagement: 61.3 }
      ],
      preferenceEvolution: [
        {
          date: '2025-01-01',
          categories: { 'contemporary': 0.8, 'abstract': 0.6, 'modern': 0.7 },
          styles: { 'pop_art': 0.7, 'abstract': 0.6, 'contemporary': 0.8 }
        },
        {
          date: '2025-01-15',
          categories: { 'contemporary': 0.85, 'abstract': 0.65, 'modern': 0.75 },
          styles: { 'pop_art': 0.75, 'abstract': 0.65, 'contemporary': 0.85 }
        }
      ],
      similarUsers: [
        {
          userId: 'similar_user_1',
          similarity: 0.82,
          sharedPreferences: ['contemporary', 'abstract', 'pop_art']
        },
        {
          userId: 'similar_user_2',
          similarity: 0.76,
          sharedPreferences: ['modern', 'contemporary']
        }
      ]
    };
  }
}