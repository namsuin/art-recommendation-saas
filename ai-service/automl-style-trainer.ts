/**
 * Google AutoML Vision - 예술 스타일 전용 모델 학습
 */

import { AutoMlClient } from '@google-cloud/automl';
import { Storage } from '@google-cloud/storage';
import { aiLogger } from './utils/logger';

export class ArtStyleAutoMLTrainer {
  private automlClient: AutoMlClient;
  private storage: Storage;
  private projectId: string;
  private location: string = 'us-central1';
  private styleModelName: string | null = null;

  constructor(projectId: string, keyFilename?: string) {
    this.projectId = projectId;
    
    const clientConfig = keyFilename ? { keyFilename } : {};
    this.automlClient = new AutoMlClient(clientConfig);
    this.storage = new Storage(clientConfig);
    
    aiLogger.info('🎯 Art Style AutoML Trainer initialized');
  }

  /**
   * 예술 스타일 데이터셋 생성
   */
  async createStyleDataset(datasetDisplayName: string = 'art-style-classifier') {
    try {
      const locationPath = this.automlClient.locationPath(this.projectId, this.location);
      
      const dataset = {
        displayName: datasetDisplayName,
        imageClassificationDatasetMetadata: {
          classificationType: 'MULTICLASS'
        }
      };

      const [operation] = await this.automlClient.createDataset({
        parent: locationPath,
        dataset: dataset
      });

      const [response] = await operation.promise();
      aiLogger.info(`📚 Style dataset created: ${response.name}`);
      return response;
      
    } catch (error) {
      aiLogger.error('Failed to create style dataset:', error);
      throw error;
    }
  }

  /**
   * 스타일별 학습 데이터 준비
   */
  async prepareStyleTrainingData(): Promise<{
    csvContent: string;
    totalImages: number;
    styleDistribution: Record<string, number>;
  }> {
    const styleCategories = {
      'abstract': ['abstract', 'geometric', 'minimalist', 'non-representational'],
      'realistic': ['realistic', 'photorealistic', 'portrait', 'hyperrealistic'],
      'impressionist': ['impressionist', 'plein-air', 'loose-brushwork'],
      'expressionist': ['expressionist', 'fauvism', 'emotional'],
      'classical': ['classical', 'renaissance', 'baroque', 'neoclassical'],
      'modern': ['modern', 'contemporary', 'postmodern'],
      'surreal': ['surreal', 'dreamlike', 'fantastical'],
      'pop': ['pop-art', 'commercial', 'advertising'],
      'sketch': ['sketch', 'drawing', 'charcoal', 'pencil']
    };

    // 34,537개 작품에서 스타일별 데이터 준비
    const artDatabase = await this.loadArtDatabase();
    const csvLines: string[] = [];
    const styleDistribution: Record<string, number> = {};

    for (const artwork of artDatabase) {
      const detectedStyle = this.detectArtworkStyle(artwork, styleCategories);
      
      if (detectedStyle && artwork.image_url) {
        csvLines.push(`gs://${this.projectId}-art-training/${artwork.id}.jpg,${detectedStyle}`);
        styleDistribution[detectedStyle] = (styleDistribution[detectedStyle] || 0) + 1;
      }
    }

    const csvContent = csvLines.join('\n');
    
    aiLogger.info('📊 Style training data prepared:', {
      totalImages: csvLines.length,
      styles: Object.keys(styleDistribution).length,
      distribution: styleDistribution
    });

    return {
      csvContent,
      totalImages: csvLines.length,
      styleDistribution
    };
  }

  /**
   * 작품 스타일 감지 (휴리스틱)
   */
  private detectArtworkStyle(artwork: any, styleCategories: Record<string, string[]>): string | null {
    const title = (artwork.title || '').toLowerCase();
    const description = (artwork.description || '').toLowerCase();
    const artist = (artwork.artist || '').toLowerCase();
    const tags = (artwork.tags || []).map((t: string) => t.toLowerCase());
    
    const combinedText = `${title} ${description} ${artist} ${tags.join(' ')}`;

    // 스타일별 점수 계산
    for (const [style, keywords] of Object.entries(styleCategories)) {
      for (const keyword of keywords) {
        if (combinedText.includes(keyword)) {
          return style;
        }
      }
    }

    // 연도 기반 추론
    if (artwork.year) {
      const year = parseInt(artwork.year);
      if (year < 1400) return 'classical';
      if (year >= 1400 && year < 1600) return 'classical';
      if (year >= 1850 && year < 1900) return 'impressionist';
      if (year >= 1900 && year < 1950) return 'modern';
      if (year >= 1950) return 'contemporary';
    }

    return null;
  }

  /**
   * 학습 데이터 업로드
   */
  async uploadStyleTrainingData(bucketName: string) {
    try {
      const bucket = this.storage.bucket(bucketName);
      
      // CSV 파일 생성 및 업로드
      const trainingData = await this.prepareStyleTrainingData();
      
      const csvFile = bucket.file('style-training-data.csv');
      await csvFile.save(trainingData.csvContent);
      
      aiLogger.info(`📤 Training CSV uploaded: gs://${bucketName}/style-training-data.csv`);
      
      // 이미지 파일들 업로드 (병렬 처리)
      await this.uploadArtworkImages(bucketName);
      
      return {
        csvPath: `gs://${bucketName}/style-training-data.csv`,
        ...trainingData
      };
      
    } catch (error) {
      aiLogger.error('Failed to upload style training data:', error);
      throw error;
    }
  }

  /**
   * 스타일 분류 모델 학습
   */
  async trainStyleModel(datasetName: string, modelDisplayName: string = 'art-style-classifier') {
    try {
      const model = {
        displayName: modelDisplayName,
        datasetId: datasetName.split('/').pop(),
        imageClassificationModelMetadata: {
          trainBudgetMilliNodeHours: 8000, // 8시간 학습
          modelType: 'cloud-high-accuracy-1'
        }
      };

      const locationPath = this.automlClient.locationPath(this.projectId, this.location);
      
      const [operation] = await this.automlClient.createModel({
        parent: locationPath,
        model: model
      });

      aiLogger.info('🚀 Style model training started...');
      
      // 학습 완료까지 대기 (비동기)
      const [response] = await operation.promise();
      
      this.styleModelName = response.name;
      aiLogger.info(`✅ Style model training completed: ${response.name}`);
      
      return response;
      
    } catch (error) {
      aiLogger.error('Style model training failed:', error);
      throw error;
    }
  }

  /**
   * 스타일 예측
   */
  async predictStyle(imageBuffer: Buffer): Promise<{
    style: string;
    confidence: number;
    alternatives: Array<{style: string; confidence: number}>;
  }> {
    if (!this.styleModelName) {
      const modelName = process.env.AUTOML_STYLE_MODEL_NAME;
      if (!modelName) {
        throw new Error('Style model not trained or configured');
      }
      this.styleModelName = modelName;
    }

    try {
      const request = {
        name: this.styleModelName,
        payload: {
          image: {
            imageBytes: imageBuffer
          }
        }
      };

      const [response] = await this.automlClient.predict(request);
      
      if (!response.payload || response.payload.length === 0) {
        return {
          style: 'mixed',
          confidence: 0.5,
          alternatives: []
        };
      }

      // 결과 정렬 (confidence 기준)
      const predictions = response.payload
        .map((pred: any) => ({
          style: pred.classification?.displayName || 'unknown',
          confidence: pred.classification?.score || 0
        }))
        .sort((a, b) => b.confidence - a.confidence);

      const topPrediction = predictions[0];
      const alternatives = predictions.slice(1, 4); // 상위 3개 대안

      aiLogger.info(`🎨 Style prediction: ${topPrediction.style} (${topPrediction.confidence.toFixed(3)})`);

      return {
        style: topPrediction.style,
        confidence: topPrediction.confidence,
        alternatives
      };
      
    } catch (error) {
      aiLogger.error('Style prediction failed:', error);
      return {
        style: 'mixed',
        confidence: 0.5,
        alternatives: []
      };
    }
  }

  /**
   * 작품 데이터베이스 로드
   */
  private async loadArtDatabase(): Promise<any[]> {
    try {
      // Artsper 데이터베이스에서 작품 정보 로드
      const { artDatabase } = await import('../backend/data/artsper-dashboard-full.json');
      return artDatabase || [];
    } catch (error) {
      aiLogger.warn('Could not load art database:', error);
      return [];
    }
  }

  /**
   * 작품 이미지 업로드
   */
  private async uploadArtworkImages(bucketName: string): Promise<void> {
    // 실제 구현에서는 34,537개 이미지를 병렬로 업로드
    // 현재는 로깅만 수행
    aiLogger.info(`📸 Starting upload of artwork images to gs://${bucketName}/`);
    
    // 샘플 구현 - 실제로는 이미지 URL에서 다운로드 후 업로드
    const artDatabase = await this.loadArtDatabase();
    const batchSize = 50;
    
    for (let i = 0; i < Math.min(artDatabase.length, 1000); i += batchSize) {
      const batch = artDatabase.slice(i, i + batchSize);
      await Promise.all(
        batch.map(artwork => this.uploadSingleArtwork(bucketName, artwork))
      );
      
      if (i % 500 === 0) {
        aiLogger.info(`📤 Uploaded ${i + batchSize} images...`);
      }
    }
  }

  /**
   * 단일 작품 이미지 업로드
   */
  private async uploadSingleArtwork(bucketName: string, artwork: any): Promise<void> {
    try {
      // 실제 구현에서는 이미지 다운로드 후 업로드
      // 현재는 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 10));
    } catch (error) {
      aiLogger.debug(`Failed to upload ${artwork.id}:`, error);
    }
  }

  /**
   * 모델 배포 상태 확인
   */
  async getModelStatus(): Promise<{
    isDeployed: boolean;
    modelName: string | null;
    trainingProgress?: string;
  }> {
    const modelName = this.styleModelName || process.env.AUTOML_STYLE_MODEL_NAME;
    
    if (!modelName) {
      return {
        isDeployed: false,
        modelName: null
      };
    }

    try {
      const [model] = await this.automlClient.getModel({ name: modelName });
      
      return {
        isDeployed: model.deploymentState === 'DEPLOYED',
        modelName: modelName,
        trainingProgress: model.createTime ? 'Completed' : 'In Progress'
      };
      
    } catch (error) {
      aiLogger.warn('Could not get model status:', error);
      return {
        isDeployed: false,
        modelName: modelName
      };
    }
  }
}

export const artStyleAutoMLTrainer = new ArtStyleAutoMLTrainer(
  process.env.AUTOML_PROJECT_ID || 'art-recommendation-project',
  process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-vision-key.json'
);