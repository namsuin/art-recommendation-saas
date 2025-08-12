/**
 * AI 아트 생성 및 스타일 전이 서비스
 * 텍스트-투-이미지, 스타일 전이, 이미지 변환 기능 제공
 */

import { supabase } from './supabase';
import { mockDB } from './mock-database';

export interface StyleTransferRequest {
  sourceImageUrl: string;
  targetStyle: string;
  intensity?: number; // 0-100
  userId?: string;
  preserveColors?: boolean;
}

export interface TextToImageRequest {
  prompt: string;
  style?: string;
  size?: '256x256' | '512x512' | '1024x1024';
  quality?: 'draft' | 'standard' | 'hd';
  userId?: string;
  negativePrompt?: string;
}

export interface ImageVariationRequest {
  sourceImageUrl: string;
  variationCount?: number;
  variationStrength?: number; // 0-100
  userId?: string;
}

export interface ArtStyle {
  id: string;
  name: string;
  description: string;
  category: 'classical' | 'modern' | 'contemporary' | 'abstract' | 'impressionist' | 'cubist' | 'pop_art';
  thumbnailUrl: string;
  popularityScore: number;
  processingTime: number; // 예상 처리 시간 (초)
  premiumOnly: boolean;
}

export interface GenerationResult {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  originalImageUrl?: string;
  generatedImageUrl?: string;
  thumbnailUrl?: string;
  metadata: {
    prompt?: string;
    style: string;
    processingTime: number;
    parameters: Record<string, any>;
  };
  createdAt: string;
  userId?: string;
}

export interface GenerationHistory {
  id: string;
  type: 'style_transfer' | 'text_to_image' | 'image_variation';
  userId: string;
  input: {
    prompt?: string;
    sourceImage?: string;
    style: string;
    parameters: Record<string, any>;
  };
  output: {
    imageUrl: string;
    thumbnailUrl: string;
    processingTime: number;
  };
  createdAt: string;
  isPublic: boolean;
  likes: number;
  downloads: number;
}

export class AIArtGeneratorService {
  private availableStyles: Map<string, ArtStyle> = new Map();

  constructor() {
    this.initializeStyles();
  }

  /**
   * 사용 가능한 아트 스타일 목록 조회
   */
  async getAvailableStyles(
    category?: string,
    premiumUser: boolean = false
  ): Promise<{ success: boolean; data?: ArtStyle[]; error?: string }> {
    try {
      let styles = Array.from(this.availableStyles.values());

      // 카테고리 필터링
      if (category) {
        styles = styles.filter(style => style.category === category);
      }

      // 프리미엄 사용자가 아닌 경우 무료 스타일만
      if (!premiumUser) {
        styles = styles.filter(style => !style.premiumOnly);
      }

      // 인기도 순으로 정렬
      styles.sort((a, b) => b.popularityScore - a.popularityScore);

      return { success: true, data: styles };

    } catch (error) {
      logger.error('Get available styles error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '스타일 목록 조회 실패'
      };
    }
  }

  /**
   * 스타일 전이 수행
   */
  async performStyleTransfer(
    request: StyleTransferRequest
  ): Promise<{ success: boolean; data?: GenerationResult; error?: string }> {
    try {
      const style = this.availableStyles.get(request.targetStyle);
      if (!style) {
        return { success: false, error: '지원하지 않는 스타일입니다.' };
      }

      // 생성 작업 ID
      const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Mock 처리 시뮬레이션
      const processingTime = style.processingTime + Math.random() * 10;
      
      // 실제로는 AI 서비스 API 호출
      const result = await this.mockStyleTransfer(request, generationId, processingTime);

      // 히스토리 저장
      if (request.userId) {
        await this.saveGenerationHistory({
          id: generationId,
          type: 'style_transfer',
          userId: request.userId,
          input: {
            sourceImage: request.sourceImageUrl,
            style: request.targetStyle,
            parameters: {
              intensity: request.intensity || 80,
              preserveColors: request.preserveColors || false
            }
          },
          output: {
            imageUrl: result.generatedImageUrl!,
            thumbnailUrl: result.thumbnailUrl!,
            processingTime
          },
          createdAt: new Date().toISOString(),
          isPublic: false,
          likes: 0,
          downloads: 0
        });
      }

      return { success: true, data: result };

    } catch (error) {
      logger.error('Style transfer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '스타일 전이 실패'
      };
    }
  }

  /**
   * 텍스트-투-이미지 생성
   */
  async generateFromText(
    request: TextToImageRequest
  ): Promise<{ success: boolean; data?: GenerationResult; error?: string }> {
    try {
      // 프롬프트 검증
      if (!request.prompt || request.prompt.trim().length < 3) {
        return { success: false, error: '프롬프트는 3자 이상이어야 합니다.' };
      }

      const generationId = `txt2img_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // 스타일 정보
      const style = request.style ? this.availableStyles.get(request.style) : null;
      const processingTime = (style?.processingTime || 30) + Math.random() * 20;

      // Mock 이미지 생성
      const result = await this.mockTextToImage(request, generationId, processingTime);

      // 히스토리 저장
      if (request.userId) {
        await this.saveGenerationHistory({
          id: generationId,
          type: 'text_to_image',
          userId: request.userId,
          input: {
            prompt: request.prompt,
            style: request.style || 'default',
            parameters: {
              size: request.size || '512x512',
              quality: request.quality || 'standard',
              negativePrompt: request.negativePrompt
            }
          },
          output: {
            imageUrl: result.generatedImageUrl!,
            thumbnailUrl: result.thumbnailUrl!,
            processingTime
          },
          createdAt: new Date().toISOString(),
          isPublic: false,
          likes: 0,
          downloads: 0
        });
      }

      return { success: true, data: result };

    } catch (error) {
      logger.error('Text to image error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '이미지 생성 실패'
      };
    }
  }

  /**
   * 이미지 변형 생성
   */
  async generateImageVariations(
    request: ImageVariationRequest
  ): Promise<{ success: boolean; data?: GenerationResult[]; error?: string }> {
    try {
      const variationCount = Math.min(request.variationCount || 4, 8);
      const results: GenerationResult[] = [];

      for (let i = 0; i < variationCount; i++) {
        const generationId = `var_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`;
        const processingTime = 15 + Math.random() * 10;

        const result = await this.mockImageVariation(request, generationId, processingTime, i);
        results.push(result);

        // 히스토리 저장
        if (request.userId) {
          await this.saveGenerationHistory({
            id: generationId,
            type: 'image_variation',
            userId: request.userId,
            input: {
              sourceImage: request.sourceImageUrl,
              style: 'variation',
              parameters: {
                variationStrength: request.variationStrength || 50,
                variationIndex: i
              }
            },
            output: {
              imageUrl: result.generatedImageUrl!,
              thumbnailUrl: result.thumbnailUrl!,
              processingTime
            },
            createdAt: new Date().toISOString(),
            isPublic: false,
            likes: 0,
            downloads: 0
          });
        }
      }

      return { success: true, data: results };

    } catch (error) {
      logger.error('Image variations error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '이미지 변형 생성 실패'
      };
    }
  }

  /**
   * 사용자 생성 히스토리 조회
   */
  async getUserGenerationHistory(
    userId: string,
    limit: number = 20,
    type?: 'style_transfer' | 'text_to_image' | 'image_variation'
  ): Promise<{ success: boolean; data?: GenerationHistory[]; error?: string }> {
    try {
      if (!supabase) {
        return {
          success: true,
          data: this.generateMockHistory(userId, limit, type)
        };
      }

      let query = supabase
        .from('ai_generation_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (type) {
        query = query.eq('type', type);
      }

      const { data: history, error } = await query;

      if (error) throw error;

      const formattedHistory: GenerationHistory[] = history?.map(item => ({
        id: item.id,
        type: item.type,
        userId: item.user_id,
        input: item.input,
        output: item.output,
        createdAt: item.created_at,
        isPublic: item.is_public,
        likes: item.likes || 0,
        downloads: item.downloads || 0
      })) || [];

      return { success: true, data: formattedHistory };

    } catch (error) {
      logger.error('Get generation history error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '생성 히스토리 조회 실패'
      };
    }
  }

  /**
   * 인기 있는 생성 작품 조회
   */
  async getPopularGenerations(
    limit: number = 20,
    category?: string
  ): Promise<{ success: boolean; data?: GenerationHistory[]; error?: string }> {
    try {
      if (!supabase) {
        return {
          success: true,
          data: this.generateMockPopularGenerations(limit)
        };
      }

      let query = supabase
        .from('ai_generation_history')
        .select('*')
        .eq('is_public', true)
        .order('likes', { ascending: false })
        .limit(limit);

      const { data: popular, error } = await query;

      if (error) throw error;

      const formattedPopular: GenerationHistory[] = popular?.map(item => ({
        id: item.id,
        type: item.type,
        userId: item.user_id,
        input: item.input,
        output: item.output,
        createdAt: item.created_at,
        isPublic: item.is_public,
        likes: item.likes || 0,
        downloads: item.downloads || 0
      })) || [];

      return { success: true, data: formattedPopular };

    } catch (error) {
      logger.error('Get popular generations error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '인기 작품 조회 실패'
      };
    }
  }

  // Private helper methods

  private initializeStyles(): void {
    const styles: ArtStyle[] = [
      {
        id: 'van_gogh',
        name: '반 고흐 스타일',
        description: '반 고흐의 후기 인상주의 스타일로 변환',
        category: 'impressionist',
        thumbnailUrl: '/styles/van_gogh.jpg',
        popularityScore: 95,
        processingTime: 45,
        premiumOnly: false
      },
      {
        id: 'picasso_cubist',
        name: '피카소 큐비즘',
        description: '피카소의 큐비즘 스타일로 기하학적 변환',
        category: 'cubist',
        thumbnailUrl: '/styles/picasso.jpg',
        popularityScore: 88,
        processingTime: 40,
        premiumOnly: true
      },
      {
        id: 'monet_impressionist',
        name: '모네 인상파',
        description: '모네의 부드러운 인상파 스타일',
        category: 'impressionist',
        thumbnailUrl: '/styles/monet.jpg',
        popularityScore: 92,
        processingTime: 35,
        premiumOnly: false
      },
      {
        id: 'warhol_pop',
        name: '워홀 팝 아트',
        description: '앤디 워홀의 대중 예술 스타일',
        category: 'pop_art',
        thumbnailUrl: '/styles/warhol.jpg',
        popularityScore: 85,
        processingTime: 30,
        premiumOnly: false
      },
      {
        id: 'kandinsky_abstract',
        name: '칸딘스키 추상화',
        description: '칸딘스키의 추상 표현주의 스타일',
        category: 'abstract',
        thumbnailUrl: '/styles/kandinsky.jpg',
        popularityScore: 78,
        processingTime: 50,
        premiumOnly: true
      },
      {
        id: 'da_vinci_renaissance',
        name: '다 빈치 르네상스',
        description: '레오나르도 다 빈치의 고전 르네상스 스타일',
        category: 'classical',
        thumbnailUrl: '/styles/da_vinci.jpg',
        popularityScore: 90,
        processingTime: 55,
        premiumOnly: true
      },
      {
        id: 'banksy_street',
        name: '뱅크시 스트리트 아트',
        description: '뱅크시의 현대적 스트리트 아트 스타일',
        category: 'contemporary',
        thumbnailUrl: '/styles/banksy.jpg',
        popularityScore: 82,
        processingTime: 35,
        premiumOnly: false
      },
      {
        id: 'hokusai_ukiyo',
        name: '호쿠사이 우키요에',
        description: '일본 전통 우키요에 스타일',
        category: 'classical',
        thumbnailUrl: '/styles/hokusai.jpg',
        popularityScore: 87,
        processingTime: 40,
        premiumOnly: false
      }
    ];

    styles.forEach(style => {
      this.availableStyles.set(style.id, style);
    });
  }

  private async mockStyleTransfer(
    request: StyleTransferRequest,
    generationId: string,
    processingTime: number
  ): Promise<GenerationResult> {
    // Mock 처리 시간 시뮬레이션 (단축)
    await new Promise(resolve => setTimeout(resolve, Math.min(processingTime * 10, 500)));

    const style = this.availableStyles.get(request.targetStyle)!;

    return {
      id: generationId,
      status: 'completed',
      originalImageUrl: request.sourceImageUrl,
      generatedImageUrl: `https://generated-art.example.com/${generationId}_${request.targetStyle}.jpg`,
      thumbnailUrl: `https://generated-art.example.com/thumb/${generationId}_${request.targetStyle}.jpg`,
      metadata: {
        style: style.name,
        processingTime: Math.round(processingTime * 100) / 100,
        parameters: {
          intensity: request.intensity || 80,
          preserveColors: request.preserveColors || false,
          targetStyle: request.targetStyle
        }
      },
      createdAt: new Date().toISOString(),
      userId: request.userId
    };
  }

  private async mockTextToImage(
    request: TextToImageRequest,
    generationId: string,
    processingTime: number
  ): Promise<GenerationResult> {
    // Mock 처리 시간 시뮬레이션 (단축)
    await new Promise(resolve => setTimeout(resolve, Math.min(processingTime * 10, 1000)));

    return {
      id: generationId,
      status: 'completed',
      generatedImageUrl: `https://generated-art.example.com/txt2img/${generationId}.jpg`,
      thumbnailUrl: `https://generated-art.example.com/thumb/txt2img/${generationId}.jpg`,
      metadata: {
        prompt: request.prompt,
        style: request.style || 'default',
        processingTime: Math.round(processingTime * 100) / 100,
        parameters: {
          size: request.size || '512x512',
          quality: request.quality || 'standard',
          negativePrompt: request.negativePrompt
        }
      },
      createdAt: new Date().toISOString(),
      userId: request.userId
    };
  }

  private async mockImageVariation(
    request: ImageVariationRequest,
    generationId: string,
    processingTime: number,
    variationIndex: number
  ): Promise<GenerationResult> {
    // Mock 처리 시간 시뮬레이션 (단축)
    await new Promise(resolve => setTimeout(resolve, Math.min(processingTime * 10, 300)));

    return {
      id: generationId,
      status: 'completed',
      originalImageUrl: request.sourceImageUrl,
      generatedImageUrl: `https://generated-art.example.com/var/${generationId}_v${variationIndex}.jpg`,
      thumbnailUrl: `https://generated-art.example.com/thumb/var/${generationId}_v${variationIndex}.jpg`,
      metadata: {
        style: 'variation',
        processingTime: Math.round(processingTime * 100) / 100,
        parameters: {
          variationStrength: request.variationStrength || 50,
          variationIndex,
          sourceImage: request.sourceImageUrl
        }
      },
      createdAt: new Date().toISOString(),
      userId: request.userId
    };
  }

  private async saveGenerationHistory(history: GenerationHistory): Promise<void> {
    if (!supabase) {
      // Mock 모드에서는 메모리에만 저장
      return;
    }

    try {
      await supabase
        .from('ai_generation_history')
        .insert([{
          id: history.id,
          type: history.type,
          user_id: history.userId,
          input: history.input,
          output: history.output,
          created_at: history.createdAt,
          is_public: history.isPublic,
          likes: history.likes,
          downloads: history.downloads
        }]);
    } catch (error) {
      logger.error('Save generation history error:', error);
    }
  }

  private generateMockHistory(userId: string, limit: number, type?: string): GenerationHistory[] {
    const types = ['style_transfer', 'text_to_image', 'image_variation'];
    const styles = Array.from(this.availableStyles.keys());
    const prompts = [
      '아름다운 풍경화',
      '추상적인 도시 야경',
      '몽환적인 숲 속 장면',
      '미래적인 우주 정거장',
      '고요한 바다와 하늘'
    ];

    return Array.from({ length: limit }, (_, i) => {
      const historyType = type || types[Math.floor(Math.random() * types.length)];
      const selectedStyle = styles[Math.floor(Math.random() * styles.length)];
      
      return {
        id: `hist_${Date.now()}_${i}`,
        type: historyType as any,
        userId,
        input: {
          prompt: historyType === 'text_to_image' ? prompts[Math.floor(Math.random() * prompts.length)] : undefined,
          sourceImage: historyType !== 'text_to_image' ? `https://example.com/source_${i}.jpg` : undefined,
          style: selectedStyle,
          parameters: { intensity: 80, quality: 'standard' }
        },
        output: {
          imageUrl: `https://generated-art.example.com/hist_${i}.jpg`,
          thumbnailUrl: `https://generated-art.example.com/thumb/hist_${i}.jpg`,
          processingTime: Math.random() * 60 + 20
        },
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        isPublic: Math.random() > 0.7,
        likes: Math.floor(Math.random() * 50),
        downloads: Math.floor(Math.random() * 20)
      };
    });
  }

  private generateMockPopularGenerations(limit: number): GenerationHistory[] {
    return this.generateMockHistory('popular_user', limit)
      .map(item => ({ ...item, likes: Math.floor(Math.random() * 200) + 50, isPublic: true }))
      .sort((a, b) => b.likes - a.likes);
  }
}