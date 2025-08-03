import { AIEnsembleService } from '../../ai-service/utils/ensemble';
import { AIPerformanceOptimizer } from '../../ai-service/utils/performance-optimizer';
import type { ImageAnalysis, Recommendation } from '../../shared/types';
import { supabase } from './supabase';
import { MetMuseumAPI } from './met-museum-api';

export class AIAnalysisService {
  private aiEnsemble: AIEnsembleService;
  private performanceOptimizer: AIPerformanceOptimizer;
  private metMuseumAPI: MetMuseumAPI;

  constructor() {
    console.log('🚀 Initializing AI Analysis Service...');
    this.aiEnsemble = new AIEnsembleService();
    console.log('✅ AI Ensemble Service initialized');
    this.performanceOptimizer = new AIPerformanceOptimizer(this.aiEnsemble, {
      caching: {
        enabled: true,
        maxCacheSize: 500,
        defaultTtl: 1800000, // 30 minutes
        preloadPopularQueries: true
      },
      parallelProcessing: {
        enabled: true,
        maxConcurrentRequests: 8,
        timeoutMs: 25000
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3,
        recoveryTimeout: 30000,
        halfOpenMaxCalls: 2
      }
    });
    this.metMuseumAPI = new MetMuseumAPI();
  }

  async analyzeImageAndRecommend(
    imageBuffer: Buffer, 
    userId?: string,
    tasteGroupId?: string,
    limit: number = 10
  ): Promise<{
    analysis: ImageAnalysis;
    recommendations: Recommendation[];
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      // 1. Analyze the uploaded image with performance optimization
      console.log('🔍 Starting optimized image analysis...');
      console.log('🔧 AI Ensemble status:', this.aiEnsemble ? 'initialized' : 'not initialized');
      console.log('🔧 Performance Optimizer status:', this.performanceOptimizer ? 'initialized' : 'not initialized');
      const analysis = await this.performanceOptimizer.analyzeImage(imageBuffer);
      
      console.log(`📊 Analysis complete. Found ${analysis.keywords.length} keywords`);
      console.log(`🎯 Style: ${analysis.style}, Confidence: ${analysis.confidence}`);

      // 2. Find similar artworks using vector similarity
      let recommendations: Recommendation[] = [];
      
      if (analysis.embeddings.length > 0) {
        console.log('🔍 Searching for similar artworks...');
        recommendations = await this.findSimilarArtworks(analysis, limit);
      } else {
        console.log('🔍 Using keyword-based search fallback...');
        recommendations = await this.findSimilarByKeywords(analysis.keywords, limit);
      }

      // 3. Store user upload if userId provided
      if (userId) {
        await this.storeUserUpload(userId, analysis, tasteGroupId);
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ Analysis and recommendation complete in ${processingTime}ms`);

      return {
        analysis,
        recommendations,
        processingTime
      };

    } catch (error) {
      console.error('❌ AI Analysis failed:', error);
      const processingTime = Date.now() - startTime;
      
      // Return fallback recommendations
      const fallbackRecommendations = await this.getFallbackRecommendations(limit);
      
      return {
        analysis: {
          keywords: [],
          colors: [],
          style: 'unknown',
          confidence: 0,
          embeddings: []
        },
        recommendations: fallbackRecommendations,
        processingTime
      };
    }
  }

  private async findSimilarArtworks(
    analysis: ImageAnalysis, 
    limit: number
  ): Promise<Recommendation[]> {
    if (!supabase) {
      console.warn('Supabase not configured, using keyword fallback');
      return this.findSimilarByKeywords(analysis.keywords, limit);
    }

    try {
      // Use Supabase's vector similarity search
      const { data, error } = await supabase.rpc('vector_similarity_search', {
        query_embedding: analysis.embeddings,
        similarity_threshold: 0.5,
        match_count: limit * 2 // Get more results to filter and rank
      });

      if (error) {
        console.error('Vector search error:', error);
        return this.findSimilarByKeywords(analysis.keywords, limit);
      }

      if (!data || data.length === 0) {
        console.log('No vector matches found, falling back to keyword search');
        return this.findSimilarByKeywords(analysis.keywords, limit);
      }

      // Get artwork details for the similar items
      const artworkIds = data.map((item: any) => item.id);
      const { data: artworks, error: artworkError } = await supabase
        .from('artworks')
        .select('*')
        .in('id', artworkIds)
        .eq('available', true);

      if (artworkError || !artworks) {
        console.error('Artwork fetch error:', artworkError);
        return [];
      }

      // Create recommendations with similarity scores
      const recommendations: Recommendation[] = artworks.map(artwork => {
        const similarityData = data.find((item: any) => item.id === artwork.id);
        const similarity = similarityData?.similarity || 0;
        
        const reasons = this.generateReasons(analysis, artwork);

        return {
          artwork: {
            ...artwork,
            embeddings: undefined // Don't send embeddings to frontend
          },
          similarity,
          reasons,
          confidence: similarity * analysis.confidence
        };
      });

      // Sort by similarity and return top results
      return recommendations
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    } catch (error) {
      console.error('Similarity search failed:', error);
      return this.findSimilarByKeywords(analysis.keywords, limit);
    }
  }

  private async findSimilarByKeywords(
    keywords: string[], 
    limit: number
  ): Promise<Recommendation[]> {
    if (keywords.length === 0) {
      return this.getFallbackRecommendations(limit);
    }

    console.log(`🔍 Searching for artworks with keywords: ${keywords.join(', ')}`);

    try {
      // 1. Search Met Museum for real artworks (70% of results)
      const metResults = await this.metMuseumAPI.searchByKeywords(keywords, Math.ceil(limit * 0.7));
      console.log(`🏛️ Found ${metResults.length} Met Museum artworks`);

      // 2. Convert Met Museum results to recommendations
      const metRecommendations: Recommendation[] = metResults.map((artwork, index) => {
        const similarity = this.calculateKeywordSimilarity(keywords, artwork.keywords);
        
        const reasons = [
          `Real artwork from The Metropolitan Museum of Art`,
          `Matches your image's ${keywords.slice(0, 2).join(', ')} themes`,
          `${artwork.metadata.period || artwork.metadata.culture || 'Historical piece'}`
        ].filter(Boolean);

        return {
          artwork,
          similarity: similarity + 0.1, // Boost Met Museum results
          reasons,
          confidence: similarity * 0.95 // High confidence for real museum pieces
        };
      });

      // 3. Search local database for additional results (30% of results)
      let localRecommendations: Recommendation[] = [];
      
      if (supabase) {
        try {
          const { data: artworks, error } = await supabase
            .from('artworks')
            .select('*')
            .overlaps('keywords', keywords)
            .eq('available', true)
            .limit(Math.ceil(limit * 0.3));

          if (!error && artworks) {
            localRecommendations = artworks.map(artwork => {
              const similarity = this.calculateKeywordSimilarity(keywords, artwork.keywords);
              
              const reasons = [
                `Curated collection match`,
                `Similar artistic themes`
              ];

              return {
                artwork: {
                  ...artwork,
                  embeddings: undefined
                },
                similarity,
                reasons,
                confidence: similarity * 0.7
              };
            });
            console.log(`📚 Found ${localRecommendations.length} local artworks`);
          }
        } catch (localError) {
          console.warn('Local search failed, using Met Museum only:', localError);
        }
      }

      // 4. Combine and sort results
      const allRecommendations = [...metRecommendations, ...localRecommendations];
      
      if (allRecommendations.length === 0) {
        console.log('No matches found, using fallback recommendations');
        return this.getFallbackRecommendations(limit);
      }

      const sortedRecommendations = allRecommendations
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      console.log(`✅ Returning ${sortedRecommendations.length} total recommendations`);
      return sortedRecommendations;

    } catch (error) {
      console.error('Artwork search failed:', error);
      return this.getFallbackRecommendations(limit);
    }
  }

  private calculateKeywordSimilarity(userKeywords: string[], artworkKeywords: string[]): number {
    if (!artworkKeywords || artworkKeywords.length === 0) return 0.1;
    
    const normalizedUserKeywords = userKeywords.map(k => k.toLowerCase());
    const normalizedArtworkKeywords = artworkKeywords.map(k => k.toLowerCase());
    
    let matches = 0;
    for (const userKeyword of normalizedUserKeywords) {
      for (const artworkKeyword of normalizedArtworkKeywords) {
        if (userKeyword.includes(artworkKeyword) || artworkKeyword.includes(userKeyword)) {
          matches++;
          break; // Don't count the same user keyword multiple times
        }
      }
    }
    
    return Math.min(matches / Math.max(normalizedUserKeywords.length, normalizedArtworkKeywords.length), 1.0);
  }

  private async getFallbackRecommendations(limit: number): Promise<Recommendation[]> {
    if (!supabase) {
      // Return mock data if Supabase is not configured
      return this.getMockRecommendations(limit);
    }

    try {
      // Get random popular artworks as fallback
      const { data: artworks, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('available', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !artworks) {
        return [];
      }

      return artworks.map(artwork => ({
        artwork: {
          ...artwork,
          embeddings: undefined
        },
        similarity: 0.3,
        reasons: ['Popular artwork', 'Recently added'],
        confidence: 0.3
      }));

    } catch (error) {
      console.error('Fallback recommendations failed:', error);
      return [];
    }
  }

  private generateReasons(analysis: ImageAnalysis, artwork: any): string[] {
    const reasons = [];
    
    if (analysis.style && analysis.style !== 'unknown') {
      reasons.push(`Similar ${analysis.style} style`);
    }
    
    if (analysis.mood && analysis.mood !== 'neutral') {
      reasons.push(`Matches ${analysis.mood} mood`);
    }
    
    // Check for common keywords
    const commonKeywords = artwork.keywords.filter((kw: string) => 
      analysis.keywords.some(userKw => userKw.includes(kw) || kw.includes(userKw))
    );
    
    if (commonKeywords.length > 0) {
      reasons.push(`Shared themes: ${commonKeywords.slice(0, 2).join(', ')}`);
    }
    
    // Check for color similarity
    const commonColors = artwork.keywords.filter((kw: string) => 
      analysis.colors.some(color => kw.includes(color))
    );
    
    if (commonColors.length > 0) {
      reasons.push(`Similar color palette`);
    }

    return reasons.length > 0 ? reasons : ['Recommended for you'];
  }

  private async storeUserUpload(
    userId: string, 
    analysis: ImageAnalysis, 
    tasteGroupId?: string
  ): Promise<void> {
    if (!supabase) {
      console.warn('Cannot store user upload - Supabase not configured');
      return;
    }

    try {
      // Store the user upload for learning purposes
      const { error } = await supabase
        .from('user_uploads')
        .insert({
          user_id: userId,
          image_url: '', // We're not storing the actual image in this example
          analysis_keywords: analysis.keywords,
          analysis_embeddings: analysis.embeddings,
          taste_group_id: tasteGroupId
        });

      if (error) {
        console.error('Failed to store user upload:', error);
      }
    } catch (error) {
      console.error('Store user upload error:', error);
    }
  }

  async getServiceStatus() {
    return this.aiEnsemble.getServiceStatus();
  }

  // 성능 최적화 관련 메서드들
  getPerformanceMetrics() {
    return this.performanceOptimizer.getPerformanceMetrics();
  }

  updateOptimizationConfig(config: any) {
    this.performanceOptimizer.updateConfiguration(config);
  }

  clearPerformanceCache() {
    this.performanceOptimizer.clearCache();
  }

  preloadPopularQueries(imageBuffers: Buffer[]) {
    this.performanceOptimizer.preloadPopularQueries(imageBuffers);
  }

  // 고급 분석 메서드 (성능 최적화 포함)
  async analyzeImageOptimized(imageBuffer: Buffer): Promise<any> {
    return await this.performanceOptimizer.analyzeImage(imageBuffer);
  }

  async testServices() {
    return this.aiEnsemble.testAllServices();
  }

  // Mock recommendations for when database is not available
  private getMockRecommendations(limit: number): Recommendation[] {
    const mockArtworks = [
      {
        id: '1',
        title: '모나리자',
        artist: '레오나르도 다 빈치',
        image_url: 'https://via.placeholder.com/300x300?text=Mona+Lisa',
        keywords: ['portrait', 'renaissance', 'classical'],
        available: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        title: '별이 빛나는 밤',
        artist: '빈센트 반 고흐',
        image_url: 'https://via.placeholder.com/300x300?text=Starry+Night',
        keywords: ['landscape', 'post-impressionism', 'night'],
        available: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        title: '진주 귀걸이를 한 소녀',
        artist: '요하네스 베르메르',
        image_url: 'https://via.placeholder.com/300x300?text=Girl+with+Pearl',
        keywords: ['portrait', 'baroque', 'dutch'],
        available: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return mockArtworks.slice(0, limit).map((artwork, index) => ({
      artwork: {
        ...artwork,
        thumbnail_url: artwork.image_url,
        description: `Mock artwork for demonstration`,
        embeddings: undefined,
        price: null,
        admin_user_id: null
      },
      similarity: 0.5 + (index * 0.1),
      reasons: ['Demo recommendation', 'Database not configured'],
      confidence: 0.3
    }));
  }
}