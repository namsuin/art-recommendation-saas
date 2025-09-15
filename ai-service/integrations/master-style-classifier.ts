/**
 * 마스터 예술 스타일 분류기
 * Option A, B, C를 모두 통합한 앙상블 시스템
 */

import { aiLogger } from '../utils/logger';

// 개별 분류기들 import
import { huggingFaceStyleClassifier } from './huggingface-style-classifier';
import { artStyleAutoMLTrainer } from './automl-style-trainer';
import { tensorflowJSClassifier } from './tensorflowjs-classifier';
import { artStyleClassifier } from './style-classifier';
import { advancedStyleClassifier } from './advanced-style-classifier';

interface MasterClassificationResult {
  style: string;
  confidence: number;
  processing_time: number;
  individual_results: {
    huggingface?: any;
    automl?: any;
    tensorflow?: any;
    heuristic?: any;
  };
  ensemble_method: string;
  reasoning: string;
  // 고도화된 분석 결과 추가
  advanced_analysis?: {
    primaryStyle: string;
    subStyle: string;
    period: string;
    movement: string;
    techniques: string[];
    characteristics: string[];
    similarArtists?: string[];
    detailedReasoning: string;
  };
}

export class MasterStyleClassifier {
  private isEnabled = true;
  private weights = {
    huggingface: 0.3,
    automl: 0.4,      // 가장 높은 가중치 (커스텀 훈련)
    tensorflow: 0.2,
    heuristic: 0.1    // 폴백용
  };

  constructor() {
    this.initializeClassifiers();
  }

  private async initializeClassifiers(): Promise<void> {
    aiLogger.info('🎭 Initializing Master Style Classifier...');
    
    // 각 분류기의 상태 확인
    const statuses = {
      huggingface: huggingFaceStyleClassifier.isServiceEnabled(),
      automl: await this.checkAutoMLStatus(),
      tensorflow: tensorflowJSClassifier.getStatus().isEnabled,
      heuristic: true // 항상 사용 가능
    };

    aiLogger.info('🔍 Classifier availability:', statuses);
    
    // 가중치 동적 조정
    this.adjustWeights(statuses);
  }

  /**
   * AutoML 상태 확인
   */
  private async checkAutoMLStatus(): Promise<boolean> {
    try {
      const status = await artStyleAutoMLTrainer.getModelStatus();
      return status.isDeployed;
    } catch (error) {
      return false;
    }
  }

  /**
   * 사용 가능한 분류기에 따라 가중치 조정
   */
  private adjustWeights(statuses: Record<string, boolean>): void {
    const availableClassifiers = Object.entries(statuses)
      .filter(([_, available]) => available)
      .map(([name, _]) => name);

    if (availableClassifiers.length === 0) {
      this.isEnabled = false;
      return;
    }

    // 사용 가능한 분류기에만 가중치 재분배
    const totalWeight = availableClassifiers.reduce((sum, name) => 
      sum + this.weights[name as keyof typeof this.weights], 0
    );

    // 정규화
    for (const name of availableClassifiers) {
      this.weights[name as keyof typeof this.weights] = 
        this.weights[name as keyof typeof this.weights] / totalWeight;
    }

    aiLogger.info('⚖️ Adjusted weights:', this.weights);
  }

  /**
   * 메인 스타일 분류 함수
   */
  async classifyArtStyle(imageBuffer: Buffer): Promise<MasterClassificationResult> {
    const startTime = Date.now();
    
    if (!this.isEnabled) {
      return this.getFallbackResult(Date.now() - startTime);
    }

    try {
      // 모든 분류기를 병렬로 실행
      const [
        huggingfaceResult,
        automlResult,
        tensorflowResult,
        heuristicResult
      ] = await Promise.allSettled([
        this.runHuggingFaceClassifier(imageBuffer),
        this.runAutoMLClassifier(imageBuffer),
        this.runTensorFlowClassifier(imageBuffer),
        this.runHeuristicClassifier(imageBuffer)
      ]);

      // 결과 수집
      const individualResults = {
        huggingface: huggingfaceResult.status === 'fulfilled' ? huggingfaceResult.value : null,
        automl: automlResult.status === 'fulfilled' ? automlResult.value : null,
        tensorflow: tensorflowResult.status === 'fulfilled' ? tensorflowResult.value : null,
        heuristic: heuristicResult.status === 'fulfilled' ? heuristicResult.value : null
      };

      // 앙상블 처리
      const ensembleResult = this.performEnsemble(individualResults);
      
      const processingTime = Date.now() - startTime;
      
      // 고급 분석 추가 - 기본 결과를 더 세밀하게 분석
      let advancedAnalysis = undefined;
      try {
        if (ensembleResult.style && ensembleResult.style !== 'mixed') {
          // 더미 키워드와 색상으로 고급 분석 수행
          const dummyKeywords = this.extractKeywordsFromResults(individualResults);
          const dummyColors = this.extractColorsFromResults(individualResults);
          
          advancedAnalysis = await advancedStyleClassifier.analyzeAdvancedStyle(
            imageBuffer,
            ensembleResult.style,
            dummyKeywords,
            dummyColors
          );
        }
      } catch (advancedError) {
        aiLogger.debug('Advanced analysis failed, using basic result only:', advancedError);
      }
      
      aiLogger.info(`🎭 Master classification: ${ensembleResult.style} (${ensembleResult.confidence.toFixed(3)}) in ${processingTime}ms`);
      
      return {
        style: ensembleResult.style,
        confidence: ensembleResult.confidence,
        processing_time: processingTime,
        individual_results: individualResults,
        ensemble_method: ensembleResult.method,
        reasoning: ensembleResult.reasoning,
        advanced_analysis: advancedAnalysis
      };
      
    } catch (error) {
      aiLogger.error('❌ Master classification failed:', error);
      return this.getFallbackResult(Date.now() - startTime);
    }
  }

  /**
   * Hugging Face 분류기 실행
   */
  private async runHuggingFaceClassifier(imageBuffer: Buffer): Promise<any> {
    try {
      return await huggingFaceStyleClassifier.classifyArtStyle(imageBuffer);
    } catch (error) {
      aiLogger.debug('Hugging Face classifier failed:', error);
      return null;
    }
  }

  /**
   * AutoML 분류기 실행
   */
  private async runAutoMLClassifier(imageBuffer: Buffer): Promise<any> {
    try {
      return await artStyleAutoMLTrainer.predictStyle(imageBuffer);
    } catch (error) {
      aiLogger.debug('AutoML classifier failed:', error);
      return null;
    }
  }

  /**
   * TensorFlow.js 분류기 실행
   */
  private async runTensorFlowClassifier(imageBuffer: Buffer): Promise<any> {
    try {
      return await tensorflowJSClassifier.classifyStyle(imageBuffer);
    } catch (error) {
      aiLogger.debug('TensorFlow classifier failed:', error);
      return null;
    }
  }

  /**
   * 휴리스틱 분류기 실행
   */
  private async runHeuristicClassifier(imageBuffer: Buffer): Promise<any> {
    try {
      // 더미 키워드와 색상으로 휴리스틱 분석
      const dummyKeywords = ['artistic', 'painting', 'visual'];
      const dummyColors = ['blue', 'red', 'white'];
      
      return artStyleClassifier.analyzeKeywordsForStyle(dummyKeywords, dummyColors);
    } catch (error) {
      aiLogger.debug('Heuristic classifier failed:', error);
      return { style: 'mixed', confidence: 0.5, reasoning: 'Fallback heuristic' };
    }
  }

  /**
   * 앙상블 처리 - 여러 분류기 결과를 조합
   */
  private performEnsemble(results: any): {
    style: string;
    confidence: number;
    method: string;
    reasoning: string;
  } {
    const validResults = Object.entries(results)
      .filter(([_, result]) => result !== null)
      .map(([name, result]) => ({ name, ...result }));

    if (validResults.length === 0) {
      return {
        style: 'mixed',
        confidence: 0.5,
        method: 'fallback',
        reasoning: 'No valid classification results'
      };
    }

    // Method 1: 가중 평균 (Weighted Voting)
    const weightedVoting = this.performWeightedVoting(validResults);
    
    // Method 2: 최고 신뢰도 (Best Confidence)
    const bestConfidence = this.selectBestConfidence(validResults);
    
    // Method 3: 다수결 투표 (Majority Voting)
    const majorityVoting = this.performMajorityVoting(validResults);

    // 최종 결정 로직
    return this.makeFinalDecision(weightedVoting, bestConfidence, majorityVoting, validResults);
  }

  /**
   * 가중 평균 방식
   */
  private performWeightedVoting(results: any[]): any {
    const styleScores: Record<string, number> = {};
    let totalWeight = 0;

    for (const result of results) {
      const weight = this.weights[result.name as keyof typeof this.weights] || 0.1;
      const style = result.style || 'mixed';
      const confidence = result.confidence || 0.5;
      
      styleScores[style] = (styleScores[style] || 0) + (confidence * weight);
      totalWeight += weight;
    }

    // 정규화
    for (const style in styleScores) {
      styleScores[style] /= totalWeight;
    }

    const bestStyle = Object.entries(styleScores)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      style: bestStyle[0],
      confidence: bestStyle[1],
      method: 'weighted_voting',
      scores: styleScores
    };
  }

  /**
   * 최고 신뢰도 선택
   */
  private selectBestConfidence(results: any[]): any {
    const bestResult = results.reduce((best, current) => {
      const currentConfidence = current.confidence || 0;
      const bestConfidence = best.confidence || 0;
      
      return currentConfidence > bestConfidence ? current : best;
    });

    return {
      style: bestResult.style,
      confidence: bestResult.confidence,
      method: 'best_confidence',
      classifier: bestResult.name
    };
  }

  /**
   * 다수결 투표
   */
  private performMajorityVoting(results: any[]): any {
    const styleCounts: Record<string, number> = {};
    
    for (const result of results) {
      const style = result.style || 'mixed';
      styleCounts[style] = (styleCounts[style] || 0) + 1;
    }

    const majorityStyle = Object.entries(styleCounts)
      .sort(([,a], [,b]) => b - a)[0];

    // 다수결 신뢰도는 투표 비율
    const confidence = majorityStyle[1] / results.length;

    return {
      style: majorityStyle[0],
      confidence,
      method: 'majority_voting',
      votes: styleCounts
    };
  }

  /**
   * 최종 결정 로직
   */
  private makeFinalDecision(weighted: any, bestConf: any, majority: any, results: any[]): any {
    // 1. AutoML이 있고 신뢰도가 높으면 우선 채택
    const automlResult = results.find(r => r.name === 'automl');
    if (automlResult && automlResult.confidence > 0.8) {
      return {
        style: automlResult.style,
        confidence: automlResult.confidence,
        method: 'automl_priority',
        reasoning: `AutoML high confidence (${automlResult.confidence.toFixed(3)})`
      };
    }

    // 2. 가중 평균의 신뢰도가 높으면 채택
    if (weighted.confidence > 0.7) {
      return {
        style: weighted.style,
        confidence: weighted.confidence,
        method: weighted.method,
        reasoning: `Weighted voting consensus (${weighted.confidence.toFixed(3)})`
      };
    }

    // 3. 최고 신뢰도가 매우 높으면 채택
    if (bestConf.confidence > 0.85) {
      return {
        style: bestConf.style,
        confidence: bestConf.confidence,
        method: bestConf.method,
        reasoning: `Single classifier high confidence (${bestConf.classifier}: ${bestConf.confidence.toFixed(3)})`
      };
    }

    // 4. 다수결 투표 결과 채택
    return {
      style: majority.style,
      confidence: Math.max(majority.confidence, 0.5), // 최소 50% 보장
      method: majority.method,
      reasoning: `Majority voting (${majority.confidence.toFixed(3)})`
    };
  }

  /**
   * 개별 분류기 결과에서 키워드 추출
   */
  private extractKeywordsFromResults(results: any): string[] {
    const keywords: string[] = [];
    
    Object.values(results).forEach((result: any) => {
      if (result && result.keywords) {
        keywords.push(...result.keywords);
      }
      if (result && result.style) {
        keywords.push(result.style);
      }
      if (result && result.reasoning) {
        // reasoning에서 단어 추출
        const reasoningWords = result.reasoning
          .toLowerCase()
          .split(/[^a-zA-Z가-힣]+/)
          .filter((word: string) => word.length > 2);
        keywords.push(...reasoningWords);
      }
    });
    
    // 중복 제거 및 유효한 키워드만 반환
    return [...new Set(keywords.filter(k => k && typeof k === 'string'))];
  }

  /**
   * 개별 분류기 결과에서 색상 정보 추출
   */
  private extractColorsFromResults(results: any): string[] {
    const colors: string[] = [];
    
    Object.values(results).forEach((result: any) => {
      if (result && result.colors) {
        colors.push(...result.colors);
      }
      if (result && result.dominant_colors) {
        colors.push(...result.dominant_colors);
      }
    });
    
    // 기본 색상들 추가 (분류기에서 색상 정보가 없는 경우)
    if (colors.length === 0) {
      colors.push('blue', 'red', 'white', 'black', 'brown');
    }
    
    return [...new Set(colors.filter(c => c && typeof c === 'string'))];
  }

  /**
   * 폴백 결과
   */
  private getFallbackResult(processingTime: number): MasterClassificationResult {
    return {
      style: 'mixed',
      confidence: 0.5,
      processing_time: processingTime,
      individual_results: {},
      ensemble_method: 'fallback',
      reasoning: 'Master classifier not available'
    };
  }

  /**
   * 분류기 상태 확인
   */
  async getSystemStatus(): Promise<{
    master_enabled: boolean;
    classifiers: Record<string, any>;
    weights: Record<string, number>;
  }> {
    return {
      master_enabled: this.isEnabled,
      classifiers: {
        huggingface: {
          enabled: huggingFaceStyleClassifier.isServiceEnabled(),
          status: 'ready'
        },
        automl: await artStyleAutoMLTrainer.getModelStatus(),
        tensorflow: tensorflowJSClassifier.getStatus(),
        heuristic: {
          enabled: true,
          status: 'ready'
        }
      },
      weights: this.weights
    };
  }

  /**
   * 배치 분류 (여러 이미지 동시 처리)
   */
  async batchClassify(imageBuffers: Buffer[]): Promise<MasterClassificationResult[]> {
    const batchPromises = imageBuffers.map(buffer => 
      this.classifyArtStyle(buffer)
    );

    return await Promise.all(batchPromises);
  }
}

export const masterStyleClassifier = new MasterStyleClassifier();