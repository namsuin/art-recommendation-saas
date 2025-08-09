import { MultiImageAnalysisService, MULTI_IMAGE_PRICING } from '../services/multi-image-analysis';
import { ArtsyIntegration } from '../services/artsy-integration';
import { SocialMediaIntegration } from '../services/social-media-integration';
import { ExpandedArtSearchService } from '../services/expanded-art-search';
import { StripeService } from '../services/stripe';
import { supabase } from '../services/supabase';
import { mockDB } from '../services/mock-database';
import { ImageUrlValidator } from '../utils/image-url-validator';

export class MultiImageAPI {
  private multiImageService: MultiImageAnalysisService;
  private artsyIntegration: ArtsyIntegration;
  private socialMediaIntegration: SocialMediaIntegration;
  private expandedArtSearch: ExpandedArtSearchService;

  constructor() {
    this.multiImageService = new MultiImageAnalysisService();
    this.artsyIntegration = new ArtsyIntegration();
    this.socialMediaIntegration = new SocialMediaIntegration();
    this.expandedArtSearch = new ExpandedArtSearchService();
  }

  /**
   * 다중 이미지 분석 요청 처리
   */
  async analyzeMultipleImages(req: Request): Promise<Response> {
    try {
      console.log('🚀 Starting multi-image analysis...');
      const formData = await req.formData();
      let rawUserId = formData.get('userId') as string | null;
      
      // Authorization 헤더 확인
      const authorization = req.headers.get('authorization');
      console.log('🔍 Authorization header:', authorization ? 'present' : 'missing');
      
      // Bearer 토큰으로 사용자 확인
      if (authorization && authorization.startsWith('Bearer ')) {
        try {
          const accessToken = authorization.slice(7);
          const { supabaseAdmin } = await import('../services/supabase');
          const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
          
          if (!error && user) {
            rawUserId = user.id;
            console.log('✅ User authenticated via token:', user.email);
          } else {
            console.log('❌ Token validation failed:', error);
          }
        } catch (tokenError) {
          console.log('❌ Token processing error:', tokenError);
        }
      }
      
      // 빈 문자열이나 null을 모두 null로 처리
      const userId = rawUserId && rawUserId.trim() !== '' ? rawUserId : null;
      
      // 디버깅: FormData의 모든 키를 확인
      const formDataKeys = Array.from(formData.keys());
      console.log('📋 FormData keys:', formDataKeys);
      console.log('📋 Raw User ID received:', rawUserId, typeof rawUserId);
      console.log('📋 Processed User ID:', userId, typeof userId);
      console.log('📋 User ID is null?', userId === null);

      // 이미지 파일들 추출
      const imageFiles: File[] = [];
      const entries = Array.from(formData.entries());
      
      for (const [key, value] of entries) {
        if (key.startsWith('image') && value instanceof File) {
          imageFiles.push(value);
          console.log(`📷 Found image: ${key} - ${value.name} (${value.size} bytes)`);
        }
      }
      
      console.log(`🖼️ Total images found: ${imageFiles.length}`);

      if (imageFiles.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: '분석할 이미지가 없습니다.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Mock 모드일 때 간단한 처리
      if (!supabase) {
        console.log('🎭 Running in Mock mode - using mock recommendations');
        return this.handleMockMultiImageAnalysis(userId || 'anonymous', imageFiles);
      }

      // 결제 티어 확인
      const tier = MultiImageAnalysisService.calculatePaymentTier(imageFiles.length);
      const permission = await this.multiImageService.checkAnalysisPermission(userId, imageFiles.length);

      if (!permission.canAnalyze && permission.paymentRequired) {
        return new Response(JSON.stringify({
          success: false,
          error: '결제가 필요합니다.',
          paymentRequired: true,
          tier: tier,
          paymentUrl: await this.createPaymentSession(userId, tier)
        }), {
          status: 402, // Payment Required
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 이미지를 버퍼로 변환
      console.log('🔄 Converting images to buffers...');
      const imageBuffers = await Promise.all(
        imageFiles.map(async (file) => Buffer.from(await file.arrayBuffer()))
      );
      console.log('✅ Buffer conversion complete');

      // 다중 이미지 분석 실행
      console.log('🎯 Starting AI analysis...');
      const analysisResult = await this.multiImageService.analyzeMultipleImages(imageBuffers, {
        userId,
        analysisType: 'batch',
        findCommonKeywords: true
      });

      console.log('📊 Analysis result:', analysisResult.success ? 'SUCCESS' : 'FAILED');
      
      if (!analysisResult.success) {
        console.error('❌ Analysis failed:', analysisResult.error);
        return new Response(JSON.stringify(analysisResult), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Mock 데이터를 추가하여 최소한의 추천 작품 보장
      console.log('🎯 Adding mock recommendations as fallback');
      const mockRecommendations = await mockDB.getRecommendations(
        analysisResult.commonKeywords?.keywords || ['artwork', 'creative', 'visual']
      );
      console.log('📊 Mock recommendations retrieved:', mockRecommendations.length);
      
      // Mock 추천을 internal 배열에 추가
      if (!analysisResult.recommendations) {
        analysisResult.recommendations = [];
      }
      analysisResult.recommendations.push(...mockRecommendations);

      // 외부 플랫폼에서 추가 추천 검색 (확장된 소스 포함)
      let externalRecommendations: any[] = [];
      if (analysisResult.commonKeywords && analysisResult.commonKeywords.keywords.length > 0) {
        const topKeywords = analysisResult.commonKeywords.keywords.slice(0, 5);
        
        console.log('🌍 Searching expanded art sources...');
        
        try {
          // 확장된 미술관 검색 (Chicago, Rijksmuseum, 국립중앙박물관 포함)
          const expandedSearchResults = await this.expandedArtSearch.searchAllSources(
            topKeywords,
            {
              sources: ['chicago', 'rijksmuseum', 'korea'],
              limit: 5,
              includeKorean: true
            }
          );

          if (expandedSearchResults.success) {
            expandedSearchResults.results.forEach(sourceResult => {
              console.log(`📍 ${sourceResult.source}: Found ${sourceResult.artworks.length} artworks`);
              externalRecommendations.push(...sourceResult.artworks);
            });
          }

          // 기존 Artsy 검색도 유지
          const artsyResults = await this.artsyIntegration.searchByKeywords(topKeywords, 5);
          externalRecommendations.push(...artsyResults.artworks.map(artwork => 
            this.artsyIntegration.formatForDisplay(artwork)
          ));

          // 소셜 미디어 검색
          const socialResults = await this.socialMediaIntegration.searchAllPlatforms(
            topKeywords,
            ['behance'],
            5
          );
          externalRecommendations.push(...socialResults.results);
        } catch (error) {
          console.error('🚫 External search failed, using mock data only:', error);
        }
      }

      // 외부 추천에도 유사도 추가
      if (analysisResult.commonKeywords && externalRecommendations.length > 0) {
        const multiImageService = this.multiImageService;
        externalRecommendations = externalRecommendations.map(artwork => {
          const similarity = multiImageService.calculateSimilarityScore(
            analysisResult.commonKeywords!.keywords,
            artwork.keywords || artwork.tags || [],
            analysisResult.commonKeywords!.confidence
          );
          
          return {
            ...artwork,
            similarity_score: similarity.total,
            similarity_details: similarity
          };
        });
        
        // 유사도 순으로 정렬
        externalRecommendations.sort((a, b) => b.similarity_score - a.similarity_score);
      }

      // 이미지 URL 유효성 검증 및 필터링
      console.log('🔍 Validating recommendation image URLs...');
      const validatedInternalRecommendations = await ImageUrlValidator.filterValidRecommendations(
        analysisResult.recommendations || []
      );
      const validatedExternalRecommendations = await ImageUrlValidator.filterValidRecommendations(
        externalRecommendations
      );

      console.log(`📊 Image validation complete - Internal: ${validatedInternalRecommendations.length}/${(analysisResult.recommendations || []).length}, External: ${validatedExternalRecommendations.length}/${externalRecommendations.length}`);

      return new Response(JSON.stringify({
        success: true,
        imageCount: imageFiles.length,
        tier: tier.name,
        results: analysisResult.results,
        commonKeywords: {
          ...analysisResult.commonKeywords,
          totalSimilarityScore: analysisResult.commonKeywords ? 
            Math.round(analysisResult.commonKeywords.confidence * 100) : 0
        },
        recommendations: {
          internal: validatedInternalRecommendations,
          external: validatedExternalRecommendations
        },
        processingTime: analysisResult.processingTime,
        similarityAnalysis: {
          averageSimilarity: validatedInternalRecommendations.length > 0 ? 
            Math.round((validatedInternalRecommendations.reduce((sum: number, rec: any) => 
              sum + (rec.similarity_score?.total || rec.similarity || 0), 0) / validatedInternalRecommendations.length) * 100) : 0,
          topMatches: validatedInternalRecommendations.slice(0, 3).map((rec: any) => ({
            title: (rec.artwork || rec).title || '제목 없음',
            similarity: Math.round(((rec.similarity_score?.total || rec.similarity || 0)) * 100),
            matchedKeywords: rec.similarity_score?.matchedKeywords || rec.matchingKeywords || []
          }))
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Multi-image analysis error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 다중 이미지 분석을 위한 결제 세션 생성
   */
  private async createPaymentSession(userId: string, tier: any): Promise<string | null> {
    if (!StripeService.isConfigured() || tier.price === 0) {
      return null;
    }

    try {
      const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16'
      });

      // 사용자 정보 조회
      const { data: user } = await supabase!
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!user) {
        return null;
      }

      // Stripe 고객 생성/조회
      const customer = await StripeService.getOrCreateCustomer(userId, user.email, user.display_name);
      if (!customer) {
        return null;
      }

      // 일회성 결제 세션 생성
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: tier.name,
              description: tier.description,
            },
            unit_amount: tier.price, // cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/analysis/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/analysis/cancel`,
        metadata: {
          userId,
          analysisType: 'multi_image',
          tier: tier.name,
          maxImages: tier.maxImages.toString()
        }
      });

      return session.url;

    } catch (error) {
      console.error('Failed to create payment session:', error);
      return null;
    }
  }

  /**
   * 결제 성공 후 처리
   */
  async handlePaymentSuccess(sessionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!StripeService.isConfigured()) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16'
      });

      // 세션 정보 조회
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status !== 'paid') {
        return { success: false, error: '결제가 완료되지 않았습니다.' };
      }

      const { userId, tier, maxImages } = session.metadata!;

      // 결제 기록 저장
      if (supabase) {
        const { error } = await supabase
          .from('multi_image_payments')
          .insert({
            user_id: userId,
            stripe_session_id: sessionId,
            tier: tier,
            max_images: parseInt(maxImages),
            amount: session.amount_total! / 100, // Convert from cents
            currency: session.currency,
            status: 'completed',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 유효
          });

        if (error) {
          console.error('Failed to save payment record:', error);
        }
      }

      return { success: true };

    } catch (error) {
      console.error('Payment success handling error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.' 
      };
    }
  }

  /**
   * 사용자의 다중 이미지 분석 히스토리 조회
   */
  async getUserAnalysisHistory(userId: string, limit: number = 20): Promise<Response> {
    try {
      const result = await this.multiImageService.getUserAnalysisHistory(userId, limit);
      
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: '히스토리 조회 중 오류가 발생했습니다.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * 외부 플랫폼 검색 API
   */
  async searchExternalPlatforms(req: Request): Promise<Response> {
    try {
      const { keywords, platforms = ['artsy', 'behance'], limit = 20 } = await req.json();

      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: '검색 키워드가 필요합니다.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const results: any = {
        artsy: [],
        social: []
      };

      // Artsy 검색
      if (platforms.includes('artsy')) {
        const artsyResults = await this.artsyIntegration.searchByKeywords(keywords, limit);
        results.artsy = artsyResults.artworks.map(artwork => 
          this.artsyIntegration.formatForDisplay(artwork)
        );
      }

      // 소셜 미디어 검색
      const socialPlatforms = platforms.filter(p => ['instagram', 'behance', 'pinterest'].includes(p));
      if (socialPlatforms.length > 0) {
        const socialResults = await this.socialMediaIntegration.searchAllPlatforms(
          keywords,
          socialPlatforms as any,
          Math.floor(limit / socialPlatforms.length)
        );
        results.social = socialResults.results;
      }

      return new Response(JSON.stringify({
        success: true,
        keywords,
        results,
        total: results.artsy.length + results.social.length
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('External platform search error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: '외부 플랫폼 검색 중 오류가 발생했습니다.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Mock 다중 이미지 분석 처리
   */
  private async handleMockMultiImageAnalysis(userId: string, imageFiles: File[]): Promise<Response> {
    try {
      console.log(`🎭 Mock analysis for ${imageFiles.length} images`);
      
      // 기본 키워드 생성 (이미지 개수에 따라)
      const commonKeywords = ['artwork', 'visual-art', 'creative', 'painting', 'aesthetic'];
      if (imageFiles.length > 2) {
        commonKeywords.push('collection', 'series', 'exhibition');
      }

      // Mock 추천 결과 생성
      console.log('🎯 Getting mock recommendations with keywords:', commonKeywords);
      const mockRecommendations = await mockDB.getRecommendations(commonKeywords);
      console.log('📊 Mock recommendations found:', mockRecommendations.length);

      // 결제 티어 계산
      const tier = MultiImageAnalysisService.calculatePaymentTier(imageFiles.length);
      
      // Mock 추천에 대해서도 이미지 URL 유효성 검증
      console.log('🔍 Validating mock recommendation image URLs...');
      const validatedMockRecommendations = await ImageUrlValidator.filterValidRecommendations(mockRecommendations);
      console.log(`📊 Mock image validation complete: ${validatedMockRecommendations.length}/${mockRecommendations.length}`);
      
      // 정상적인 API 응답 형식에 맞춤
      return new Response(JSON.stringify({
        success: true,
        imageCount: imageFiles.length,
        tier: tier.name,
        results: imageFiles.map((_, index) => ({
          keywords: ['artwork', 'visual-art', 'creative'],
          colors: ['blue', 'red'],
          style: 'mixed',
          mood: 'balanced',
          confidence: 0.85,
          embeddings: [],
          ai_sources: {
            clarifai: { concepts: [], colors: [] }
          }
        })),
        commonKeywords: {
          keywords: commonKeywords,
          confidence: 0.85,
          frequency: commonKeywords.reduce((freq, keyword) => ({ ...freq, [keyword]: 1 }), {}),
          totalSimilarityScore: Math.round(Math.random() * 30 + 70) // 70-100%
        },
        recommendations: {
          internal: validatedMockRecommendations,
          external: []
        },
        processingTime: Math.random() * 2000 + 1000, // 1-3초
        similarityAnalysis: {
          averageSimilarity: Math.round(Math.random() * 30 + 70),
          topMatches: validatedMockRecommendations.slice(0, 3).map(rec => ({
            title: rec.artwork.title,
            similarity: Math.round((rec.similarity || 0.8) * 100),
            matchedKeywords: rec.matchingKeywords || commonKeywords.slice(0, 3)
          }))
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Mock multi-image analysis error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: '다중 이미지 분석 중 오류가 발생했습니다.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}

// 싱글톤 인스턴스
let multiImageAPIInstance: MultiImageAPI | null = null;

export function getMultiImageAPI(): MultiImageAPI {
  if (!multiImageAPIInstance) {
    multiImageAPIInstance = new MultiImageAPI();
  }
  return multiImageAPIInstance;
}