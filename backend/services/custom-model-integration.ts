/**
 * 커스텀 AutoML 모델과 기존 Vision API 통합 서비스
 */

import { ArtworkAutoMLTrainer } from '../../ai-service/automl-trainer';
import { aiLogger } from '../../shared/logger';

export class CustomModelIntegration {
  private automlPredictor: ArtworkAutoMLTrainer | null = null;
  private modelName: string | null = null;

  constructor() {
    this.initializeCustomModel();
  }

  private async initializeCustomModel() {
    if (!process.env.AUTOML_PROJECT_ID || !process.env.AUTOML_MODEL_NAME) {
      aiLogger.info('🔧 AutoML 환경 변수가 설정되지 않음 - 기본 Vision API만 사용');
      return;
    }

    try {
      this.automlPredictor = new ArtworkAutoMLTrainer(
        process.env.AUTOML_PROJECT_ID,
        process.env.GOOGLE_APPLICATION_CREDENTIALS
      );
      this.modelName = process.env.AUTOML_MODEL_NAME;
      aiLogger.info('🎯 커스텀 AutoML 모델 초기화 완료');
    } catch (error) {
      aiLogger.error('❌ 커스텀 모델 초기화 실패:', error);
    }
  }

  /**
   * 하이브리드 분석: 기존 Vision API + 커스텀 모델
   */
  async hybridAnalysis(
    imageBuffer: Buffer,
    visionApiResults: any
  ): Promise<{
    standardAnalysis: any;
    customPredictions: any[];
    enhancedTags: string[];
    confidence: number;
  }> {
    let customPredictions: any[] = [];
    let enhancedTags: string[] = [];
    let confidence = 0;

    // 커스텀 모델이 있는 경우 추가 분석 수행
    if (this.automlPredictor && this.modelName) {
      try {
        customPredictions = await this.automlPredictor.predict(
          this.modelName,
          imageBuffer
        ) || [];

        // 커스텀 모델 결과를 기존 태그에 추가
        enhancedTags = this.combineTagsWithCustomPredictions(
          visionApiResults.tags || [],
          customPredictions
        );

        // 평균 신뢰도 계산
        confidence = this.calculateAverageConfidence(
          visionApiResults,
          customPredictions
        );

        aiLogger.info(`🎨 커스텀 모델 예측 완료: ${customPredictions.length}개 결과`);
      } catch (error) {
        aiLogger.error('❌ 커스텀 모델 예측 실패:', error);
        // 실패해도 기존 분석 결과는 반환
      }
    }

    return {
      standardAnalysis: visionApiResults,
      customPredictions,
      enhancedTags: enhancedTags.length > 0 ? enhancedTags : visionApiResults.tags || [],
      confidence
    };
  }

  /**
   * 기존 태그와 커스텀 예측 결과 결합
   */
  private combineTagsWithCustomPredictions(
    standardTags: string[],
    customPredictions: any[]
  ): string[] {
    const enhancedTags = [...standardTags];
    
    // 커스텀 모델의 고신뢰도 예측만 추가 (0.7 이상)
    customPredictions.forEach(prediction => {
      if (prediction.classification?.score && prediction.classification.score > 0.7) {
        const tag = prediction.displayName;
        if (!enhancedTags.includes(tag)) {
          enhancedTags.push(tag);
        }
      }
    });

    return enhancedTags;
  }

  /**
   * 평균 신뢰도 계산
   */
  private calculateAverageConfidence(
    visionResults: any,
    customPredictions: any[]
  ): number {
    let totalConfidence = 0;
    let count = 0;

    // Vision API 신뢰도
    if (visionResults.confidence) {
      totalConfidence += visionResults.confidence;
      count++;
    }

    // 커스텀 모델 신뢰도
    customPredictions.forEach(prediction => {
      if (prediction.classification?.score) {
        totalConfidence += prediction.classification.score;
        count++;
      }
    });

    return count > 0 ? totalConfidence / count : 0;
  }

  /**
   * 예술 스타일 특화 분석
   */
  async analyzeArtStyle(imageBuffer: Buffer): Promise<{
    style: string;
    period: string;
    confidence: number;
    characteristics: string[];
  }> {
    if (!this.automlPredictor || !this.modelName) {
      return {
        style: 'unknown',
        period: 'unknown',
        confidence: 0,
        characteristics: []
      };
    }

    try {
      const predictions = await this.automlPredictor.predict(
        this.modelName,
        imageBuffer
      ) || [];

      // 스타일 관련 예측 필터링
      const styleKeywords = [
        'impressionism', 'cubism', 'abstract', 'realism', 'surrealism',
        'expressionism', 'pop_art', 'minimalism', 'baroque', 'renaissance'
      ];

      const stylePredictions = predictions.filter(p => 
        styleKeywords.some(keyword => 
          p.displayName?.toLowerCase().includes(keyword)
        )
      );

      if (stylePredictions.length === 0) {
        return {
          style: 'contemporary',
          period: 'modern',
          confidence: 0.5,
          characteristics: []
        };
      }

      // 가장 높은 신뢰도의 스타일 선택
      const topStyle = stylePredictions.reduce((prev, current) => 
        (current.classification?.score || 0) > (prev.classification?.score || 0) 
          ? current : prev
      );

      return {
        style: topStyle.displayName || 'unknown',
        period: this.mapStyleToPeriod(topStyle.displayName || ''),
        confidence: topStyle.classification?.score || 0,
        characteristics: stylePredictions.map(p => p.displayName).filter(Boolean)
      };

    } catch (error) {
      aiLogger.error('❌ 예술 스타일 분석 실패:', error);
      return {
        style: 'unknown',
        period: 'unknown',
        confidence: 0,
        characteristics: []
      };
    }
  }

  /**
   * 스타일을 시대로 매핑
   */
  private mapStyleToPeriod(style: string): string {
    const stylePeriodMap: { [key: string]: string } = {
      'renaissance': 'Renaissance',
      'baroque': 'Baroque',
      'impressionism': '19th Century',
      'cubism': 'Early Modern',
      'surrealism': 'Modern',
      'abstract': 'Modern',
      'pop_art': 'Contemporary',
      'minimalism': 'Contemporary'
    };

    return stylePeriodMap[style.toLowerCase()] || 'Contemporary';
  }

  /**
   * 모델 성능 모니터링
   */
  getModelStatus(): {
    isActive: boolean;
    modelName: string | null;
    lastPrediction: Date | null;
  } {
    return {
      isActive: this.automlPredictor !== null,
      modelName: this.modelName,
      lastPrediction: null // 실제 구현에서는 마지막 예측 시간 추적
    };
  }
}

// 싱글톤 인스턴스
export const customModelIntegration = new CustomModelIntegration();