import { AIAnalysisService } from './ai-analysis';
import { supabase } from './supabase';
import { ExpandedArtSearchService } from './expanded-art-search';

interface ImageAnalysisResult {
  keywords: string[];
  colors: string[];
  style: string[];
  mood: string[];
  confidence: number;
  embeddings?: number[];
}

interface MultiImageAnalysisOptions {
  userId: string;
  analysisType: 'batch' | 'progressive';
  findCommonKeywords: boolean;
}

interface CommonKeywords {
  keywords: string[];
  confidence: number;
  frequency: { [key: string]: number };
}

interface PaymentTier {
  name: string;
  maxImages: number;
  price: number; // USD cents
  description: string;
}

export const MULTI_IMAGE_PRICING = {
  free: {
    name: 'Free Tier',
    maxImages: 3,
    price: 0,
    description: '무료로 최대 3장까지 분석'
  },
  standard: {
    name: 'Standard Pack',
    maxImages: 10,
    price: 500, // $5.00
    description: '4-10장 분석 팩 ($5)'
  },
  premium: {
    name: 'Premium Pack', 
    maxImages: 50,
    price: 1000, // $10.00
    description: '11장 이상 분석 팩 ($10)'
  }
} as const;

export class MultiImageAnalysisService {
  private aiService: AIAnalysisService;
  private expandedSearchService: ExpandedArtSearchService;

  constructor() {
    this.aiService = new AIAnalysisService();
    this.expandedSearchService = new ExpandedArtSearchService();
  }

  /**
   * 이미지 개수에 따른 결제 티어 계산
   */
  static calculatePaymentTier(imageCount: number): PaymentTier {
    if (imageCount <= 3) {
      return MULTI_IMAGE_PRICING.free;
    } else if (imageCount <= 10) {
      return MULTI_IMAGE_PRICING.standard;
    } else {
      return MULTI_IMAGE_PRICING.premium;
    }
  }

  /**
   * 사용자의 다중 이미지 분석 권한 확인
   */
  async checkAnalysisPermission(userId: string, imageCount: number): Promise<{
    canAnalyze: boolean;
    paymentRequired: boolean;
    tier: PaymentTier;
    error?: string;
  }> {
    const tier = MultiImageAnalysisService.calculatePaymentTier(imageCount);

    // 무료 티어인 경우
    if (tier.price === 0) {
      return {
        canAnalyze: true,
        paymentRequired: false,
        tier
      };
    }

    // 유료 티어인 경우 결제 기록 확인
    if (!supabase) {
      return {
        canAnalyze: false,
        paymentRequired: true,
        tier,
        error: '데이터베이스가 구성되지 않았습니다.'
      };
    }

    // 최근 24시간 내 동일 티어 결제 기록 확인
    const { data: recentPayment, error } = await supabase
      .from('multi_image_payments')
      .select('*')
      .eq('user_id', userId)
      .eq('tier', tier.name)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Payment check error:', error);
      return {
        canAnalyze: false,
        paymentRequired: true,
        tier,
        error: '결제 기록 확인에 실패했습니다.'
      };
    }

    return {
      canAnalyze: !!recentPayment && recentPayment.length > 0,
      paymentRequired: !recentPayment || recentPayment.length === 0,
      tier
    };
  }

  /**
   * 다중 이미지와 추천 작품 간의 유사도 계산
   */
  calculateSimilarityScore(
    sourceKeywords: string[],
    targetKeywords: string[],
    confidence: number
  ): {
    total: number;
    keywordMatch: number;
    matchedKeywords: string[];
    confidence: number;
  } {
    if (sourceKeywords.length === 0 || targetKeywords.length === 0) {
      return {
        total: 0,
        keywordMatch: 0,
        matchedKeywords: [],
        confidence: 0
      };
    }

    // 키워드 정규화 (소문자, 공백 제거)
    const normalizeKeyword = (keyword: string) => 
      keyword.toLowerCase().trim().replace(/[^\w\s]/g, '');

    const normalizedSource = sourceKeywords.map(normalizeKeyword);
    const normalizedTarget = targetKeywords.map(normalizeKeyword);

    // 정확한 매칭 키워드 찾기 (한 글자 키워드 제외)
    const exactMatches = normalizedSource.filter(keyword => 
      normalizedTarget.includes(keyword) && keyword.length > 1
    );

    // 부분 매칭 키워드 찾기 (포함 관계)
    const partialMatches = normalizedSource.filter(sourceKeyword => 
      normalizedTarget.some(targetKeyword => 
        (targetKeyword.includes(sourceKeyword) || sourceKeyword.includes(targetKeyword)) &&
        sourceKeyword.length > 3 && !exactMatches.includes(sourceKeyword)
      )
    );

    const totalMatches = exactMatches.length + (partialMatches.length * 0.5);
    const keywordMatchPercent = Math.round((totalMatches / normalizedSource.length) * 100);

    // 전체 유사도 계산
    const baseScore = totalMatches / Math.max(normalizedSource.length, normalizedTarget.length);
    const confidenceBoost = confidence * 0.3; // 신뢰도에 따른 가중치
    const totalScore = Math.min(1.0, baseScore + confidenceBoost);

    return {
      total: totalScore,
      keywordMatch: keywordMatchPercent,
      matchedKeywords: [...exactMatches, ...partialMatches].slice(0, 10),
      confidence: Math.round(confidence * 100)
    };
  }

  /**
   * 여러 이미지에서 공통 키워드 추출
   */
  extractCommonKeywords(analyses: ImageAnalysisResult[]): CommonKeywords {
    if (analyses.length === 0) {
      return { keywords: [], confidence: 0, frequency: {} };
    }

    // 모든 키워드 수집 및 빈도 계산
    const keywordFrequency: { [key: string]: number } = {};
    const totalImages = analyses.length;

    analyses.forEach(analysis => {
      const allKeywords = [
        ...analysis.keywords,
        ...analysis.colors,
        ...analysis.style,
        ...analysis.mood
      ];

      allKeywords.forEach(keyword => {
        const normalizedKeyword = keyword.toLowerCase().trim();
        keywordFrequency[normalizedKeyword] = (keywordFrequency[normalizedKeyword] || 0) + 1;
      });
    });

    // 50% 이상의 이미지에서 나타나는 키워드만 선택
    const threshold = Math.max(1, Math.floor(totalImages * 0.5));
    const commonKeywords: string[] = [];

    Object.entries(keywordFrequency).forEach(([keyword, frequency]) => {
      // 한 글자 키워드는 제외하고, threshold 이상인 것만 선택
      if (frequency >= threshold && keyword.length > 1) {
        commonKeywords.push(keyword);
      }
    });

    // 빈도순으로 정렬
    commonKeywords.sort((a, b) => keywordFrequency[b] - keywordFrequency[a]);

    // 신뢰도 계산 (공통 키워드 비율)
    const confidence = commonKeywords.length > 0 
      ? Object.values(keywordFrequency).reduce((sum, freq) => sum + freq, 0) / (analyses.length * 10) // 이미지당 평균 10개 키워드 가정
      : 0;

    return {
      keywords: commonKeywords.slice(0, 20), // 최대 20개 키워드
      confidence: Math.min(confidence, 1),
      frequency: keywordFrequency
    };
  }

  /**
   * 다중 이미지 분석 실행
   */
  async analyzeMultipleImages(
    imageBuffers: Buffer[],
    options: MultiImageAnalysisOptions
  ): Promise<{
    success: boolean;
    results?: ImageAnalysisResult[];
    commonKeywords?: CommonKeywords;
    recommendations?: any[];
    error?: string;
    processingTime?: number;
  }> {
    const startTime = Date.now();

    try {
      // 권한 확인
      const permission = await this.checkAnalysisPermission(options.userId, imageBuffers.length);
      if (!permission.canAnalyze) {
        return {
          success: false,
          error: permission.paymentRequired 
            ? `${permission.tier.description} 결제가 필요합니다.`
            : permission.error || '분석 권한이 없습니다.'
        };
      }

      const results: ImageAnalysisResult[] = [];

      // 이미지별 개별 분석
      for (let i = 0; i < imageBuffers.length; i++) {
        const buffer = imageBuffers[i];
        
        try {
          console.log(`🔍 Analyzing image ${i + 1}/${imageBuffers.length}`);
          
          // AI 분석 실행
          const analysisResult = await this.aiService.analyzeImageAndRecommend(
            buffer,
            options.userId,
            undefined, // tasteGroupId
            5 // 개별 이미지당 추천 수 제한
          );

          results.push(analysisResult.analysis);

          // Progressive 모드인 경우 중간 결과 저장
          if (options.analysisType === 'progressive' && supabase) {
            await supabase
              .from('multi_image_analysis_progress')
              .upsert({
                user_id: options.userId,
                batch_id: `batch_${Date.now()}`,
                image_index: i,
                analysis_result: analysisResult.analysis,
                completed_at: new Date().toISOString()
              });
          }

        } catch (error) {
          console.error(`Failed to analyze image ${i + 1}:`, error);
          // 개별 이미지 실패는 전체를 중단하지 않고 계속 진행
          results.push({
            keywords: [],
            colors: [],
            style: [],
            mood: [],
            confidence: 0
          });
        }
      }

      // 공통 키워드 추출
      let commonKeywords: CommonKeywords | undefined;
      if (options.findCommonKeywords && results.length > 1) {
        commonKeywords = this.extractCommonKeywords(results);
        console.log(`📊 Found ${commonKeywords.keywords.length} common keywords`);
      }

      // 공통 키워드 기반 추천 생성 (유사도 포함)
      let recommendations: any[] = [];
      if (commonKeywords && commonKeywords.keywords.length > 0) {
        try {
          const combinedKeywords = commonKeywords.keywords.slice(0, 10); // 상위 10개 키워드 사용
          recommendations = await this.getRecommendationsByKeywords(combinedKeywords, 20);
          
          // 각 추천 작품에 대해 유사도 계산
          console.log(`🎯 Calculating similarity for ${recommendations.length} artworks`);
          recommendations = recommendations.map(artwork => {
            const similarity = this.calculateSimilarityScore(
              combinedKeywords,
              artwork.keywords || [],
              commonKeywords.confidence
            );
            
            console.log(`📊 ${artwork.title}: ${Math.round(similarity.total * 100)}% similarity`);
            
            return {
              ...artwork,
              similarity_score: similarity,
              reasoning: [
                `공통 키워드 매칭: ${similarity.keywordMatch}%`,
                `전체 유사도: ${Math.round(similarity.total * 100)}%`,
                `주요 매칭 키워드: ${similarity.matchedKeywords.slice(0, 3).join(', ')}`
              ]
            };
          });
          
          // 유사도 순으로 정렬
          recommendations.sort((a, b) => b.similarity_score.total - a.similarity_score.total);
          
        } catch (error) {
          console.error('Failed to get recommendations:', error);
        }
      }

      // 분석 결과 저장
      if (supabase) {
        const { error: saveError } = await supabase
          .from('multi_image_analyses')
          .insert({
            user_id: options.userId,
            image_count: imageBuffers.length,
            individual_results: results,
            common_keywords: commonKeywords,
            recommendations: recommendations,
            processing_time: Date.now() - startTime,
            tier: permission.tier.name
          });

        if (saveError) {
          console.error('Failed to save analysis results:', saveError);
        }
      }

      return {
        success: true,
        results,
        commonKeywords,
        recommendations,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Multi-image analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 키워드 기반 추천 검색 (확장된 소스 포함)
   */
  private async getRecommendationsByKeywords(keywords: string[], limit: number = 20): Promise<any[]> {
    try {
      // 1. 확장된 아트 검색 서비스를 통해 다양한 소스에서 검색 (한국 창작 플랫폼 제외, 새로운 국제 플랫폼들 추가)
      const expandedResults = await this.expandedSearchService.searchAllSources(keywords, {
        sources: ['met', 'chicago', 'rijksmuseum', 'korea', 'korean-cultural', 'artsonia', 'academy-art', 'bluethumb', 'degreeart', 'sva-bfa'],
        limit: Math.floor(limit / 2), // 절반은 확장 소스에서
        includeKorean: true,
        includeStudentArt: true, // 학생 작품 포함 (Academy of Art University, SVA BFA)
        includeInternational: true // 국제 플랫폼 포함 (Bluethumb, DegreeArt)
      });

      let allArtworks: any[] = [];

      // 확장 검색 결과를 통합 (텀블벅 필터링)
      if (expandedResults.success) {
        expandedResults.results.forEach(result => {
          const sourceArtworks = result.artworks
            .filter(artwork => {
              // 텀블벅, 그라폴리오, 국내 대학교 관련 데이터 완전 제거
              const isTumblbug = artwork.platform === 'tumblbug' || 
                                artwork.source === '텀블벅' || 
                                artwork.search_source === '텀블벅' ||
                                (artwork.source_url && artwork.source_url.includes('tumblbug.com'));
              
              const isGrafolio = artwork.platform === 'grafolio' || 
                               artwork.source === '그라폴리오' || 
                               artwork.search_source === '그라폴리오' ||
                               (artwork.source_url && artwork.source_url.includes('grafolio.naver.com'));
              
              // 국내 대학교 필터링 강화
              const isKoreanUniversity = artwork.platform === 'university' ||
                                        artwork.source === '대학 졸업전시' ||
                                        artwork.category === 'student_work' ||
                                        artwork.search_source === 'graduation' ||
                                        (artwork.university && (
                                          artwork.university.includes('대학') ||
                                          artwork.university.includes('대학교') ||
                                          artwork.university.includes('University')
                                        )) ||
                                        (artwork.source_url && (
                                          artwork.source_url.includes('.ac.kr') ||
                                          artwork.source_url.includes('univ.') ||
                                          artwork.source_url.includes('university') ||
                                          artwork.source_url.includes('college') ||
                                          artwork.source_url.includes('graduation')
                                        )) ||
                                        (artwork.source && (
                                          artwork.source.includes('졸업전시') ||
                                          artwork.source.includes('졸업작품') ||
                                          artwork.source.includes('대학') ||
                                          artwork.source.includes('University') ||
                                          artwork.source.includes('College')
                                        )) ||
                                        (artwork.title && (
                                          artwork.title.includes('졸업작품') ||
                                          artwork.title.includes('졸업전시')
                                        ));
              
              return !isTumblbug && !isGrafolio && !isKoreanUniversity;
            })
            .map(artwork => ({
              ...artwork,
              source_type: 'external',
              search_source: result.source,
              similarity: this.calculateKeywordSimilarity(keywords, artwork.keywords || []),
              reasoning: [`${result.source}에서 발견`, ...keywords.slice(0, 3)]
            }));
          allArtworks.push(...sourceArtworks);
        });
      }

      // 2. 기존 Supabase 데이터베이스에서도 검색 (호환성 유지)
      if (supabase) {
        try {
          const { data: dbArtworks, error } = await supabase
            .from('artworks')
            .select('*')
            .or(keywords.map(keyword => `keywords.cs.{${keyword}}`).join(','))
            .eq('available', true)
            .limit(Math.ceil(limit / 2)); // 나머지 절반은 DB에서

          if (!error && dbArtworks) {
            const dbArtworksWithMeta = dbArtworks
              .filter(artwork => {
                // 데이터베이스에서도 텀블벅, 그라폴리오, 국내 대학교 관련 데이터 완전 제거
                const isTumblbug = artwork.platform === 'tumblbug' || 
                                  artwork.source === '텀블벅' || 
                                  artwork.search_source === '텀블벅' ||
                                  (artwork.source_url && artwork.source_url.includes('tumblbug.com'));
                
                const isGrafolio = artwork.platform === 'grafolio' || 
                                 artwork.source === '그라폴리오' || 
                                 artwork.search_source === '그라폴리오' ||
                                 (artwork.source_url && artwork.source_url.includes('grafolio.naver.com'));
                
                // 국내 대학교 완전 제거
                const isKoreanUniversity = artwork.platform === 'university' ||
                                          artwork.source === '대학 졸업전시' ||
                                          artwork.category === 'student_work' ||
                                          artwork.search_source === 'graduation' ||
                                          (artwork.university && (
                                            artwork.university.includes('대학') ||
                                            artwork.university.includes('대학교') ||
                                            artwork.university.includes('University')
                                          )) ||
                                          (artwork.source_url && (
                                            artwork.source_url.includes('.ac.kr') ||
                                            artwork.source_url.includes('univ.') ||
                                            artwork.source_url.includes('university') ||
                                            artwork.source_url.includes('college') ||
                                            artwork.source_url.includes('graduation')
                                          )) ||
                                          (artwork.source && (
                                            artwork.source.includes('졸업전시') ||
                                            artwork.source.includes('졸업작품') ||
                                            artwork.source.includes('대학') ||
                                            artwork.source.includes('University') ||
                                            artwork.source.includes('College')
                                          )) ||
                                          (artwork.title && (
                                            artwork.title.includes('졸업작품') ||
                                            artwork.title.includes('졸업전시')
                                          ));
                
                return !isTumblbug && !isGrafolio && !isKoreanUniversity;
              })
              .map(artwork => ({
                ...artwork,
                source_type: 'database',
                search_source: 'Internal Database',
                similarity: this.calculateKeywordSimilarity(keywords, artwork.keywords || []),
                reasoning: [`내부 DB에서 발견`, ...keywords.slice(0, 3)]
              }));
            allArtworks.push(...dbArtworksWithMeta);
          }
        } catch (error) {
          console.error('Database search error:', error);
        }
      }

      // 유사도 순으로 정렬하고 제한
      return allArtworks
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    } catch (error) {
      console.error('Failed to get recommendations by keywords:', error);
      return [];
    }
  }

  /**
   * 키워드 유사도 계산
   */
  private calculateKeywordSimilarity(sourceKeywords: string[], targetKeywords: string[]): number {
    if (sourceKeywords.length === 0 || targetKeywords.length === 0) {
      return 0;
    }

    const matchCount = sourceKeywords.filter(sourceKeyword => 
      targetKeywords.some(targetKeyword => 
        targetKeyword.toLowerCase().includes(sourceKeyword.toLowerCase()) ||
        sourceKeyword.toLowerCase().includes(targetKeyword.toLowerCase())
      )
    ).length;

    return matchCount / sourceKeywords.length;
  }

  /**
   * 사용자의 다중 이미지 분석 히스토리 조회
   */
  async getUserAnalysisHistory(userId: string, limit: number = 20): Promise<{
    success: boolean;
    history?: any[];
    error?: string;
  }> {
    if (!supabase) {
      return {
        success: false,
        error: '데이터베이스가 구성되지 않았습니다.'
      };
    }

    try {
      const { data: history, error } = await supabase
        .from('multi_image_analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return {
          success: false,
          error: '히스토리 조회에 실패했습니다.'
        };
      }

      return {
        success: true,
        history: history || []
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '히스토리 조회 중 오류가 발생했습니다.'
      };
    }
  }
}