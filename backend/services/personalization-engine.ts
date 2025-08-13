import { logger } from '../../shared/logger';
import { SupabaseService } from './supabase';

interface UserPreference {
  userId: string;
  style: string;
  mood: string;
  color: string;
  rating: number; // 1-5 점수
  interactionType: 'view' | 'click' | 'purchase_request' | 'favorite';
  timestamp: Date;
}

interface ArtworkFeatures {
  id: string;
  keywords: string[];
  style: string;
  mood: string;
  colors: string[];
  embeddings: number[];
  colorHarmony?: string;
  temperature?: string;
  brightness?: number;
  saturation?: number;
  contrast?: number;
}

interface UserProfile {
  userId: string;
  preferredStyles: { [style: string]: number };
  preferredMoods: { [mood: string]: number };
  preferredColors: { [color: string]: number };
  colorPreferences: {
    temperature: 'warm' | 'cool' | 'neutral';
    brightness: number; // 0-100
    saturation: number; // 0-100
    contrast: number; // 0-100
  };
  totalInteractions: number;
  lastUpdated: Date;
}

interface CollaborativeRecommendation {
  artworkId: string;
  score: number;
  reason: string;
  similarUsers: string[];
  confidenceLevel: number;
}

export class PersonalizationEngine {
  private supabase: SupabaseService;
  private userProfiles: Map<string, UserProfile> = new Map();
  private artworkFeatures: Map<string, ArtworkFeatures> = new Map();

  constructor() {
    this.supabase = new SupabaseService();
  }

  // 사용자 상호작용 기록
  async recordUserInteraction(
    userId: string,
    artworkId: string,
    interactionType: 'view' | 'click' | 'purchase_request' | 'favorite',
    artworkFeatures: ArtworkFeatures
  ): Promise<void> {
    try {
      // 작품 특성 저장
      this.artworkFeatures.set(artworkId, artworkFeatures);

      // 상호작용 가중치 계산
      const interactionWeight = this.getInteractionWeight(interactionType);
      
      // 사용자 프로필 업데이트
      await this.updateUserProfile(userId, artworkFeatures, interactionWeight);

      // DB에 상호작용 기록
      await this.supabase.getClient()
        .from('user_interactions')
        .upsert({
          user_id: userId,
          artwork_id: artworkId,
          interaction_type: interactionType,
          style: artworkFeatures.style,
          mood: artworkFeatures.mood,
          colors: artworkFeatures.colors,
          rating: interactionWeight,
          created_at: new Date().toISOString()
        });

      logger.info(`📊 Recorded ${interactionType} interaction for user ${userId}`);
    } catch (error) {
      logger.error('Failed to record user interaction:', error);
    }
  }

  // 개인화된 추천 생성 (콘텐츠 기반 + 협업 필터링)
  async generatePersonalizedRecommendations(
    userId: string,
    availableArtworks: ArtworkFeatures[],
    limit: number = 10
  ): Promise<{
    contentBased: Array<{ artwork: ArtworkFeatures; score: number; reason: string }>;
    collaborative: CollaborativeRecommendation[];
    hybrid: Array<{ artwork: ArtworkFeatures; score: number; reason: string; method: string }>;
  }> {
    try {
      // 사용자 프로필 로드
      const userProfile = await this.getUserProfile(userId);
      
      // 1. 콘텐츠 기반 추천
      const contentBasedRecs = await this.generateContentBasedRecommendations(
        userProfile, 
        availableArtworks, 
        limit
      );

      // 2. 협업 필터링 추천
      const collaborativeRecs = await this.generateCollaborativeRecommendations(
        userId, 
        availableArtworks, 
        limit
      );

      // 3. 하이브리드 추천 (콘텐츠 + 협업 필터링)
      const hybridRecs = this.combineRecommendations(
        contentBasedRecs, 
        collaborativeRecs, 
        availableArtworks
      );

      return {
        contentBased: contentBasedRecs,
        collaborative: collaborativeRecs,
        hybrid: hybridRecs
      };

    } catch (error) {
      logger.error('Failed to generate personalized recommendations:', error);
      return {
        contentBased: [],
        collaborative: [],
        hybrid: []
      };
    }
  }

  // 콘텐츠 기반 추천 (개선된 버전)
  private async generateContentBasedRecommendations(
    userProfile: UserProfile,
    availableArtworks: ArtworkFeatures[],
    limit: number
  ): Promise<Array<{ artwork: ArtworkFeatures; score: number; reason: string }>> {
    const recommendations: Array<{ artwork: ArtworkFeatures; score: number; reason: string }> = [];

    for (const artwork of availableArtworks) {
      let score = 0;
      const reasons: string[] = [];

      // 1. 스타일 선호도 (30%)
      const styleScore = userProfile.preferredStyles[artwork.style] || 0;
      score += styleScore * 0.3;
      if (styleScore > 0.5) {
        reasons.push(`선호하는 ${artwork.style} 스타일`);
      }

      // 2. 분위기 선호도 (25%)
      const moodScore = userProfile.preferredMoods[artwork.mood] || 0;
      score += moodScore * 0.25;
      if (moodScore > 0.5) {
        reasons.push(`선호하는 ${artwork.mood} 분위기`);
      }

      // 3. 색상 선호도 (20%)
      let colorScore = 0;
      for (const color of artwork.colors) {
        colorScore += userProfile.preferredColors[color] || 0;
      }
      colorScore = Math.min(colorScore / artwork.colors.length, 1.0);
      score += colorScore * 0.2;
      if (colorScore > 0.5) {
        reasons.push('선호하는 색상 조합');
      }

      // 4. 고급 색상 특성 매칭 (15%)
      const colorPropsScore = this.calculateColorPropertiesScore(
        userProfile.colorPreferences,
        artwork
      );
      score += colorPropsScore * 0.15;
      if (colorPropsScore > 0.7) {
        reasons.push('색상 특성이 취향과 일치');
      }

      // 5. 임베딩 유사도 (10%)
      if (artwork.embeddings.length > 0) {
        const embeddingScore = this.calculateEmbeddingSimilarity(
          this.getUserEmbedding(userProfile),
          artwork.embeddings
        );
        score += embeddingScore * 0.1;
        if (embeddingScore > 0.8) {
          reasons.push('전체적인 스타일이 취향과 유사');
        }
      }

      if (score > 0.1) { // 최소 임계값
        recommendations.push({
          artwork,
          score,
          reason: reasons.length > 0 ? reasons.join(', ') : '기본 추천'
        });
      }
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // 협업 필터링 추천
  private async generateCollaborativeRecommendations(
    userId: string,
    availableArtworks: ArtworkFeatures[],
    limit: number
  ): Promise<CollaborativeRecommendation[]> {
    try {
      // 유사한 사용자 찾기
      const similarUsers = await this.findSimilarUsers(userId, 10);
      
      if (similarUsers.length === 0) {
        return [];
      }

      // 유사한 사용자들이 좋아한 작품들 분석
      const { data: interactions } = await this.supabase.getClient()
        .from('user_interactions')
        .select('artwork_id, interaction_type, rating, user_id')
        .in('user_id', similarUsers.map(u => u.userId))
        .gte('rating', 3); // 긍정적 상호작용만

      if (!interactions) return [];

      // 작품별 점수 계산
      const artworkScores: Map<string, { 
        score: number; 
        users: string[]; 
        interactions: number 
      }> = new Map();

      interactions.forEach(interaction => {
        const current = artworkScores.get(interaction.artwork_id) || { 
          score: 0, 
          users: [], 
          interactions: 0 
        };
        
        // 유사도 기반 가중치 적용
        const userSimilarity = similarUsers.find(u => u.userId === interaction.user_id)?.similarity || 0;
        const weightedScore = interaction.rating * userSimilarity;
        
        current.score += weightedScore;
        current.users.push(interaction.user_id);
        current.interactions++;
        
        artworkScores.set(interaction.artwork_id, current);
      });

      // 추천 생성
      const recommendations: CollaborativeRecommendation[] = [];
      
      for (const [artworkId, data] of artworkScores.entries()) {
        const artwork = availableArtworks.find(a => a.id === artworkId);
        if (artwork && data.interactions >= 2) { // 최소 2명의 유사 사용자가 상호작용
          recommendations.push({
            artworkId,
            score: data.score / data.interactions, // 평균 점수
            reason: `${data.interactions}명의 비슷한 취향 사용자가 선호`,
            similarUsers: [...new Set(data.users)],
            confidenceLevel: Math.min(data.interactions / 5, 1.0) // 상호작용 많을수록 신뢰도 높음
          });
        }
      }

      return recommendations
        .sort((a, b) => b.score * b.confidenceLevel - a.score * a.confidenceLevel)
        .slice(0, limit);

    } catch (error) {
      logger.error('Failed to generate collaborative recommendations:', error);
      return [];
    }
  }

  // 유사한 사용자 찾기 (개선된 알고리즘)
  private async findSimilarUsers(
    userId: string, 
    limit: number
  ): Promise<Array<{ userId: string; similarity: number }>> {
    try {
      // 현재 사용자의 상호작용 가져오기
      const { data: userInteractions } = await this.supabase.getClient()
        .from('user_interactions')
        .select('artwork_id, style, mood, colors, rating')
        .eq('user_id', userId);

      if (!userInteractions || userInteractions.length < 3) {
        return []; // 충분한 데이터가 없으면 협업 필터링 불가
      }

      // 다른 사용자들의 상호작용 가져오기
      const { data: allInteractions } = await this.supabase.getClient()
        .from('user_interactions')
        .select('user_id, artwork_id, style, mood, colors, rating')
        .neq('user_id', userId);

      if (!allInteractions) return [];

      // 사용자별로 그룹화
      const userGroups: Map<string, any[]> = new Map();
      allInteractions.forEach(interaction => {
        const interactions = userGroups.get(interaction.user_id) || [];
        interactions.push(interaction);
        userGroups.set(interaction.user_id, interactions);
      });

      // 코사인 유사도 계산
      const similarities: Array<{ userId: string; similarity: number }> = [];
      
      for (const [otherUserId, otherInteractions] of userGroups.entries()) {
        if (otherInteractions.length < 3) continue; // 최소 3개 상호작용 필요
        
        const similarity = this.calculateUserSimilarity(userInteractions, otherInteractions);
        if (similarity > 0.1) { // 최소 유사도 임계값
          similarities.push({ userId: otherUserId, similarity });
        }
      }

      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    } catch (error) {
      logger.error('Failed to find similar users:', error);
      return [];
    }
  }

  // 사용자 간 유사도 계산 (코사인 유사도)
  private calculateUserSimilarity(user1Interactions: any[], user2Interactions: any[]): number {
    // 공통 작품 찾기
    const user1Artworks = new Set(user1Interactions.map(i => i.artwork_id));
    const user2Artworks = new Set(user2Interactions.map(i => i.artwork_id));
    const commonArtworks = [...user1Artworks].filter(id => user2Artworks.has(id));

    if (commonArtworks.length === 0) {
      return 0; // 공통 작품이 없으면 유사도 0
    }

    // 공통 작품에 대한 평점 벡터 생성
    const user1Ratings = commonArtworks.map(artworkId => {
      const interaction = user1Interactions.find(i => i.artwork_id === artworkId);
      return interaction?.rating || 0;
    });

    const user2Ratings = commonArtworks.map(artworkId => {
      const interaction = user2Interactions.find(i => i.artwork_id === artworkId);
      return interaction?.rating || 0;
    });

    // 코사인 유사도 계산
    return this.cosineSimilarity(user1Ratings, user2Ratings);
  }

  // 하이브리드 추천 (콘텐츠 기반 + 협업 필터링)
  private combineRecommendations(
    contentBased: Array<{ artwork: ArtworkFeatures; score: number; reason: string }>,
    collaborative: CollaborativeRecommendation[],
    availableArtworks: ArtworkFeatures[]
  ): Array<{ artwork: ArtworkFeatures; score: number; reason: string; method: string }> {
    const hybridMap = new Map<string, { 
      artwork: ArtworkFeatures; 
      contentScore: number; 
      collabScore: number; 
      contentReason: string;
      collabReason: string;
    }>();

    // 콘텐츠 기반 추천 추가
    contentBased.forEach(rec => {
      hybridMap.set(rec.artwork.id, {
        artwork: rec.artwork,
        contentScore: rec.score,
        collabScore: 0,
        contentReason: rec.reason,
        collabReason: ''
      });
    });

    // 협업 필터링 추천 추가
    collaborative.forEach(rec => {
      const artwork = availableArtworks.find(a => a.id === rec.artworkId);
      if (artwork) {
        const existing = hybridMap.get(rec.artworkId);
        if (existing) {
          existing.collabScore = rec.score * rec.confidenceLevel;
          existing.collabReason = rec.reason;
        } else {
          hybridMap.set(rec.artworkId, {
            artwork,
            contentScore: 0,
            collabScore: rec.score * rec.confidenceLevel,
            contentReason: '',
            collabReason: rec.reason
          });
        }
      }
    });

    // 하이브리드 점수 계산 및 정렬
    return Array.from(hybridMap.values())
      .map(item => {
        // 하이브리드 점수: 콘텐츠 기반 70%, 협업 필터링 30%
        const hybridScore = (item.contentScore * 0.7) + (item.collabScore * 0.3);
        
        let method = '';
        let reason = '';
        
        if (item.contentScore > 0 && item.collabScore > 0) {
          method = 'hybrid';
          reason = [item.contentReason, item.collabReason].filter(r => r).join(' + ');
        } else if (item.contentScore > 0) {
          method = 'content';
          reason = item.contentReason;
        } else {
          method = 'collaborative';
          reason = item.collabReason;
        }

        return {
          artwork: item.artwork,
          score: hybridScore,
          reason,
          method
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  // 유틸리티 메서드들
  private getInteractionWeight(interactionType: string): number {
    const weights = {
      'view': 1,
      'click': 2,
      'favorite': 4,
      'purchase_request': 5
    };
    return weights[interactionType] || 1;
  }

  private async updateUserProfile(
    userId: string, 
    artworkFeatures: ArtworkFeatures, 
    weight: number
  ): Promise<void> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        preferredStyles: {},
        preferredMoods: {},
        preferredColors: {},
        colorPreferences: {
          temperature: 'neutral',
          brightness: 50,
          saturation: 50,
          contrast: 50
        },
        totalInteractions: 0,
        lastUpdated: new Date()
      };
    }

    // 스타일 선호도 업데이트
    profile.preferredStyles[artworkFeatures.style] = 
      (profile.preferredStyles[artworkFeatures.style] || 0) + weight * 0.1;

    // 분위기 선호도 업데이트
    profile.preferredMoods[artworkFeatures.mood] = 
      (profile.preferredMoods[artworkFeatures.mood] || 0) + weight * 0.1;

    // 색상 선호도 업데이트
    artworkFeatures.colors.forEach(color => {
      profile.preferredColors[color] = 
        (profile.preferredColors[color] || 0) + weight * 0.05;
    });

    // 색상 특성 선호도 업데이트
    if (artworkFeatures.brightness !== undefined) {
      profile.colorPreferences.brightness = 
        (profile.colorPreferences.brightness + artworkFeatures.brightness) / 2;
    }
    if (artworkFeatures.saturation !== undefined) {
      profile.colorPreferences.saturation = 
        (profile.colorPreferences.saturation + artworkFeatures.saturation) / 2;
    }
    if (artworkFeatures.contrast !== undefined) {
      profile.colorPreferences.contrast = 
        (profile.colorPreferences.contrast + artworkFeatures.contrast) / 2;
    }

    profile.totalInteractions++;
    profile.lastUpdated = new Date();

    this.userProfiles.set(userId, profile);

    // 정규화 (최대값 제한)
    this.normalizeProfile(profile);
  }

  private normalizeProfile(profile: UserProfile): void {
    // 선호도 점수를 0-1 범위로 정규화
    const maxStyle = Math.max(...Object.values(profile.preferredStyles));
    if (maxStyle > 1) {
      Object.keys(profile.preferredStyles).forEach(key => {
        profile.preferredStyles[key] /= maxStyle;
      });
    }

    const maxMood = Math.max(...Object.values(profile.preferredMoods));
    if (maxMood > 1) {
      Object.keys(profile.preferredMoods).forEach(key => {
        profile.preferredMoods[key] /= maxMood;
      });
    }

    const maxColor = Math.max(...Object.values(profile.preferredColors));
    if (maxColor > 1) {
      Object.keys(profile.preferredColors).forEach(key => {
        profile.preferredColors[key] /= maxColor;
      });
    }
  }

  private calculateColorPropertiesScore(
    userPrefs: UserProfile['colorPreferences'],
    artwork: ArtworkFeatures
  ): number {
    let score = 0;
    let factors = 0;

    if (artwork.brightness !== undefined) {
      score += 1 - Math.abs(userPrefs.brightness - artwork.brightness) / 100;
      factors++;
    }
    if (artwork.saturation !== undefined) {
      score += 1 - Math.abs(userPrefs.saturation - artwork.saturation) / 100;
      factors++;
    }
    if (artwork.contrast !== undefined) {
      score += 1 - Math.abs(userPrefs.contrast - artwork.contrast) / 100;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  private getUserEmbedding(profile: UserProfile): number[] {
    // 사용자 선호도를 기반으로 임베딩 생성 (간단한 구현)
    const embedding = new Array(512).fill(0);
    
    // 스타일 선호도 반영
    Object.entries(profile.preferredStyles).forEach(([style, score], index) => {
      if (index < 100) {
        embedding[index] = score;
      }
    });

    // 색상 선호도 반영
    Object.entries(profile.preferredColors).forEach(([color, score], index) => {
      if (index < 100) {
        embedding[100 + index] = score;
      }
    });

    return embedding;
  }

  private calculateEmbeddingSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) return 0;
    return this.cosineSimilarity(embedding1, embedding2);
  }

  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async getUserProfile(userId: string): Promise<UserProfile> {
    // 메모리에서 먼저 확인
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId)!;
    }

    // DB에서 사용자 상호작용 이력 로드
    const { data: interactions } = await this.supabase.getClient()
      .from('user_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100); // 최근 100개 상호작용

    const profile: UserProfile = {
      userId,
      preferredStyles: {},
      preferredMoods: {},
      preferredColors: {},
      colorPreferences: {
        temperature: 'neutral',
        brightness: 50,
        saturation: 50,
        contrast: 50
      },
      totalInteractions: 0,
      lastUpdated: new Date()
    };

    if (interactions) {
      // 상호작용 이력을 기반으로 프로필 구성
      interactions.forEach(interaction => {
        const weight = this.getInteractionWeight(interaction.interaction_type);
        
        profile.preferredStyles[interaction.style] = 
          (profile.preferredStyles[interaction.style] || 0) + weight * 0.1;
        
        profile.preferredMoods[interaction.mood] = 
          (profile.preferredMoods[interaction.mood] || 0) + weight * 0.1;

        if (interaction.colors) {
          interaction.colors.forEach(color => {
            profile.preferredColors[color] = 
              (profile.preferredColors[color] || 0) + weight * 0.05;
          });
        }
        
        profile.totalInteractions++;
      });

      this.normalizeProfile(profile);
    }

    this.userProfiles.set(userId, profile);
    return profile;
  }

  // 실시간 A/B 테스트를 위한 추천 실험
  async getRecommendationExperiment(
    userId: string,
    availableArtworks: ArtworkFeatures[]
  ): Promise<{
    experiment: 'content_only' | 'collaborative_only' | 'hybrid';
    recommendations: Array<{ artwork: ArtworkFeatures; score: number; reason: string }>;
  }> {
    // 사용자 ID 기반으로 실험 그룹 결정
    const experimentGroup = this.getUserExperimentGroup(userId);
    const userProfile = await this.getUserProfile(userId);

    let recommendations: Array<{ artwork: ArtworkFeatures; score: number; reason: string }> = [];

    switch (experimentGroup) {
      case 'content_only':
        recommendations = await this.generateContentBasedRecommendations(userProfile, availableArtworks, 10);
        break;
      case 'collaborative_only':
        const collabRecs = await this.generateCollaborativeRecommendations(userId, availableArtworks, 10);
        recommendations = collabRecs.map(rec => ({
          artwork: availableArtworks.find(a => a.id === rec.artworkId)!,
          score: rec.score,
          reason: rec.reason
        })).filter(rec => rec.artwork);
        break;
      case 'hybrid':
        const allRecs = await this.generatePersonalizedRecommendations(userId, availableArtworks, 10);
        recommendations = allRecs.hybrid;
        break;
    }

    return {
      experiment: experimentGroup,
      recommendations
    };
  }

  private getUserExperimentGroup(userId: string): 'content_only' | 'collaborative_only' | 'hybrid' {
    // 사용자 ID의 해시값을 이용해 일관된 실험 그룹 할당
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const group = hash % 3;
    
    switch (group) {
      case 0: return 'content_only';
      case 1: return 'collaborative_only';
      default: return 'hybrid';
    }
  }

  // 추천 성능 분석
  async analyzeRecommendationPerformance(userId: string, period: number = 30): Promise<{
    totalRecommendations: number;
    clickThroughRate: number;
    conversionRate: number;
    averageRating: number;
    topPerformingMethods: string[];
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      const { data: interactions } = await this.supabase.getClient()
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (!interactions || interactions.length === 0) {
        return {
          totalRecommendations: 0,
          clickThroughRate: 0,
          conversionRate: 0,
          averageRating: 0,
          topPerformingMethods: []
        };
      }

      const totalRecs = interactions.length;
      const clicks = interactions.filter(i => i.interaction_type === 'click').length;
      const purchases = interactions.filter(i => i.interaction_type === 'purchase_request').length;
      const avgRating = interactions.reduce((sum, i) => sum + i.rating, 0) / totalRecs;

      return {
        totalRecommendations: totalRecs,
        clickThroughRate: clicks / totalRecs,
        conversionRate: purchases / totalRecs,
        averageRating: avgRating,
        topPerformingMethods: ['hybrid', 'content', 'collaborative'] // 실제로는 성능 분석 결과
      };

    } catch (error) {
      logger.error('Failed to analyze recommendation performance:', error);
      return {
        totalRecommendations: 0,
        clickThroughRate: 0,
        conversionRate: 0,
        averageRating: 0,
        topPerformingMethods: []
      };
    }
  }
}