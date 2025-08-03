import { MultiImageAnalysisService, MULTI_IMAGE_PRICING } from '../services/multi-image-analysis';
import { ArtsyIntegration } from '../services/artsy-integration';
import { SocialMediaIntegration } from '../services/social-media-integration';
import { StripeService } from '../services/stripe';
import { supabase } from '../services/supabase';
import { mockDB } from '../services/mock-database';

export class MultiImageAPI {
  private multiImageService: MultiImageAnalysisService;
  private artsyIntegration: ArtsyIntegration;
  private socialMediaIntegration: SocialMediaIntegration;

  constructor() {
    this.multiImageService = new MultiImageAnalysisService();
    this.artsyIntegration = new ArtsyIntegration();
    this.socialMediaIntegration = new SocialMediaIntegration();
  }

  /**
   * 다중 이미지 분석 요청 처리
   */
  async analyzeMultipleImages(req: Request): Promise<Response> {
    try {
      const formData = await req.formData();
      const userId = formData.get('userId') as string | null;

      // 이미지 파일들 추출
      const imageFiles: File[] = [];
      const entries = Array.from(formData.entries());
      
      for (const [key, value] of entries) {
        if (key === 'images' && value instanceof File) {
          imageFiles.push(value);
        }
      }

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
      const imageBuffers = await Promise.all(
        imageFiles.map(async (file) => Buffer.from(await file.arrayBuffer()))
      );

      // 다중 이미지 분석 실행
      const analysisResult = await this.multiImageService.analyzeMultipleImages(imageBuffers, {
        userId,
        analysisType: 'batch',
        findCommonKeywords: true
      });

      if (!analysisResult.success) {
        return new Response(JSON.stringify(analysisResult), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 외부 플랫폼에서 추가 추천 검색
      let externalRecommendations: any[] = [];
      if (analysisResult.commonKeywords && analysisResult.commonKeywords.keywords.length > 0) {
        const topKeywords = analysisResult.commonKeywords.keywords.slice(0, 5);
        
        // Artsy 검색
        const artsyResults = await this.artsyIntegration.searchByKeywords(topKeywords, 10);
        externalRecommendations.push(...artsyResults.artworks.map(artwork => 
          this.artsyIntegration.formatForDisplay(artwork)
        ));

        // 소셜 미디어 검색
        const socialResults = await this.socialMediaIntegration.searchAllPlatforms(
          topKeywords,
          ['behance'],
          10
        );
        externalRecommendations.push(...socialResults.results);
      }

      return new Response(JSON.stringify({
        success: true,
        imageCount: imageFiles.length,
        tier: tier.name,
        results: analysisResult.results,
        commonKeywords: analysisResult.commonKeywords,
        recommendations: {
          internal: analysisResult.recommendations || [],
          external: externalRecommendations
        },
        processingTime: analysisResult.processingTime
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
      // 기본 키워드 생성 (이미지 개수에 따라)
      const commonKeywords = ['art', 'painting', 'creative', 'visual', 'aesthetic'];
      if (imageFiles.length > 3) {
        commonKeywords.push('collection', 'series');
      }
      if (imageFiles.length > 5) {
        commonKeywords.push('portfolio', 'exhibition');
      }

      // Mock 추천 결과 생성
      const recommendations = await mockDB.getRecommendations(commonKeywords);

      // 결과 반환
      return new Response(JSON.stringify({
        success: true,
        analysisResults: {
          imageCount: imageFiles.length,
          commonKeywords,
          tier: imageFiles.length <= 3 ? 'free' : imageFiles.length <= 10 ? 'standard' : 'premium',
          totalSimilarityScore: Math.random() * 0.3 + 0.7 // 70-100%
        },
        recommendations,
        externalSources: [],
        processingTime: Math.random() * 2000 + 1000, // 1-3초
        message: `${imageFiles.length}개 이미지 분석이 완료되었습니다.`
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