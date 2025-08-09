import { GoogleVisionService } from '../integrations/google-vision';
import { ReplicateService } from '../integrations/replicate';
import { ClarifaiService } from '../integrations/clarifai';
import { LocalClipService } from '../integrations/local-clip';
import { StyleTransferService } from '../integrations/style-transfer';
import type { 
  ImageAnalysis, 
  AIServiceConfig, 
  AIServiceError,
  GoogleVisionResult,
  ClarifaiResult,
  ReplicateResult,
  LocalClipResult
} from '../../shared/types';

export class AIEnsembleService {
  private googleVision: GoogleVisionService;
  private replicate: ReplicateService;
  private clarifai: ClarifaiService;
  private localClip: LocalClipService;
  private styleTransfer: StyleTransferService;
  private config: AIServiceConfig;
  private errors: AIServiceError[] = [];

  constructor(config?: Partial<AIServiceConfig>) {
    // Initialize all AI services with error handling
    try {
      this.googleVision = new GoogleVisionService();
    } catch (error) {
      console.warn('⚠️ Google Vision service failed to initialize:', error);
      this.googleVision = new GoogleVisionService(); // Will be disabled internally
    }

    try {
      this.replicate = new ReplicateService();
    } catch (error) {
      console.warn('⚠️ Replicate service failed to initialize:', error);
      this.replicate = new ReplicateService(); // Will be disabled internally
    }

    try {
      this.clarifai = new ClarifaiService();
    } catch (error) {
      console.warn('⚠️ Clarifai service failed to initialize:', error);
      this.clarifai = new ClarifaiService(); // Will be disabled internally
    }

    try {
      this.localClip = new LocalClipService();
    } catch (error) {
      console.warn('⚠️ Local CLIP service failed to initialize:', error);
      this.localClip = new LocalClipService(); // Will be disabled internally
    }

    try {
      this.styleTransfer = new StyleTransferService();
    } catch (error) {
      console.warn('⚠️ Style Transfer service failed to initialize:', error);
      this.styleTransfer = new StyleTransferService(); // Will be disabled internally
    }

    // Default configuration
    this.config = {
      google_vision: {
        enabled: true,
        weight: 0.2,
        features: ['labels', 'objects', 'colors']
      },
      clarifai: {
        enabled: true,
        weight: 0.2,
        model_id: 'general'
      },
      replicate: {
        enabled: true,
        weight: 0.25,
        model_version: 'clip-interrogator'
      },
      local_clip: {
        enabled: true,
        weight: 0.15,
        model_path: './models/clip'
      },
      style_transfer: {
        enabled: true,
        weight: 0.2,
        strength: 0.7
      },
      ...config
    };

    console.log('🎯 AI Ensemble Service initialized');
  }

  async analyzeImage(imageBuffer: Buffer): Promise<ImageAnalysis> {
    const startTime = Date.now();
    this.errors = []; // Reset errors

    // Initialize local CLIP if needed
    if (this.config.local_clip.enabled && this.localClip.isServiceEnabled()) {
      await this.localClip.initialize();
    }

    // Run all AI services in parallel
    const analysisPromises = [];

    if (this.config.google_vision.enabled && this.googleVision.isServiceEnabled()) {
      analysisPromises.push(
        this.runWithErrorHandling('google_vision', () => 
          this.googleVision.analyzeImage(imageBuffer)
        )
      );
    }

    if (this.config.clarifai.enabled && this.clarifai.isServiceEnabled()) {
      analysisPromises.push(
        this.runWithErrorHandling('clarifai', () => 
          this.clarifai.analyzeImage(imageBuffer)
        )
      );
    }

    if (this.config.replicate.enabled && this.replicate.isServiceEnabled()) {
      analysisPromises.push(
        this.runWithErrorHandling('replicate', () => 
          this.replicate.analyzeWithCLIP(imageBuffer)
        )
      );
    }

    if (this.config.local_clip.enabled && this.localClip.isServiceEnabled()) {
      analysisPromises.push(
        this.runWithErrorHandling('local_clip', () => 
          this.localClip.analyzeImage(imageBuffer)
        )
      );
    }

    if (this.config.style_transfer.enabled && this.styleTransfer.isConfigured()) {
      analysisPromises.push(
        this.runWithErrorHandling('style_transfer', () => 
          this.styleTransfer.analyzeImage(imageBuffer)
        )
      );
    }

    // Wait for all analyses to complete
    const results = await Promise.all(analysisPromises);
    const [googleResult, clarifaiResult, replicateResult, localClipResult, styleTransferResult] = results;

    // Combine results using weighted ensemble
    const combinedAnalysis = this.combineResults({
      google_vision: googleResult as GoogleVisionResult,
      clarifai: clarifaiResult as ClarifaiResult,
      replicate: replicateResult as ReplicateResult,
      local_clip: localClipResult as LocalClipResult,
      style_transfer: styleTransferResult as any
    });

    const processingTime = Date.now() - startTime;
    console.log(`🔍 Image analysis completed in ${processingTime}ms`);

    return combinedAnalysis;
  }

  private async runWithErrorHandling<T>(
    service: keyof AIServiceConfig,
    fn: () => Promise<T>
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      const errorInfo: AIServiceError = {
        service: service as any,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        retry_count: 0
      };
      
      this.errors.push(errorInfo);
      console.error(`❌ ${service} failed:`, error);
      return null;
    }
  }

  private combineResults(results: {
    google_vision?: GoogleVisionResult | null;
    clarifai?: ClarifaiResult | null;
    replicate?: ReplicateResult | null;
    local_clip?: LocalClipResult | null;
    style_transfer?: any | null;
  }): ImageAnalysis {
    
    const keywords = new Set<string>();
    const colors = new Set<string>();
    let combinedEmbeddings: number[] = [];
    let totalConfidence = 0;
    let validResults = 0;

    // Process Google Vision results
    if (results.google_vision) {
      const gvKeywords = this.googleVision.extractArtKeywords(results.google_vision);
      gvKeywords.forEach(kw => keywords.add(kw));
      validResults++;
      totalConfidence += 0.8; // Google Vision confidence
    }

    // Process Clarifai results
    if (results.clarifai) {
      const clarifaiKeywords = this.clarifai.extractArtKeywords(results.clarifai);
      clarifaiKeywords.forEach(kw => keywords.add(kw));
      validResults++;
      totalConfidence += 0.75; // Clarifai confidence
    }

    // Process Replicate results
    if (results.replicate) {
      results.replicate.style_tags.forEach(tag => keywords.add(tag));
      if (results.replicate.embeddings.length > 0) {
        combinedEmbeddings = this.combineEmbeddings(
          combinedEmbeddings, 
          results.replicate.embeddings,
          this.config.replicate.weight
        );
      }
      validResults++;
      totalConfidence += results.replicate.confidence;
    }

    // Process Local CLIP results
    if (results.local_clip) {
      const clipKeywords = this.localClip.extractKeywords(results.local_clip);
      clipKeywords.forEach(kw => keywords.add(kw));
      keywords.add(results.local_clip.artistic_style);
      keywords.add(results.local_clip.technique);
      
      if (results.local_clip.embeddings.length > 0) {
        combinedEmbeddings = this.combineEmbeddings(
          combinedEmbeddings,
          results.local_clip.embeddings,
          this.config.local_clip.weight
        );
      }
      validResults++;
      totalConfidence += results.local_clip.confidence;
    }

    // Process Style Transfer results
    if (results.style_transfer) {
      results.style_transfer.keywords.forEach(kw => keywords.add(kw));
      results.style_transfer.colors.forEach(color => colors.add(color));
      
      if (results.style_transfer.embeddings && results.style_transfer.embeddings.length > 0) {
        combinedEmbeddings = this.combineEmbeddings(
          combinedEmbeddings,
          results.style_transfer.embeddings,
          this.config.style_transfer.weight
        );
      }
      validResults++;
      totalConfidence += results.style_transfer.confidence;
    }

    // Determine overall style and mood
    const keywordArray = Array.from(keywords);
    const style = this.determineOverallStyle(keywordArray);
    const mood = this.determineOverallMood(keywordArray);

    // Extract colors from keywords if colors set is empty
    if (colors.size === 0) {
      const colorKeywords = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey'];
      keywordArray.forEach(keyword => {
        colorKeywords.forEach(color => {
          if (keyword.toLowerCase().includes(color)) {
            colors.add(color);
          }
        });
      });
      console.log(`🎨 Extracted ${colors.size} colors from keywords: ${Array.from(colors).join(', ')}`);
    }

    // Calculate final confidence
    const confidence = validResults > 0 ? totalConfidence / validResults : 0;

    return {
      keywords: keywordArray,
      colors: Array.from(colors),
      style,
      mood,
      confidence: Math.min(confidence, 1.0),
      embeddings: combinedEmbeddings,
      ai_sources: {
        google_vision: results.google_vision || undefined,
        clarifai: results.clarifai || undefined,
        replicate_clip: results.replicate || undefined,
        local_clip: results.local_clip || undefined,
        style_transfer: results.style_transfer || undefined
      }
    };
  }

  private combineEmbeddings(
    existing: number[], 
    newEmbeddings: number[], 
    weight: number
  ): number[] {
    if (existing.length === 0) {
      return newEmbeddings.map(val => val * weight);
    }

    if (existing.length !== newEmbeddings.length) {
      console.warn('Embedding dimension mismatch, using existing');
      return existing;
    }

    // Weighted average
    return existing.map((val, i) => val + (newEmbeddings[i] * weight));
  }

  private determineOverallStyle(keywords: string[]): string {
    const styleKeywords = {
      'abstract': ['abstract', 'geometric', 'non-representational'],
      'realistic': ['realistic', 'photorealistic', 'detailed', 'portrait'],
      'impressionist': ['impressionist', 'loose brushwork', 'light'],
      'expressionist': ['expressionist', 'emotional', 'bold colors'],
      'classical': ['classical', 'renaissance', 'traditional'],
      'modern': ['modern', 'contemporary', 'minimalist'],
      'surreal': ['surreal', 'dreamlike', 'fantastical']
    };

    let maxScore = 0;
    let dominantStyle = 'mixed';

    for (const [style, styleWords] of Object.entries(styleKeywords)) {
      const score = styleWords.reduce((acc, word) => {
        return acc + keywords.filter(kw => kw.includes(word)).length;
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        dominantStyle = style;
      }
    }

    return dominantStyle;
  }

  private determineOverallMood(keywords: string[]): string {
    const moodKeywords = {
      'serene': ['calm', 'peaceful', 'serene', 'tranquil'],
      'dramatic': ['dramatic', 'intense', 'bold', 'striking'],
      'melancholic': ['sad', 'melancholic', 'somber', 'dark'],
      'joyful': ['bright', 'cheerful', 'vibrant', 'happy'],
      'mysterious': ['mysterious', 'enigmatic', 'shadowy']
    };

    let maxScore = 0;
    let dominantMood = 'neutral';

    for (const [mood, moodWords] of Object.entries(moodKeywords)) {
      const score = moodWords.reduce((acc, word) => {
        return acc + keywords.filter(kw => kw.includes(word)).length;
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        dominantMood = mood;
      }
    }

    return dominantMood;
  }

  // Test all services
  async testAllServices(): Promise<{ [key: string]: boolean }> {
    const results = await Promise.all([
      this.googleVision.testService(),
      this.replicate.testService(),
      this.clarifai.testService(),
      this.localClip.testService(),
      Promise.resolve(this.styleTransfer.isConfigured())
    ]);

    return {
      google_vision: results[0],
      replicate: results[1],
      clarifai: results[2],
      local_clip: results[3],
      style_transfer: results[4]
    };
  }

  getServiceStatus() {
    return {
      google_vision: this.googleVision.isServiceEnabled(),
      replicate: this.replicate.isServiceEnabled(),
      clarifai: this.clarifai.isServiceEnabled(),
      local_clip: this.localClip.isServiceEnabled(),
      style_transfer: this.styleTransfer.isConfigured(),
      errors: this.errors
    };
  }

  updateConfig(newConfig: Partial<AIServiceConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}