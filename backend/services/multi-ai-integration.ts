/**
 * 다중 AI 분석 결과 통합 및 정확도 향상 서비스
 * - ArtPI, Clarifai, Google Arts & Culture, Playform.io, RunwayML+CLIP+GPT 결과 통합
 * - 가중치 기반 앙상블 분석
 * - 신뢰도 및 정확도 최적화
 * - 일관성 검증 및 오류 필터링
 */

import { ArtPIService, type ArtPIAnalysisResult } from './artpi-integration';
import { ClarifaiArtAnalysisService, type ClarifaiArtAnalysisResult } from './clarifai-art-analysis';
import { GoogleArtsCultureService, type GoogleArtsCultureResult } from './google-arts-culture-integration';
import { PlayformService, type PlayformAnalysisResult } from './playform-integration';
import { RunwayClipGptPipeline, type RunwayClipGptResult } from './runway-clip-gpt-pipeline';
import { EnhancedImageAnalysisService, type EnhancedImageAnalysis } from './enhanced-image-analysis';
import type { ServiceConfig, ImageAnalysisResult } from '../types/common';

export interface MultiAIAnalysisResult {
  // 통합 분석 결과
  unifiedAnalysis: {
    style: {
      primary: string;
      secondary: string[];
      confidence: number;
      consensus: number; // 서비스 간 합의도
    };
    period: {
      era: string;
      movement: string;
      confidence: number;
      historicalContext: string;
    };
    technique: {
      medium: string;
      methods: string[];
      complexity: 'simple' | 'moderate' | 'complex';
      innovation: number;
    };
    emotion: {
      primary: string;
      secondary: string[];
      intensity: number;
      mood: string;
      atmosphere: string;
    };
    composition: {
      balance: string;
      symmetry: string;
      focal_points: Array<{ x: number; y: number; strength: number }>;
      visual_flow: string;
    };
    color: {
      palette: string[];
      harmony: string;
      temperature: 'warm' | 'cool' | 'neutral';
      saturation: 'high' | 'medium' | 'low';
      dominance: Array<{ color: string; percentage: number }>;
    };
  };

  // 개별 서비스 결과 요약
  serviceResults: {
    artpi?: {
      status: 'success' | 'failed' | 'partial';
      confidence: number;
      key_insights: string[];
      processing_time: number;
    };
    clarifai?: {
      status: 'success' | 'failed' | 'partial';
      confidence: number;
      key_insights: string[];
      processing_time: number;
    };
    google_arts?: {
      status: 'success' | 'failed' | 'partial';
      confidence: number;
      key_insights: string[];
      processing_time: number;
    };
    playform?: {
      status: 'success' | 'failed' | 'partial';
      confidence: number;
      key_insights: string[];
      processing_time: number;
    };
    runway_clip_gpt?: {
      status: 'success' | 'failed' | 'partial';
      confidence: number;
      key_insights: string[];
      processing_time: number;
    };
    enhanced_analysis?: {
      status: 'success' | 'failed' | 'partial';
      confidence: number;
      key_insights: string[];
      processing_time: number;
    };
  };

  // 정확도 메트릭
  accuracyMetrics: {
    overall_confidence: number;
    consensus_score: number; // 서비스 간 합의 정도
    reliability_score: number; // 결과 신뢰도
    completeness_score: number; // 분석 완성도
    consistency_score: number; // 결과 일관성
    error_rate: number;
    validation_passed: boolean;
  };

  // 교육적 인사이트
  educationalContent: {
    comprehensive_analysis: string;
    technical_breakdown: string;
    historical_significance: string;
    artistic_merit: string;
    learning_objectives: string[];
    discussion_points: string[];
  };

  // 메타데이터
  metadata: {
    analysis_timestamp: string;
    processing_time_total: number;
    services_used: string[];
    api_costs_estimate: number;
    version: string;
  };
}

export class MultiAIIntegrationService {
  private artpiService: ArtPIService;
  private clarifaiService: ClarifaiArtAnalysisService;
  private googleArtsService: GoogleArtsCultureService;
  private playformService: PlayformService;
  private runwayPipeline: RunwayClipGptPipeline;
  private enhancedAnalysis: EnhancedImageAnalysisService;
  private config: ServiceConfig;

  // 서비스별 가중치 설정
  private readonly SERVICE_WEIGHTS = {
    artpi: 0.20,           // 작품 인식 및 분류에 강함
    clarifai: 0.18,        // 감정 및 스타일 분석에 강함
    google_arts: 0.22,     // 역사적 맥락 및 문화적 분석에 강함
    playform: 0.15,        // 창의적 분석 및 생성에 강함
    runway_clip_gpt: 0.20, // 종합적 해석에 강함
    enhanced_analysis: 0.05 // 기본 분석 보완
  };

  // 신뢰도 임계값
  private readonly CONFIDENCE_THRESHOLDS = {
    high: 0.8,
    medium: 0.6,
    low: 0.4
  };

  constructor(config: ServiceConfig = {}) {
    this.artpiService = new ArtPIService(config);
    this.clarifaiService = new ClarifaiArtAnalysisService(config);
    this.googleArtsService = new GoogleArtsCultureService(config);
    this.playformService = new PlayformService(config);
    this.runwayPipeline = new RunwayClipGptPipeline(config);
    this.enhancedAnalysis = new EnhancedImageAnalysisService();
    
    this.config = {
      timeout: config.timeout || 45000, // 전체 파이프라인 타임아웃
      retries: config.retries || 1,     // 개별 서비스는 자체 재시도 처리
      ...config
    };

    console.log('🚀 Multi-AI Integration Service initialized');
  }

  /**
   * 다중 AI 서비스를 통한 종합 분석
   */
  async analyzeArtwork(imageBuffer: Buffer): Promise<MultiAIAnalysisResult> {
    const startTime = Date.now();
    console.log('🎨 Starting comprehensive multi-AI artwork analysis...');

    try {
      // 모든 AI 서비스를 병렬로 실행
      const analysisPromises = [
        this.runServiceWithMetrics('artpi', () => this.artpiService.analyzeArtwork(imageBuffer)),
        this.runServiceWithMetrics('clarifai', () => this.clarifaiService.analyzeArtwork(imageBuffer)),
        this.runServiceWithMetrics('google_arts', () => this.googleArtsService.analyzeArtwork(imageBuffer)),
        this.runServiceWithMetrics('playform', () => this.playformService.analyzeArtwork(imageBuffer)),
        this.runServiceWithMetrics('runway_clip_gpt', () => this.runwayPipeline.analyzeArtwork(imageBuffer)),
        this.runServiceWithMetrics('enhanced_analysis', () => this.enhancedAnalysis.analyzeImage(imageBuffer))
      ];

      console.log('⏳ Running all AI services in parallel...');
      const results = await Promise.allSettled(analysisPromises);

      // 결과 추출 및 처리
      const [
        artpiResult,
        clarifaiResult,
        googleArtsResult,
        playformResult,
        runwayResult,
        enhancedResult
      ] = results;

      // 성공한 결과들만 추출
      const serviceResults = {
        artpi: this.extractServiceResult(artpiResult),
        clarifai: this.extractServiceResult(clarifaiResult),
        google_arts: this.extractServiceResult(googleArtsResult),
        playform: this.extractServiceResult(playformResult),
        runway_clip_gpt: this.extractServiceResult(runwayResult),
        enhanced_analysis: this.extractServiceResult(enhancedResult)
      };

      console.log('🔄 Integrating and synthesizing results...');

      // 결과 통합 및 분석
      const unifiedAnalysis = await this.synthesizeResults({
        artpi: artpiResult.status === 'fulfilled' ? artpiResult.value.result : null,
        clarifai: clarifaiResult.status === 'fulfilled' ? clarifaiResult.value.result : null,
        google_arts: googleArtsResult.status === 'fulfilled' ? googleArtsResult.value.result : null,
        playform: playformResult.status === 'fulfilled' ? playformResult.value.result : null,
        runway_clip_gpt: runwayResult.status === 'fulfilled' ? runwayResult.value.result : null,
        enhanced_analysis: enhancedResult.status === 'fulfilled' ? enhancedResult.value.result : null
      });

      // 정확도 메트릭 계산
      const accuracyMetrics = this.calculateAccuracyMetrics(serviceResults, unifiedAnalysis);

      // 교육적 컨텐츠 생성
      const educationalContent = this.generateEducationalContent(unifiedAnalysis, serviceResults);

      const totalProcessingTime = Date.now() - startTime;

      const result: MultiAIAnalysisResult = {
        unifiedAnalysis,
        serviceResults,
        accuracyMetrics,
        educationalContent,
        metadata: {
          analysis_timestamp: new Date().toISOString(),
          processing_time_total: totalProcessingTime,
          services_used: Object.keys(serviceResults).filter(key => serviceResults[key]?.status === 'success'),
          api_costs_estimate: this.estimateAPICosts(serviceResults),
          version: '1.0.0'
        }
      };

      console.log(`✅ Multi-AI analysis completed in ${totalProcessingTime}ms`);
      console.log(`📊 Services used: ${result.metadata.services_used.length}/6`);
      console.log(`🎯 Overall confidence: ${(accuracyMetrics.overall_confidence * 100).toFixed(1)}%`);

      return result;

    } catch (error) {
      console.error('❌ Multi-AI analysis failed:', error);
      return this.generateFallbackResult(Date.now() - startTime);
    }
  }

  /**
   * 개별 서비스를 메트릭과 함께 실행
   */
  private async runServiceWithMetrics<T>(
    serviceName: string, 
    serviceCall: () => Promise<T>
  ): Promise<{ result: T; metrics: any }> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Running ${serviceName} analysis...`);
      const result = await serviceCall();
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ ${serviceName} completed in ${processingTime}ms`);
      
      return {
        result,
        metrics: {
          status: 'success',
          processing_time: processingTime,
          confidence: this.extractConfidenceFromResult(result),
          key_insights: this.extractKeyInsights(serviceName, result)
        }
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ ${serviceName} failed:`, error);
      
      return {
        result: null as T,
        metrics: {
          status: 'failed',
          processing_time: processingTime,
          confidence: 0,
          key_insights: [],
          error: error.message
        }
      };
    }
  }

  /**
   * 서비스 결과 추출
   */
  private extractServiceResult(result: PromiseSettledResult<any>): any {
    if (result.status === 'fulfilled' && result.value?.metrics) {
      return result.value.metrics;
    }
    return {
      status: 'failed',
      confidence: 0,
      key_insights: [],
      processing_time: 0
    };
  }

  /**
   * 결과에서 신뢰도 추출
   */
  private extractConfidenceFromResult(result: any): number {
    if (!result) return 0;

    // ArtPI 결과
    if (result.artwork?.confidence) return result.artwork.confidence;
    
    // Clarifai 결과
    if (result.styleAnalysis?.styleConfidence) return result.styleAnalysis.styleConfidence;
    
    // Google Arts 결과
    if (result.artworkIdentification?.confidence) return result.artworkIdentification.confidence;
    
    // Playform 결과
    if (result.styleAnalysis?.styleConfidence) return result.styleAnalysis.styleConfidence;
    
    // Runway 결과
    if (result.synthesizedAnalysis?.confidence) return result.synthesizedAnalysis.confidence;
    
    // Enhanced 결과
    if (result.confidence) return result.confidence;
    
    return 0.5; // 기본값
  }

  /**
   * 핵심 인사이트 추출
   */
  private extractKeyInsights(serviceName: string, result: any): string[] {
    if (!result) return [];

    switch (serviceName) {
      case 'artpi':
        return [
          `Artist: ${result.artwork?.artist || 'Unknown'}`,
          `Style: ${result.style?.primary || 'Unknown'}`,
          `Medium: ${result.technique?.medium || 'Unknown'}`
        ];
      
      case 'clarifai':
        return [
          `Style: ${result.styleAnalysis?.primaryStyle}`,
          `Emotion: ${result.emotionalAnalysis?.primaryEmotion}`,
          `Period: ${result.styleAnalysis?.period}`
        ];
      
      case 'google_arts':
        return [
          `Period: ${result.styleAnalysis?.period}`,
          `Movement: ${result.styleAnalysis?.artMovement}`,
          `Culture: ${result.culturalAnalysis?.geographicalOrigin}`
        ];
      
      case 'playform':
        return [
          `Primary Style: ${result.styleAnalysis?.primaryStyle}`,
          `Innovation: ${result.creativeElements?.innovation}`,
          `Genre: ${result.genreClassification?.primaryGenre}`
        ];
      
      case 'runway_clip_gpt':
        return result.synthesizedAnalysis?.keyInsights || [];
      
      case 'enhanced_analysis':
        return [
          `Style: ${result.style}`,
          `Mood: ${result.mood}`,
          `Colors: ${result.colors?.join(', ')}`
        ];
      
      default:
        return [];
    }
  }

  /**
   * 결과 통합 및 합성
   */
  private async synthesizeResults(results: any): Promise<MultiAIAnalysisResult['unifiedAnalysis']> {
    // 스타일 분석 통합
    const style = this.synthesizeStyle(results);
    const period = this.synthesizePeriod(results);
    const technique = this.synthesizeTechnique(results);
    const emotion = this.synthesizeEmotion(results);
    const composition = this.synthesizeComposition(results);
    const color = this.synthesizeColor(results);

    return {
      style,
      period,
      technique,
      emotion,
      composition,
      color
    };
  }

  /**
   * 스타일 분석 통합
   */
  private synthesizeStyle(results: any) {
    const styles = [];
    const confidences = [];

    // 각 서비스에서 스타일 정보 수집
    if (results.artpi?.style?.primary) {
      styles.push(results.artpi.style.primary);
      confidences.push(results.artpi.artwork?.confidence || 0.5);
    }
    if (results.clarifai?.styleAnalysis?.primaryStyle) {
      styles.push(results.clarifai.styleAnalysis.primaryStyle);
      confidences.push(results.clarifai.styleAnalysis.styleConfidence);
    }
    if (results.google_arts?.styleAnalysis?.period) {
      styles.push(results.google_arts.styleAnalysis.period);
      confidences.push(results.google_arts.styleAnalysis.styleConfidence);
    }
    if (results.playform?.styleAnalysis?.primaryStyle) {
      styles.push(results.playform.styleAnalysis.primaryStyle);
      confidences.push(results.playform.styleAnalysis.styleConfidence);
    }
    if (results.runway_clip_gpt?.synthesizedAnalysis?.overallStyle) {
      styles.push(results.runway_clip_gpt.synthesizedAnalysis.overallStyle);
      confidences.push(results.runway_clip_gpt.synthesizedAnalysis.confidence);
    }

    // 가장 일치하는 스타일 찾기
    const styleFrequency = {};
    styles.forEach((style, index) => {
      const normalizedStyle = this.normalizeStyleName(style);
      if (!styleFrequency[normalizedStyle]) {
        styleFrequency[normalizedStyle] = { count: 0, totalConfidence: 0 };
      }
      styleFrequency[normalizedStyle].count++;
      styleFrequency[normalizedStyle].totalConfidence += confidences[index];
    });

    const sortedStyles = Object.entries(styleFrequency)
      .map(([style, data]: [string, any]) => ({
        style,
        score: data.count * (data.totalConfidence / data.count) // 빈도 × 평균 신뢰도
      }))
      .sort((a, b) => b.score - a.score);

    const primaryStyle = sortedStyles[0]?.style || 'Contemporary';
    const secondaryStyles = sortedStyles.slice(1, 4).map(s => s.style);
    
    // 합의도 계산 (동일한 스타일에 대한 서비스 간 합의 정도)
    const consensus = sortedStyles[0] ? 
      styleFrequency[sortedStyles[0].style].count / styles.length : 0;

    // 가중 평균 신뢰도 계산
    const weightedConfidence = confidences.length > 0 ?
      confidences.reduce((sum, conf, idx) => sum + conf * (confidences.length - idx) / confidences.length, 0) /
      confidences.length : 0.5;

    return {
      primary: primaryStyle,
      secondary: secondaryStyles,
      confidence: weightedConfidence,
      consensus
    };
  }

  /**
   * 시대/운동 분석 통합
   */
  private synthesizePeriod(results: any) {
    const periods = [];
    const movements = [];

    // 각 서비스에서 시대 정보 수집
    if (results.artpi?.artwork?.period) periods.push(results.artpi.artwork.period);
    if (results.clarifai?.styleAnalysis?.period) periods.push(results.clarifai.styleAnalysis.period);
    if (results.google_arts?.styleAnalysis?.period) periods.push(results.google_arts.styleAnalysis.period);
    
    if (results.artpi?.artwork?.movement) movements.push(results.artpi.artwork.movement);
    if (results.clarifai?.culturalAnalysis?.artisticMovement) movements.push(results.clarifai.culturalAnalysis.artisticMovement);
    if (results.google_arts?.styleAnalysis?.artMovement) movements.push(results.google_arts.styleAnalysis.artMovement);

    const era = this.getMostFrequent(periods) || 'Contemporary';
    const movement = this.getMostFrequent(movements) || 'Modern Art';

    return {
      era,
      movement,
      confidence: 0.75, // 시대 분석은 일반적으로 높은 신뢰도
      historicalContext: this.generateHistoricalContext(era, movement)
    };
  }

  /**
   * 기법 분석 통합
   */
  private synthesizeTechnique(results: any) {
    const media = [];
    const methods = [];

    // 각 서비스에서 기법 정보 수집
    if (results.artpi?.technique?.medium) media.push(results.artpi.technique.medium);
    if (results.clarifai?.technicalAnalysis?.technique) methods.push(...results.clarifai.technicalAnalysis.technique);
    if (results.playform?.technicalAnalysis?.medium) media.push(results.playform.technicalAnalysis.medium);

    const medium = this.getMostFrequent(media) || 'Mixed Media';
    const uniqueMethods = [...new Set(methods)];

    return {
      medium,
      methods: uniqueMethods.slice(0, 5),
      complexity: this.assessComplexity(results),
      innovation: this.assessInnovation(results)
    };
  }

  /**
   * 감정 분석 통합
   */
  private synthesizeEmotion(results: any) {
    const emotions = [];
    const moods = [];

    // 각 서비스에서 감정 정보 수집
    if (results.clarifai?.emotionalAnalysis?.primaryEmotion) {
      emotions.push(results.clarifai.emotionalAnalysis.primaryEmotion);
    }
    if (results.clarifai?.emotionalAnalysis?.mood) {
      moods.push(results.clarifai.emotionalAnalysis.mood);
    }
    if (results.runway_clip_gpt?.gptInterpretation?.emotionalImpact?.primaryEmotion) {
      emotions.push(results.runway_clip_gpt.gptInterpretation.emotionalImpact.primaryEmotion);
    }
    if (results.enhanced_analysis?.mood) {
      moods.push(results.enhanced_analysis.mood);
    }

    const primary = this.getMostFrequent(emotions) || 'Contemplative';
    const mood = this.getMostFrequent(moods) || 'Serene';

    return {
      primary,
      secondary: emotions.filter(e => e !== primary).slice(0, 2),
      intensity: this.calculateEmotionalIntensity(results),
      mood,
      atmosphere: this.determineAtmosphere(primary, mood)
    };
  }

  /**
   * 구도 분석 통합
   */
  private synthesizeComposition(results: any) {
    // 기본 구도 분석 (향후 더 정교하게 개선 가능)
    return {
      balance: 'Asymmetrical',
      symmetry: 'None',
      focal_points: [{ x: 0.33, y: 0.4, strength: 0.8 }],
      visual_flow: 'Dynamic'
    };
  }

  /**
   * 색상 분석 통합
   */
  private synthesizeColor(results: any) {
    const colors = [];
    
    // 각 서비스에서 색상 정보 수집
    if (results.enhanced_analysis?.colors) colors.push(...results.enhanced_analysis.colors);
    if (results.clarifai?.technicalAnalysis?.colorHarmony) {
      // 색상 조화에서 색상 추출
      const harmony = results.clarifai.technicalAnalysis.colorHarmony;
      if (harmony.includes('blue')) colors.push('blue');
      if (harmony.includes('red')) colors.push('red');
      if (harmony.includes('yellow')) colors.push('yellow');
    }

    const uniqueColors = [...new Set(colors)];

    return {
      palette: uniqueColors.slice(0, 6),
      harmony: 'Complementary',
      temperature: this.determineTemperature(uniqueColors),
      saturation: 'Medium',
      dominance: uniqueColors.slice(0, 3).map((color, index) => ({
        color,
        percentage: Math.max(30 - index * 10, 10)
      }))
    };
  }

  /**
   * 정확도 메트릭 계산
   */
  private calculateAccuracyMetrics(serviceResults: any, unifiedAnalysis: any) {
    const successfulServices = Object.values(serviceResults).filter((s: any) => s.status === 'success');
    const totalServices = Object.keys(serviceResults).length;

    const overall_confidence = successfulServices.length > 0 ?
      successfulServices.reduce((sum: number, s: any) => sum + s.confidence, 0) / successfulServices.length : 0;

    const consensus_score = unifiedAnalysis.style.consensus;
    const reliability_score = successfulServices.length / totalServices;
    const completeness_score = this.calculateCompleteness(unifiedAnalysis);
    const consistency_score = this.calculateConsistency(serviceResults);
    const error_rate = (totalServices - successfulServices.length) / totalServices;

    return {
      overall_confidence,
      consensus_score,
      reliability_score,
      completeness_score,
      consistency_score,
      error_rate,
      validation_passed: overall_confidence > this.CONFIDENCE_THRESHOLDS.medium && 
                        reliability_score > 0.5 && 
                        error_rate < 0.5
    };
  }

  /**
   * 교육적 컨텐츠 생성
   */
  private generateEducationalContent(unifiedAnalysis: any, serviceResults: any) {
    const style = unifiedAnalysis.style.primary;
    const period = unifiedAnalysis.period.era;
    const emotion = unifiedAnalysis.emotion.primary;

    return {
      comprehensive_analysis: `This artwork exemplifies ${style} characteristics from the ${period} period, 
        evoking a ${emotion.toLowerCase()} emotional response through its sophisticated use of 
        ${unifiedAnalysis.technique.medium.toLowerCase()} and ${unifiedAnalysis.color.harmony.toLowerCase()} color harmony.`,
      
      technical_breakdown: `The artist employs ${unifiedAnalysis.technique.methods.join(', ')} techniques 
        with ${unifiedAnalysis.composition.balance.toLowerCase()} composition, creating ${unifiedAnalysis.composition.visual_flow.toLowerCase()} visual movement.`,
      
      historical_significance: unifiedAnalysis.period.historicalContext,
      
      artistic_merit: `This work demonstrates ${unifiedAnalysis.technique.complexity.toLowerCase()} technical execution 
        with innovation score of ${unifiedAnalysis.technique.innovation}/1.0, representing significant artistic achievement.`,
      
      learning_objectives: [
        `Understanding ${style} artistic principles`,
        `Recognizing ${period} period characteristics`,
        `Analyzing emotional impact in visual art`,
        `Identifying technical methods and materials`
      ],
      
      discussion_points: [
        `How does the ${unifiedAnalysis.color.temperature.toLowerCase()} color temperature affect the mood?`,
        `What historical events influenced the ${period} artistic movement?`,
        `How do the composition elements guide the viewer's eye?`,
        `What makes this artwork representative of its period?`
      ]
    };
  }

  // 헬퍼 메서드들
  private normalizeStyleName(style: string): string {
    return style.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getMostFrequent<T>(arr: T[]): T | null {
    if (arr.length === 0) return null;
    
    const frequency = {};
    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0][0] as T;
  }

  private generateHistoricalContext(era: string, movement: string): string {
    return `The ${era} period, characterized by the ${movement} movement, represents a significant 
      phase in art history marked by innovation and cultural transformation.`;
  }

  private assessComplexity(results: any): 'simple' | 'moderate' | 'complex' {
    // 복잡도 평가 로직 (간소화)
    let complexityScore = 0;
    
    if (results.playform?.technicalAnalysis?.complexity === 'complex') complexityScore += 2;
    else if (results.playform?.technicalAnalysis?.complexity === 'moderate') complexityScore += 1;
    
    if (results.enhanced_analysis?.subjectAnalysis?.complexity === 'complex') complexityScore += 2;
    else if (results.enhanced_analysis?.subjectAnalysis?.complexity === 'moderate') complexityScore += 1;
    
    if (complexityScore >= 3) return 'complex';
    if (complexityScore >= 1) return 'moderate';
    return 'simple';
  }

  private assessInnovation(results: any): number {
    const innovations = [];
    
    if (results.playform?.creativeElements?.innovation) {
      innovations.push(results.playform.creativeElements.innovation);
    }
    if (results.artpi?.technique?.composition) {
      innovations.push(0.7); // 기본 혁신도
    }
    
    return innovations.length > 0 ? 
      innovations.reduce((sum, val) => sum + val, 0) / innovations.length : 0.5;
  }

  private calculateEmotionalIntensity(results: any): number {
    const intensities = [];
    
    if (results.clarifai?.emotionalAnalysis?.emotionalIntensity) {
      intensities.push(results.clarifai.emotionalAnalysis.emotionalIntensity);
    }
    
    return intensities.length > 0 ? 
      intensities.reduce((sum, val) => sum + val, 0) / intensities.length : 0.6;
  }

  private determineAtmosphere(emotion: string, mood: string): string {
    const atmosphereMap = {
      'contemplative': 'introspective',
      'joyful': 'uplifting',
      'melancholic': 'somber',
      'energetic': 'dynamic',
      'peaceful': 'serene'
    };
    
    return atmosphereMap[emotion.toLowerCase()] || 'neutral';
  }

  private determineTemperature(colors: string[]): 'warm' | 'cool' | 'neutral' {
    const warmColors = ['red', 'orange', 'yellow', 'pink'];
    const coolColors = ['blue', 'green', 'purple', 'cyan'];
    
    const warmCount = colors.filter(c => warmColors.includes(c.toLowerCase())).length;
    const coolCount = colors.filter(c => coolColors.includes(c.toLowerCase())).length;
    
    if (warmCount > coolCount) return 'warm';
    if (coolCount > warmCount) return 'cool';
    return 'neutral';
  }

  private calculateCompleteness(unifiedAnalysis: any): number {
    let completeness = 0;
    const totalFields = 6; // style, period, technique, emotion, composition, color
    
    if (unifiedAnalysis.style?.primary) completeness++;
    if (unifiedAnalysis.period?.era) completeness++;
    if (unifiedAnalysis.technique?.medium) completeness++;
    if (unifiedAnalysis.emotion?.primary) completeness++;
    if (unifiedAnalysis.composition?.balance) completeness++;
    if (unifiedAnalysis.color?.palette?.length > 0) completeness++;
    
    return completeness / totalFields;
  }

  private calculateConsistency(serviceResults: any): number {
    const successfulServices = Object.values(serviceResults).filter((s: any) => s.status === 'success');
    
    if (successfulServices.length < 2) return 0;
    
    // 신뢰도의 표준편차를 이용한 일관성 계산
    const confidences = successfulServices.map((s: any) => s.confidence);
    const mean = confidences.reduce((sum, val) => sum + val, 0) / confidences.length;
    const variance = confidences.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / confidences.length;
    const stdDev = Math.sqrt(variance);
    
    // 표준편차가 낮을수록 일관성이 높음
    return Math.max(0, 1 - (stdDev * 2));
  }

  private estimateAPICosts(serviceResults: any): number {
    // API 비용 추정 (USD)
    const costs = {
      artpi: 0.02,
      clarifai: 0.01,
      google_arts: 0.03,
      playform: 0.05,
      runway_clip_gpt: 0.08
    };
    
    let totalCost = 0;
    Object.entries(serviceResults).forEach(([service, result]: [string, any]) => {
      if (result.status === 'success' && costs[service]) {
        totalCost += costs[service];
      }
    });
    
    return totalCost;
  }

  /**
   * 폴백 결과 생성
   */
  private generateFallbackResult(processingTime: number): MultiAIAnalysisResult {
    return {
      unifiedAnalysis: {
        style: {
          primary: 'Contemporary',
          secondary: ['Abstract', 'Mixed Media'],
          confidence: 0.3,
          consensus: 0.2
        },
        period: {
          era: 'Contemporary',
          movement: 'Modern Art',
          confidence: 0.3,
          historicalContext: 'Contemporary artistic expression'
        },
        technique: {
          medium: 'Unknown',
          methods: [],
          complexity: 'moderate',
          innovation: 0.3
        },
        emotion: {
          primary: 'Neutral',
          secondary: [],
          intensity: 0.3,
          mood: 'Contemplative',
          atmosphere: 'Calm'
        },
        composition: {
          balance: 'Unknown',
          symmetry: 'Unknown',
          focal_points: [],
          visual_flow: 'Unknown'
        },
        color: {
          palette: [],
          harmony: 'Unknown',
          temperature: 'neutral',
          saturation: 'medium',
          dominance: []
        }
      },
      serviceResults: {},
      accuracyMetrics: {
        overall_confidence: 0.2,
        consensus_score: 0.1,
        reliability_score: 0.0,
        completeness_score: 0.3,
        consistency_score: 0.0,
        error_rate: 1.0,
        validation_passed: false
      },
      educationalContent: {
        comprehensive_analysis: 'Analysis could not be completed due to service failures.',
        technical_breakdown: 'Technical analysis unavailable.',
        historical_significance: 'Historical context could not be determined.',
        artistic_merit: 'Artistic merit assessment unavailable.',
        learning_objectives: ['Understanding basic art principles'],
        discussion_points: ['What elements make this artwork interesting?']
      },
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        processing_time_total: processingTime,
        services_used: [],
        api_costs_estimate: 0,
        version: '1.0.0'
      }
    };
  }

  /**
   * 서비스 상태 확인
   */
  async healthCheck(): Promise<{ [key: string]: any }> {
    const healthChecks = await Promise.allSettled([
      this.artpiService.healthCheck(),
      this.clarifaiService.healthCheck(),
      this.googleArtsService.healthCheck(),
      this.playformService.healthCheck(),
      this.runwayPipeline.healthCheck()
    ]);

    return {
      artpi: healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : { status: 'down' },
      clarifai: healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : { status: 'down' },
      google_arts: healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : { status: 'down' },
      playform: healthChecks[3].status === 'fulfilled' ? healthChecks[3].value : { status: 'down' },
      runway_clip_gpt: healthChecks[4].status === 'fulfilled' ? healthChecks[4].value : { status: 'down' },
      overall_status: healthChecks.filter(check => 
        check.status === 'fulfilled' && check.value.status === 'healthy'
      ).length >= 2 ? 'operational' : 'degraded'
    };
  }
}