import { AIAnalysisService } from './ai-analysis';
import { supabase } from './supabase';

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

  constructor() {
    this.aiService = new AIAnalysisService();
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
      if (frequency >= threshold) {
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

      // 공통 키워드 기반 추천 생성
      let recommendations: any[] = [];
      if (commonKeywords && commonKeywords.keywords.length > 0) {
        try {
          const combinedKeywords = commonKeywords.keywords.slice(0, 10); // 상위 10개 키워드 사용
          recommendations = await this.getRecommendationsByKeywords(combinedKeywords, 20);
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
   * 키워드 기반 추천 검색
   */
  private async getRecommendationsByKeywords(keywords: string[], limit: number = 20): Promise<any[]> {
    if (!supabase) {
      return [];
    }

    try {
      // keywords 배열에서 OR 검색 사용 (text[] 타입에 적합)
      const { data: artworks, error } = await supabase
        .from('artworks')
        .select('*')
        .or(keywords.map(keyword => `keywords.cs.{${keyword}}`).join(','))
        .eq('available', true)
        .limit(limit);

      if (error) {
        console.error('Keyword search error:', error);
        return [];
      }

      // 키워드 매칭 점수 계산
      return (artworks || []).map(artwork => {
        const artworkKeywords = artwork.keywords || [];
        const matchCount = keywords.filter(k => 
          artworkKeywords.some((ak: string) => ak.toLowerCase().includes(k.toLowerCase()))
        ).length;
        
        return {
          ...artwork,
          similarity: matchCount / keywords.length,
          reasoning: [`공통 키워드 ${matchCount}개 매칭`, ...keywords.slice(0, 3)]
        };
      }).sort((a, b) => b.similarity - a.similarity);

    } catch (error) {
      console.error('Failed to get recommendations by keywords:', error);
      return [];
    }
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