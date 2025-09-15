/**
 * 독립적인 AutoML 서비스 - 메인 서버와 분리
 */

import { ArtworkAutoMLTrainer } from './automl-trainer';

export class StandaloneAutoMLService {
  private trainer: ArtworkAutoMLTrainer | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.initializeIfEnabled();
  }

  private async initializeIfEnabled() {
    // 환경 변수로 활성화 제어
    if (process.env.USE_CUSTOM_MODEL === 'true' && 
        process.env.AUTOML_PROJECT_ID && 
        process.env.AUTOML_MODEL_NAME) {
      
      try {
        this.trainer = new ArtworkAutoMLTrainer(
          process.env.AUTOML_PROJECT_ID,
          process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-vision-key.json'
        );
        this.isEnabled = true;
        console.log('🎯 Standalone AutoML Service initialized');
      } catch (error) {
        console.warn('⚠️ AutoML initialization failed, using fallback:', error);
        this.isEnabled = false;
      }
    }
  }

  /**
   * 안전한 예측 - 실패 시 기본값 반환
   */
  async safePrediction(imageBuffer: Buffer): Promise<{
    predictions: any[];
    confidence: number;
    isCustomModel: boolean;
  }> {
    if (!this.isEnabled || !this.trainer || !process.env.AUTOML_MODEL_NAME) {
      return {
        predictions: [],
        confidence: 0,
        isCustomModel: false
      };
    }

    try {
      const predictions = await this.trainer.predict(
        process.env.AUTOML_MODEL_NAME,
        imageBuffer
      ) || [];

      const confidence = predictions.length > 0 
        ? predictions.reduce((sum, p) => sum + (p.classification?.score || 0), 0) / predictions.length
        : 0;

      return {
        predictions,
        confidence,
        isCustomModel: true
      };
    } catch (error) {
      console.warn('⚠️ Custom model prediction failed:', error);
      return {
        predictions: [],
        confidence: 0,
        isCustomModel: false
      };
    }
  }

  getStatus() {
    return {
      enabled: this.isEnabled,
      modelName: process.env.AUTOML_MODEL_NAME || null,
      projectId: process.env.AUTOML_PROJECT_ID || null
    };
  }
}

// 싱글톤 인스턴스
export const standaloneAutoML = new StandaloneAutoMLService();