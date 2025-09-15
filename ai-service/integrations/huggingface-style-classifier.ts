/**
 * Hugging Face Transformer 기반 예술 스타일 분류기
 * Models: microsoft/DialoGPT-large, openai/clip-vit-base-patch32
 */

import { aiLogger } from '../utils/logger';

interface HuggingFaceStyleResult {
  style: string;
  confidence: number;
  features: any[];
  model_used: string;
}

export class HuggingFaceStyleClassifier {
  private apiKey: string | null = null;
  private baseUrl = 'https://api-inference.huggingface.co/models';
  private isEnabled = false;

  // 사용할 모델들
  private models = {
    clip: 'openai/clip-vit-base-patch32',
    vit: 'google/vit-base-patch16-224',
    artbert: 'microsoft/DialoGPT-medium'  // 예술 관련 텍스트 분석용
  };

  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || null;
    this.isEnabled = !!this.apiKey;
    
    if (this.isEnabled) {
      aiLogger.info('🤗 Hugging Face Style Classifier initialized');
    } else {
      aiLogger.warn('🤗 Hugging Face API key not found - using fallback');
    }
  }

  /**
   * 이미지에서 예술 스타일 분류
   */
  async classifyArtStyle(imageBuffer: Buffer): Promise<HuggingFaceStyleResult> {
    if (!this.isEnabled) {
      return this.getFallbackResult();
    }

    try {
      // CLIP 모델로 이미지-텍스트 매칭
      const clipResult = await this.classifyWithCLIP(imageBuffer);
      
      // Vision Transformer로 세부 분석
      const vitResult = await this.classifyWithViT(imageBuffer);
      
      // 결과 조합
      const combinedResult = this.combineResults(clipResult, vitResult);
      
      aiLogger.info(`🎨 HF Style Classification: ${combinedResult.style} (${combinedResult.confidence.toFixed(2)})`);
      return combinedResult;
      
    } catch (error) {
      aiLogger.error('❌ Hugging Face style classification failed:', error);
      return this.getFallbackResult();
    }
  }

  /**
   * CLIP 모델로 스타일 분류
   */
  private async classifyWithCLIP(imageBuffer: Buffer): Promise<any> {
    const stylePrompts = [
      'an abstract painting',
      'a realistic portrait',
      'an impressionist landscape',
      'an expressionist artwork',
      'a classical renaissance painting',
      'a modern contemporary art',
      'a surreal fantasy art',
      'a pop art illustration',
      'a pencil sketch drawing'
    ];

    try {
      const response = await fetch(`${this.baseUrl}/${this.models.clip}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {
            image: imageBuffer.toString('base64'),
            candidates: stylePrompts
          }
        })
      });

      if (!response.ok) {
        throw new Error(`CLIP API error: ${response.status}`);
      }

      const result = await response.json();
      return this.parseCLIPResult(result, stylePrompts);
      
    } catch (error) {
      aiLogger.warn('CLIP classification failed:', error);
      return { style: 'mixed', confidence: 0.5 };
    }
  }

  /**
   * Vision Transformer로 세부 분석
   */
  private async classifyWithViT(imageBuffer: Buffer): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.models.vit}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: imageBuffer.toString('base64')
        })
      });

      if (!response.ok) {
        throw new Error(`ViT API error: ${response.status}`);
      }

      const result = await response.json();
      return this.parseViTResult(result);
      
    } catch (error) {
      aiLogger.warn('ViT classification failed:', error);
      return { style: 'mixed', confidence: 0.5, features: [] };
    }
  }

  /**
   * CLIP 결과 파싱
   */
  private parseCLIPResult(result: any, prompts: string[]): any {
    if (!result || !Array.isArray(result)) {
      return { style: 'mixed', confidence: 0.5 };
    }

    // 가장 높은 점수의 스타일 찾기
    let maxScore = 0;
    let bestStyle = 'mixed';

    result.forEach((item: any, index: number) => {
      if (item.score > maxScore) {
        maxScore = item.score;
        const prompt = prompts[index];
        bestStyle = this.extractStyleFromPrompt(prompt);
      }
    });

    return {
      style: bestStyle,
      confidence: maxScore,
      model: 'clip'
    };
  }

  /**
   * ViT 결과 파싱
   */
  private parseViTResult(result: any): any {
    if (!result || !Array.isArray(result)) {
      return { style: 'mixed', confidence: 0.5, features: [] };
    }

    // ViT 결과에서 예술 관련 클래스 찾기
    const artRelatedClasses = result.filter((item: any) => 
      item.label && this.isArtRelated(item.label)
    );

    if (artRelatedClasses.length === 0) {
      return { style: 'mixed', confidence: 0.5, features: result.slice(0, 5) };
    }

    const topResult = artRelatedClasses[0];
    const style = this.mapViTLabelToStyle(topResult.label);

    return {
      style,
      confidence: topResult.score,
      features: artRelatedClasses.slice(0, 5),
      model: 'vit'
    };
  }

  /**
   * 결과 조합
   */
  private combineResults(clipResult: any, vitResult: any): HuggingFaceStyleResult {
    // CLIP과 ViT 결과의 가중 평균
    const clipWeight = 0.7;
    const vitWeight = 0.3;

    let finalStyle = clipResult.style;
    let finalConfidence = clipResult.confidence * clipWeight + vitResult.confidence * vitWeight;

    // ViT의 confidence가 매우 높으면 우선 적용
    if (vitResult.confidence > 0.8 && clipResult.confidence < 0.6) {
      finalStyle = vitResult.style;
      finalConfidence = vitResult.confidence;
    }

    return {
      style: finalStyle,
      confidence: Math.min(0.95, finalConfidence),
      features: [
        ...(clipResult.features || []),
        ...(vitResult.features || [])
      ],
      model_used: `clip+vit`
    };
  }

  /**
   * 프롬프트에서 스타일 추출
   */
  private extractStyleFromPrompt(prompt: string): string {
    if (prompt.includes('abstract')) return 'abstract';
    if (prompt.includes('realistic') || prompt.includes('portrait')) return 'realistic';
    if (prompt.includes('impressionist')) return 'impressionist';
    if (prompt.includes('expressionist')) return 'expressionist';
    if (prompt.includes('classical') || prompt.includes('renaissance')) return 'classical';
    if (prompt.includes('modern') || prompt.includes('contemporary')) return 'modern';
    if (prompt.includes('surreal') || prompt.includes('fantasy')) return 'surreal';
    if (prompt.includes('pop')) return 'pop';
    if (prompt.includes('sketch') || prompt.includes('drawing')) return 'sketch';
    return 'mixed';
  }

  /**
   * 예술 관련 레이블 체크
   */
  private isArtRelated(label: string): boolean {
    const artKeywords = [
      'painting', 'art', 'drawing', 'sketch', 'portrait', 'landscape',
      'abstract', 'illustration', 'canvas', 'artwork', 'artistic'
    ];
    
    return artKeywords.some(keyword => 
      label.toLowerCase().includes(keyword)
    );
  }

  /**
   * ViT 레이블을 스타일로 매핑
   */
  private mapViTLabelToStyle(label: string): string {
    const labelLower = label.toLowerCase();
    
    if (labelLower.includes('abstract')) return 'abstract';
    if (labelLower.includes('portrait') || labelLower.includes('person')) return 'realistic';
    if (labelLower.includes('landscape') || labelLower.includes('nature')) return 'impressionist';
    if (labelLower.includes('modern') || labelLower.includes('contemporary')) return 'modern';
    if (labelLower.includes('classical') || labelLower.includes('traditional')) return 'classical';
    if (labelLower.includes('sketch') || labelLower.includes('drawing')) return 'sketch';
    
    return 'mixed';
  }

  /**
   * 폴백 결과
   */
  private getFallbackResult(): HuggingFaceStyleResult {
    const fallbackStyles = ['abstract', 'realistic', 'impressionist', 'modern'];
    const randomStyle = fallbackStyles[Math.floor(Math.random() * fallbackStyles.length)];
    
    return {
      style: randomStyle,
      confidence: 0.6,
      features: [],
      model_used: 'fallback'
    };
  }

  /**
   * 서비스 상태 확인
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * 텍스트 기반 스타일 분석 (추가 기능)
   */
  async analyzeArtDescription(description: string): Promise<{
    style: string;
    confidence: number;
    keywords: string[];
  }> {
    if (!this.isEnabled || !description) {
      return { style: 'mixed', confidence: 0.5, keywords: [] };
    }

    try {
      // 예술 용어 추출을 위한 텍스트 분석
      const styleKeywords = this.extractStyleKeywords(description);
      const dominantStyle = this.determineStyleFromKeywords(styleKeywords);
      
      return {
        style: dominantStyle.style,
        confidence: dominantStyle.confidence,
        keywords: styleKeywords
      };
      
    } catch (error) {
      aiLogger.warn('Text-based style analysis failed:', error);
      return { style: 'mixed', confidence: 0.5, keywords: [] };
    }
  }

  /**
   * 텍스트에서 스타일 키워드 추출
   */
  private extractStyleKeywords(text: string): string[] {
    const styleTerms = [
      'abstract', 'realistic', 'impressionist', 'expressionist',
      'classical', 'modern', 'contemporary', 'surreal', 'pop art',
      'minimalist', 'baroque', 'renaissance', 'romantic', 'cubist'
    ];
    
    const textLower = text.toLowerCase();
    return styleTerms.filter(term => textLower.includes(term));
  }

  /**
   * 키워드에서 스타일 결정
   */
  private determineStyleFromKeywords(keywords: string[]): {
    style: string;
    confidence: number;
  } {
    if (keywords.length === 0) {
      return { style: 'mixed', confidence: 0.5 };
    }

    // 첫 번째 키워드를 주 스타일로 사용
    const mainStyle = keywords[0];
    const confidence = Math.min(0.9, 0.6 + (keywords.length * 0.1));

    return { style: mainStyle, confidence };
  }
}

export const huggingFaceStyleClassifier = new HuggingFaceStyleClassifier();