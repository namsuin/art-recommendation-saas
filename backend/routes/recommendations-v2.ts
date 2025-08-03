import { PersonalizationEngine } from '../services/personalization-engine';
import { AIAnalysisService } from '../services/ai-analysis';
import { SupabaseService } from '../services/supabase';

interface RecommendationRequest {
  user_id?: string;
  image_buffer?: Buffer;
  limit?: number;
  method?: 'content' | 'collaborative' | 'hybrid' | 'experiment';
  include_reasoning?: boolean;
}

interface ArtworkWithFeatures {
  id: string;
  title: string;
  artist: string;
  image_url: string;
  price: number;
  keywords: string[];
  style: string;
  mood: string;
  colors: string[];
  embeddings: number[];
  metadata?: {
    colorHarmony?: string;
    temperature?: string;
    brightness?: number;
    saturation?: number;
    contrast?: number;
  };
}

export class RecommendationsV2API {
  private personalizationEngine: PersonalizationEngine;
  private aiAnalysisService: AIAnalysisService;
  private supabase: SupabaseService;

  constructor() {
    this.personalizationEngine = new PersonalizationEngine();
    this.aiAnalysisService = new AIAnalysisService();
    this.supabase = new SupabaseService();
  }

  // 고급 개인화 추천 API
  async getPersonalizedRecommendations(req: RecommendationRequest): Promise<{
    success: boolean;
    data?: {
      method: string;
      recommendations: Array<{
        artwork: ArtworkWithFeatures;
        score: number;
        reason: string;
        similarity?: number;
        confidence?: number;
      }>;
      user_profile?: any;
      performance_metrics?: any;
      experiment_info?: {
        group: string;
        session_id: string;
      };
    };
    error?: string;
  }> {
    try {
      const { user_id, image_buffer, limit = 10, method = 'hybrid', include_reasoning = true } = req;

      // 1. 사용 가능한 작품 목록 가져오기 (향상된 특성 포함)
      const availableArtworks = await this.getEnhancedArtworks();
      
      if (availableArtworks.length === 0) {
        return {
          success: false,
          error: 'No artworks available for recommendation'
        };
      }

      let recommendations: any[] = [];
      let usedMethod = method;
      let userProfile: any = null;
      let experimentInfo: any = null;

      // 2. 이미지 기반 추천 (이미지가 제공된 경우)
      if (image_buffer) {
        const imageAnalysis = await this.aiAnalysisService.analyzeImage(image_buffer);
        
        if (user_id) {
          // 사용자의 이미지 업로드 상호작용 기록
          await this.personalizationEngine.recordUserInteraction(
            user_id,
            'uploaded_image',
            'view',
            {
              id: 'uploaded_image',
              keywords: imageAnalysis.keywords,
              style: imageAnalysis.style,
              mood: imageAnalysis.mood,
              colors: imageAnalysis.colors,
              embeddings: imageAnalysis.embeddings
            }
          );
        }

        // 이미지와 유사한 작품 찾기
        recommendations = await this.findSimilarArtworks(imageAnalysis, availableArtworks, limit);
        usedMethod = 'image_similarity';
      }
      // 3. 사용자 기반 개인화 추천
      else if (user_id) {
        if (method === 'experiment') {
          // A/B 테스트 실험 그룹
          const experiment = await this.personalizationEngine.getRecommendationExperiment(
            user_id,
            availableArtworks
          );
          recommendations = experiment.recommendations;
          usedMethod = experiment.experiment;
          experimentInfo = {
            group: experiment.experiment,
            session_id: this.generateSessionId()
          };
        } else {
          // 일반 개인화 추천
          const personalizedRecs = await this.personalizationEngine.generatePersonalizedRecommendations(
            user_id,
            availableArtworks,
            limit
          );

          switch (method) {
            case 'content':
              recommendations = personalizedRecs.contentBased;
              break;
            case 'collaborative':
              recommendations = personalizedRecs.collaborative.map(rec => ({
                artwork: availableArtworks.find(a => a.id === rec.artworkId),
                score: rec.score,
                reason: rec.reason,
                confidence: rec.confidenceLevel
              })).filter(rec => rec.artwork);
              break;
            case 'hybrid':
            default:
              recommendations = personalizedRecs.hybrid;
              break;
          }
        }

        // 사용자 프로필 정보 포함 (디버깅/분석용)
        if (include_reasoning) {
          userProfile = await this.getUserProfileSummary(user_id);
        }

      }
      // 4. 일반 추천 (사용자 정보 없음)
      else {
        recommendations = await this.getPopularRecommendations(availableArtworks, limit);
        usedMethod = 'popular';
      }

      // 5. 성능 지표 포함 (사용자가 있는 경우)
      let performanceMetrics: any = null;
      if (user_id && include_reasoning) {
        performanceMetrics = await this.personalizationEngine.analyzeRecommendationPerformance(user_id);
      }

      return {
        success: true,
        data: {
          method: usedMethod,
          recommendations: recommendations.slice(0, limit),
          user_profile: userProfile,
          performance_metrics: performanceMetrics,
          experiment_info: experimentInfo
        }
      };

    } catch (error) {
      console.error('Failed to generate personalized recommendations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // 사용자 상호작용 기록 API
  async recordInteraction(
    userId: string,
    artworkId: string,
    interactionType: 'view' | 'click' | 'purchase_request' | 'favorite'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 작품 정보 가져오기
      const { data: artwork } = await this.supabase.getClient()
        .from('artworks')
        .select('*')
        .eq('id', artworkId)
        .single();

      if (!artwork) {
        return { success: false, error: 'Artwork not found' };
      }

      // AI 분석 데이터 가져오기 (캐시된 데이터 사용)
      const { data: analysisData } = await this.supabase.getClient()
        .from('image_analyses')
        .select('*')
        .eq('artwork_id', artworkId)
        .single();

      const artworkFeatures = {
        id: artworkId,
        keywords: analysisData?.keywords || artwork.keywords || [],
        style: analysisData?.style || 'unknown',
        mood: analysisData?.mood || 'neutral',
        colors: analysisData?.colors || [],
        embeddings: analysisData?.embeddings || [],
        brightness: analysisData?.metadata?.brightness,
        saturation: analysisData?.metadata?.saturation,
        contrast: analysisData?.metadata?.contrast
      };

      await this.personalizationEngine.recordUserInteraction(
        userId,
        artworkId,
        interactionType,
        artworkFeatures
      );

      return { success: true };

    } catch (error) {
      console.error('Failed to record user interaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record interaction'
      };
    }
  }

  // 실시간 추천 업데이트 (WebSocket용)
  async getRealtimeRecommendationUpdates(
    userId: string,
    currentRecommendations: string[]
  ): Promise<{
    updated: boolean;
    new_recommendations?: Array<{
      artwork: ArtworkWithFeatures;
      score: number;
      reason: string;
      is_new: boolean;
    }>;
    reason?: string;
  }> {
    try {
      // 사용자의 최근 상호작용 확인
      const { data: recentInteractions } = await this.supabase.getClient()
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // 최근 5분
        .order('created_at', { ascending: false });

      if (!recentInteractions || recentInteractions.length === 0) {
        return { updated: false };
      }

      // 새로운 추천 생성
      const availableArtworks = await this.getEnhancedArtworks();
      const newRecs = await this.personalizationEngine.generatePersonalizedRecommendations(
        userId,
        availableArtworks,
        10
      );

      // 현재 추천과 비교
      const newRecommendationIds = new Set(newRecs.hybrid.map(r => r.artwork.id));
      const currentSet = new Set(currentRecommendations);
      
      const hasNewItems = [...newRecommendationIds].some(id => !currentSet.has(id));
      
      if (hasNewItems) {
        const recommendations = newRecs.hybrid.map(rec => ({
          artwork: rec.artwork,
          score: rec.score,
          reason: rec.reason,
          is_new: !currentSet.has(rec.artwork.id)
        }));

        return {
          updated: true,
          new_recommendations: recommendations,
          reason: `새로운 상호작용 ${recentInteractions.length}개를 반영한 업데이트`
        };
      }

      return { updated: false };

    } catch (error) {
      console.error('Failed to get realtime updates:', error);
      return { updated: false };
    }
  }

  // 추천 성능 분석 API
  async getRecommendationAnalytics(userId: string, period: number = 30): Promise<{
    success: boolean;
    data?: {
      performance: any;
      user_insights: {
        top_styles: Array<{ style: string; score: number }>;
        top_moods: Array<{ mood: string; score: number }>;
        top_colors: Array<{ color: string; score: number }>;
        interaction_patterns: any;
      };
      system_insights: {
        recommendation_accuracy: number;
        user_satisfaction: number;
        conversion_rate: number;
        popular_combinations: any[];
      };
    };
    error?: string;
  }> {
    try {
      // 개인 성능 지표
      const performance = await this.personalizationEngine.analyzeRecommendationPerformance(userId, period);

      // 사용자 인사이트
      const { data: userInteractions } = await this.supabase.getClient()
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString());

      const userInsights = this.analyzeUserInsights(userInteractions || []);

      // 시스템 인사이트
      const systemInsights = await this.analyzeSystemInsights(period);

      return {
        success: true,
        data: {
          performance,
          user_insights: userInsights,
          system_insights: systemInsights
        }
      };

    } catch (error) {
      console.error('Failed to get recommendation analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get analytics'
      };
    }
  }

  // 유틸리티 메서드들
  private async getEnhancedArtworks(): Promise<ArtworkWithFeatures[]> {
    const { data: artworks } = await this.supabase.getClient()
      .from('artworks')
      .select(`
        *,
        image_analyses(
          keywords,
          style,
          mood,
          colors,
          embeddings,
          metadata
        )
      `)
      .eq('is_active', true);

    if (!artworks) return [];

    return artworks.map(artwork => ({
      id: artwork.id,
      title: artwork.title,
      artist: artwork.artist,
      image_url: artwork.image_url,
      price: artwork.price || 0,
      keywords: artwork.image_analyses?.[0]?.keywords || artwork.keywords || [],
      style: artwork.image_analyses?.[0]?.style || 'unknown',
      mood: artwork.image_analyses?.[0]?.mood || 'neutral',
      colors: artwork.image_analyses?.[0]?.colors || [],
      embeddings: artwork.image_analyses?.[0]?.embeddings || [],
      metadata: artwork.image_analyses?.[0]?.metadata || {}
    }));
  }

  private async findSimilarArtworks(
    imageAnalysis: any,
    availableArtworks: ArtworkWithFeatures[],
    limit: number
  ): Promise<Array<{ artwork: ArtworkWithFeatures; score: number; reason: string }>> {
    const similarities = availableArtworks.map(artwork => {
      let score = 0;
      const reasons: string[] = [];

      // 키워드 유사도 (40%)
      const keywordSimilarity = this.calculateKeywordSimilarity(imageAnalysis.keywords, artwork.keywords);
      score += keywordSimilarity * 0.4;
      if (keywordSimilarity > 0.3) reasons.push('유사한 키워드');

      // 스타일 매칭 (25%)
      if (imageAnalysis.style === artwork.style) {
        score += 0.25;
        reasons.push(`동일한 ${artwork.style} 스타일`);
      }

      // 분위기 매칭 (20%)
      if (imageAnalysis.mood === artwork.mood) {
        score += 0.2;
        reasons.push(`동일한 ${artwork.mood} 분위기`);
      }

      // 색상 유사도 (15%)
      const colorSimilarity = this.calculateColorSimilarity(imageAnalysis.colors, artwork.colors);
      score += colorSimilarity * 0.15;
      if (colorSimilarity > 0.3) reasons.push('유사한 색상');

      return {
        artwork,
        score,
        reason: reasons.length > 0 ? reasons.join(', ') : '기본 유사도',
        similarity: score
      };
    });

    return similarities
      .filter(sim => sim.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async getPopularRecommendations(
    availableArtworks: ArtworkWithFeatures[],
    limit: number
  ): Promise<Array<{ artwork: ArtworkWithFeatures; score: number; reason: string }>> {
    // 최근 30일간의 상호작용 데이터를 기반으로 인기 작품 선정
    const { data: popularityData } = await this.supabase.getClient()
      .from('user_interactions')
      .select('artwork_id, interaction_type, rating')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const artworkScores = new Map<string, { score: number; interactions: number }>();

    if (popularityData) {
      popularityData.forEach(interaction => {
        const current = artworkScores.get(interaction.artwork_id) || { score: 0, interactions: 0 };
        const weight = this.getInteractionWeight(interaction.interaction_type);
        current.score += interaction.rating * weight;
        current.interactions++;
        artworkScores.set(interaction.artwork_id, current);
      });
    }

    const recommendations = availableArtworks
      .map(artwork => {
        const data = artworkScores.get(artwork.id) || { score: 0, interactions: 0 };
        return {
          artwork,
          score: data.interactions > 0 ? data.score / data.interactions : Math.random() * 0.5,
          reason: data.interactions > 0 ? 
            `${data.interactions}명이 관심을 보인 인기 작품` : 
            '새로운 추천 작품'
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return recommendations;
  }

  private calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
    if (!keywords1.length || !keywords2.length) return 0;
    
    const set1 = new Set(keywords1.map(k => k.toLowerCase()));
    const set2 = new Set(keywords2.map(k => k.toLowerCase()));
    
    const intersection = new Set([...set1].filter(k => set2.has(k)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  private calculateColorSimilarity(colors1: string[], colors2: string[]): number {
    if (!colors1.length || !colors2.length) return 0;
    
    const set1 = new Set(colors1);
    const set2 = new Set(colors2);
    
    const intersection = new Set([...set1].filter(c => set2.has(c)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private getInteractionWeight(interactionType: string): number {
    const weights = {
      'view': 1,
      'click': 2,
      'favorite': 4,
      'purchase_request': 5
    };
    return weights[interactionType] || 1;
  }

  private async getUserProfileSummary(userId: string): Promise<any> {
    const { data: profile } = await this.supabase.getClient()
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: recentInteractions } = await this.supabase.getClient()
      .from('user_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return {
      profile: profile || null,
      recent_interactions: recentInteractions || [],
      interaction_count: recentInteractions?.length || 0
    };
  }

  private analyzeUserInsights(interactions: any[]): any {
    const styleCount = new Map<string, number>();
    const moodCount = new Map<string, number>();
    const colorCount = new Map<string, number>();

    interactions.forEach(interaction => {
      styleCount.set(interaction.style, (styleCount.get(interaction.style) || 0) + 1);
      moodCount.set(interaction.mood, (moodCount.get(interaction.mood) || 0) + 1);
      
      if (interaction.colors) {
        interaction.colors.forEach(color => {
          colorCount.set(color, (colorCount.get(color) || 0) + 1);
        });
      }
    });

    return {
      top_styles: Array.from(styleCount.entries())
        .map(([style, count]) => ({ style, score: count / interactions.length }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
      
      top_moods: Array.from(moodCount.entries())
        .map(([mood, count]) => ({ mood, score: count / interactions.length }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
      
      top_colors: Array.from(colorCount.entries())
        .map(([color, count]) => ({ color, score: count / interactions.length }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10),
      
      interaction_patterns: {
        total_interactions: interactions.length,
        avg_rating: interactions.reduce((sum, i) => sum + i.rating, 0) / interactions.length,
        most_active_day: this.getMostActiveDay(interactions)
      }
    };
  }

  private async analyzeSystemInsights(period: number): Promise<any> {
    // 시스템 전체 성능 지표 분석
    const { data: systemStats } = await this.supabase.getClient()
      .from('user_interactions')
      .select('*')
      .gte('created_at', new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString());

    if (!systemStats) {
      return {
        recommendation_accuracy: 0,
        user_satisfaction: 0,
        conversion_rate: 0,
        popular_combinations: []
      };
    }

    const totalInteractions = systemStats.length;
    const clicksAndAbove = systemStats.filter(s => ['click', 'favorite', 'purchase_request'].includes(s.interaction_type)).length;
    const purchases = systemStats.filter(s => s.interaction_type === 'purchase_request').length;
    const avgRating = systemStats.reduce((sum, s) => sum + s.rating, 0) / totalInteractions;

    return {
      recommendation_accuracy: clicksAndAbove / totalInteractions,
      user_satisfaction: avgRating / 5,
      conversion_rate: purchases / totalInteractions,
      popular_combinations: this.getPopularCombinations(systemStats)
    };
  }

  private getMostActiveDay(interactions: any[]): string {
    const dayCount = new Map<string, number>();
    
    interactions.forEach(interaction => {
      const day = new Date(interaction.created_at).toLocaleDateString('ko-KR', { weekday: 'long' });
      dayCount.set(day, (dayCount.get(day) || 0) + 1);
    });

    return Array.from(dayCount.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '데이터 없음';
  }

  private getPopularCombinations(interactions: any[]): Array<{ combination: string; count: number }> {
    const combCount = new Map<string, number>();
    
    interactions.forEach(interaction => {
      const combination = `${interaction.style}+${interaction.mood}`;
      combCount.set(combination, (combCount.get(combination) || 0) + 1);
    });

    return Array.from(combCount.entries())
      .map(([combination, count]) => ({ combination, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}