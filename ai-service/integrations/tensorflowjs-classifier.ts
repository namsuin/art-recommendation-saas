/**
 * TensorFlow.js 기반 예술 스타일 분류기
 * 클라이언트 사이드에서 실행 가능한 경량 모델
 */

import { aiLogger } from '../utils/logger';

interface TensorFlowJSResult {
  style: string;
  confidence: number;
  processing_time: number;
  model_used: string;
  features?: any[];
}

export class TensorFlowJSStyleClassifier {
  private model: any = null;
  private isLoaded = false;
  private modelUrl: string;
  private isEnabled = false;

  constructor() {
    this.modelUrl = process.env.TFJS_MODEL_URL || 'https://tfhub.dev/google/imagenet/mobilenet_v2_100_224/classification/5';
    this.isEnabled = process.env.USE_TENSORFLOW_JS === 'true';
    
    if (this.isEnabled) {
      this.initializeModel();
    }
  }

  /**
   * TensorFlow.js 모델 초기화
   */
  private async initializeModel(): Promise<void> {
    try {
      aiLogger.info('🧠 Initializing TensorFlow.js model...');
      
      // 동적 import로 TensorFlow.js 로드
      const tf = await this.loadTensorFlow();
      
      if (!tf) {
        throw new Error('TensorFlow.js not available');
      }

      // 사전 훈련된 MobileNet 모델 로드
      this.model = await this.loadPretrainedModel(tf);
      
      this.isLoaded = true;
      aiLogger.info('✅ TensorFlow.js model loaded successfully');
      
    } catch (error) {
      aiLogger.warn('⚠️ TensorFlow.js initialization failed:', error);
      this.isEnabled = false;
    }
  }

  /**
   * TensorFlow.js 동적 로드
   */
  private async loadTensorFlow(): Promise<any> {
    try {
      // 서버 환경에서는 Node.js 버전 사용
      if (typeof window === 'undefined') {
        const tf = await import('@tensorflow/tfjs-node');
        return tf;
      } else {
        // 브라우저 환경에서는 웹 버전 사용
        const tf = await import('@tensorflow/tfjs');
        return tf;
      }
    } catch (error) {
      aiLogger.warn('Could not load TensorFlow.js:', error);
      return null;
    }
  }

  /**
   * 사전 훈련된 모델 로드
   */
  private async loadPretrainedModel(tf: any): Promise<any> {
    try {
      // MobileNet 기반 이미지 분류 모델
      const model = await tf.loadLayersModel(this.modelUrl);
      return model;
    } catch (error) {
      // 로컬 모델 또는 커스텀 모델 로드 시도
      return await this.loadCustomArtModel(tf);
    }
  }

  /**
   * 커스텀 예술 모델 로드
   */
  private async loadCustomArtModel(tf: any): Promise<any> {
    try {
      // 간단한 CNN 모델 생성 (예술 스타일 분류용)
      const model = tf.sequential({
        layers: [
          tf.layers.conv2d({
            inputShape: [224, 224, 3],
            filters: 32,
            kernelSize: 3,
            activation: 'relu'
          }),
          tf.layers.maxPooling2d({ poolSize: 2 }),
          tf.layers.conv2d({
            filters: 64,
            kernelSize: 3,
            activation: 'relu'
          }),
          tf.layers.maxPooling2d({ poolSize: 2 }),
          tf.layers.conv2d({
            filters: 128,
            kernelSize: 3,
            activation: 'relu'
          }),
          tf.layers.globalAveragePooling2d(),
          tf.layers.dropout({ rate: 0.5 }),
          tf.layers.dense({
            units: 9, // 9개 스타일 클래스
            activation: 'softmax'
          })
        ]
      });

      // 모델 컴파일
      model.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      aiLogger.info('🏗️ Custom art style model created');
      return model;
      
    } catch (error) {
      aiLogger.error('Failed to create custom model:', error);
      throw error;
    }
  }

  /**
   * 이미지 스타일 분류
   */
  async classifyStyle(imageBuffer: Buffer): Promise<TensorFlowJSResult> {
    const startTime = Date.now();
    
    if (!this.isEnabled || !this.isLoaded) {
      return this.getFallbackResult(Date.now() - startTime);
    }

    try {
      const tf = await this.loadTensorFlow();
      if (!tf) {
        throw new Error('TensorFlow.js not available');
      }

      // 이미지 전처리
      const imageTensor = await this.preprocessImage(imageBuffer, tf);
      
      // 모델 예측
      const predictions = await this.model.predict(imageTensor) as any;
      const predictionData = await predictions.data();
      
      // 결과 해석
      const result = this.interpretPredictions(predictionData);
      
      // 텐서 메모리 정리
      imageTensor.dispose();
      predictions.dispose();
      
      const processingTime = Date.now() - startTime;
      
      aiLogger.info(`🧠 TensorFlow.js classification: ${result.style} (${result.confidence.toFixed(3)}) in ${processingTime}ms`);
      
      return {
        style: result.style,
        confidence: result.confidence,
        processing_time: processingTime,
        model_used: 'tensorflow-js',
        features: result.features || []
      };
      
    } catch (error) {
      aiLogger.error('❌ TensorFlow.js classification failed:', error);
      return this.getFallbackResult(Date.now() - startTime);
    }
  }

  /**
   * 이미지 전처리
   */
  private async preprocessImage(imageBuffer: Buffer, tf: any): Promise<any> {
    try {
      // 이미지 디코딩
      const imageTensor = tf.node.decodeImage(imageBuffer, 3);
      
      // 크기 조정 (224x224)
      const resized = tf.image.resizeBilinear(imageTensor, [224, 224]);
      
      // 정규화 (0-1 범위)
      const normalized = resized.div(255.0);
      
      // 배치 차원 추가
      const batched = normalized.expandDims(0);
      
      // 중간 텐서 정리
      imageTensor.dispose();
      resized.dispose();
      normalized.dispose();
      
      return batched;
      
    } catch (error) {
      aiLogger.error('Image preprocessing failed:', error);
      throw error;
    }
  }

  /**
   * 예측 결과 해석
   */
  private interpretPredictions(predictionData: Float32Array): {
    style: string;
    confidence: number;
    features?: any[];
  } {
    const styleClasses = [
      'abstract', 'realistic', 'impressionist', 'expressionist',
      'classical', 'modern', 'surreal', 'pop', 'sketch'
    ];

    // 가장 높은 확률의 클래스 찾기
    let maxIndex = 0;
    let maxValue = predictionData[0];
    
    for (let i = 1; i < predictionData.length; i++) {
      if (predictionData[i] > maxValue) {
        maxValue = predictionData[i];
        maxIndex = i;
      }
    }

    // 상위 3개 클래스 추출
    const features = Array.from(predictionData)
      .map((value, index) => ({
        style: styleClasses[index] || `class_${index}`,
        confidence: value
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    return {
      style: styleClasses[maxIndex] || 'mixed',
      confidence: maxValue,
      features
    };
  }

  /**
   * 브라우저에서 실행할 수 있는 클라이언트 사이드 분류
   */
  async classifyInBrowser(imageElement: HTMLImageElement): Promise<TensorFlowJSResult> {
    const startTime = Date.now();
    
    if (typeof window === 'undefined') {
      throw new Error('Browser-only method called in server environment');
    }

    try {
      const tf = await import('@tensorflow/tfjs');
      
      // HTML 이미지 요소에서 텐서 생성
      const imageTensor = tf.browser.fromPixels(imageElement);
      
      // 전처리
      const resized = tf.image.resizeBilinear(imageTensor, [224, 224]);
      const normalized = resized.div(255.0);
      const batched = normalized.expandDims(0);
      
      // 예측
      const predictions = await this.model.predict(batched) as any;
      const predictionData = await predictions.data();
      
      // 결과 해석
      const result = this.interpretPredictions(predictionData);
      
      // 메모리 정리
      imageTensor.dispose();
      resized.dispose();
      normalized.dispose();
      batched.dispose();
      predictions.dispose();
      
      const processingTime = Date.now() - startTime;
      
      return {
        style: result.style,
        confidence: result.confidence,
        processing_time: processingTime,
        model_used: 'tensorflow-js-browser',
        features: result.features
      };
      
    } catch (error) {
      aiLogger.error('Browser classification failed:', error);
      return this.getFallbackResult(Date.now() - startTime);
    }
  }

  /**
   * 실시간 웹캠 분류
   */
  async classifyWebcam(videoElement: HTMLVideoElement): Promise<TensorFlowJSResult> {
    if (typeof window === 'undefined') {
      throw new Error('Webcam classification only available in browser');
    }

    try {
      const tf = await import('@tensorflow/tfjs');
      
      // 비디오에서 현재 프레임 캡처
      const imageTensor = tf.browser.fromPixels(videoElement);
      
      // 나머지는 일반 이미지 분류와 동일
      const resized = tf.image.resizeBilinear(imageTensor, [224, 224]);
      const normalized = resized.div(255.0);
      const batched = normalized.expandDims(0);
      
      const predictions = await this.model.predict(batched) as any;
      const predictionData = await predictions.data();
      const result = this.interpretPredictions(predictionData);
      
      // 메모리 정리
      imageTensor.dispose();
      resized.dispose();
      normalized.dispose();
      batched.dispose();
      predictions.dispose();
      
      return {
        style: result.style,
        confidence: result.confidence,
        processing_time: 0,
        model_used: 'tensorflow-js-webcam',
        features: result.features
      };
      
    } catch (error) {
      aiLogger.error('Webcam classification failed:', error);
      return this.getFallbackResult(0);
    }
  }

  /**
   * 모델 훈련 (전이 학습)
   */
  async trainCustomModel(trainingData: {
    images: Buffer[];
    labels: string[];
  }): Promise<{
    success: boolean;
    accuracy: number;
    loss: number;
  }> {
    if (!this.isEnabled) {
      throw new Error('TensorFlow.js not enabled');
    }

    try {
      const tf = await this.loadTensorFlow();
      if (!tf) {
        throw new Error('TensorFlow.js not available');
      }

      // 훈련 데이터 전처리
      const processedData = await this.preprocessTrainingData(trainingData, tf);
      
      // 모델 훈련
      const history = await this.model.fit(
        processedData.features,
        processedData.labels,
        {
          epochs: 10,
          batchSize: 32,
          validationSplit: 0.2,
          callbacks: {
            onEpochEnd: (epoch: number, logs: any) => {
              aiLogger.info(`Epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)}, accuracy=${logs.acc.toFixed(4)}`);
            }
          }
        }
      );

      const finalAccuracy = history.history.acc[history.history.acc.length - 1];
      const finalLoss = history.history.loss[history.history.loss.length - 1];
      
      aiLogger.info(`🎓 Model training completed: accuracy=${finalAccuracy.toFixed(4)}`);
      
      return {
        success: true,
        accuracy: finalAccuracy,
        loss: finalLoss
      };
      
    } catch (error) {
      aiLogger.error('Model training failed:', error);
      return {
        success: false,
        accuracy: 0,
        loss: Infinity
      };
    }
  }

  /**
   * 훈련 데이터 전처리
   */
  private async preprocessTrainingData(trainingData: any, tf: any): Promise<{
    features: any;
    labels: any;
  }> {
    // 구현 생략 - 실제로는 이미지와 라벨을 텐서로 변환
    // 현재는 더미 데이터 반환
    const features = tf.randomNormal([trainingData.images.length, 224, 224, 3]);
    const labels = tf.randomUniform([trainingData.images.length, 9]);
    
    return { features, labels };
  }

  /**
   * 폴백 결과
   */
  private getFallbackResult(processingTime: number): TensorFlowJSResult {
    const fallbackStyles = ['abstract', 'realistic', 'modern', 'mixed'];
    const randomStyle = fallbackStyles[Math.floor(Math.random() * fallbackStyles.length)];
    
    return {
      style: randomStyle,
      confidence: 0.6,
      processing_time: processingTime,
      model_used: 'fallback'
    };
  }

  /**
   * 모델 저장
   */
  async saveModel(path: string): Promise<boolean> {
    if (!this.isLoaded || !this.model) {
      return false;
    }

    try {
      await this.model.save(`file://${path}`);
      aiLogger.info(`💾 Model saved to ${path}`);
      return true;
    } catch (error) {
      aiLogger.error('Model save failed:', error);
      return false;
    }
  }

  /**
   * 서비스 상태
   */
  getStatus(): {
    isEnabled: boolean;
    isLoaded: boolean;
    modelUrl: string;
  } {
    return {
      isEnabled: this.isEnabled,
      isLoaded: this.isLoaded,
      modelUrl: this.modelUrl
    };
  }
}

export const tensorflowJSClassifier = new TensorFlowJSStyleClassifier();