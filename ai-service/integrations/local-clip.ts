import { pipeline, env } from '@xenova/transformers';
import type { LocalClipResult } from '../../shared/types';

// Disable local model downloads in production - use pre-downloaded models
env.allowLocalModels = process.env.NODE_ENV === 'development';
env.allowRemoteModels = true;

export class LocalClipService {
  private clipModel: any = null;
  private textModel: any = null;
  private isEnabled: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    console.log('🔄 Initializing Local CLIP service...');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('📦 Loading CLIP models...');
      
      // Load vision model for image embeddings
      this.clipModel = await pipeline(
        'image-feature-extraction',
        'Xenova/clip-vit-base-patch32',
        { 
          cache_dir: './ai-service/models/cache'
        }
      );

      // Load text model for text embeddings
      this.textModel = await pipeline(
        'feature-extraction',
        'Xenova/clip-vit-base-patch32',
        { 
          cache_dir: './ai-service/models/cache'
        }
      );

      this.isEnabled = true;
      this.isInitialized = true;
      console.log('✅ Local CLIP models loaded successfully');

    } catch (error) {
      console.error('❌ Failed to load Local CLIP models:', error);
      this.isEnabled = false;
      this.isInitialized = true;
    }
  }

  async analyzeImage(imageBuffer: Buffer): Promise<LocalClipResult | null> {
    if (!this.isEnabled) {
      console.warn('Local CLIP service is not enabled');
      return null;
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.clipModel) {
      return null;
    }

    try {
      // Convert buffer to image data that transformers can process
      const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
      
      // Get image embeddings
      const embeddings = await this.clipModel(imageBlob);
      const embeddingArray = Array.from(embeddings.data) as number[];

      // Analyze artistic characteristics using predefined art descriptors
      const artisticAnalysis = await this.analyzeArtisticFeatures(embeddingArray);

      return {
        embeddings: embeddingArray,
        artistic_style: artisticAnalysis.style,
        period: artisticAnalysis.period,
        technique: artisticAnalysis.technique,
        confidence: artisticAnalysis.confidence,
      };

    } catch (error) {
      console.error('Local CLIP analysis error:', error);
      return null;
    }
  }

  private async analyzeArtisticFeatures(imageEmbeddings: number[]): Promise<{
    style: string;
    period: string;
    technique: string;
    confidence: number;
  }> {
    if (!this.textModel) {
      return {
        style: 'unknown',
        period: 'unknown',
        technique: 'unknown',
        confidence: 0.0,
      };
    }

    try {
      // Define art style descriptors
      const styleDescriptors = [
        'abstract art',
        'realistic art',
        'impressionist art',
        'expressionist art',
        'cubist art',
        'surrealist art',
        'minimalist art',
        'baroque art',
        'renaissance art',
        'modern art',
        'contemporary art',
        'classical art'
      ];

      const periodDescriptors = [
        'ancient art',
        'medieval art',
        'renaissance period',
        'baroque period',
        'romantic period',
        'impressionist period',
        'modern period',
        'contemporary period',
        'postmodern period'
      ];

      const techniqueDescriptors = [
        'oil painting',
        'watercolor painting',
        'acrylic painting',
        'digital art',
        'charcoal drawing',
        'pencil sketch',
        'ink drawing',
        'pastel art',
        'mixed media',
        'sculpture',
        'photography',
        'printmaking'
      ];

      // Get text embeddings for each descriptor category
      const [styleEmbeddings, periodEmbeddings, techniqueEmbeddings] = await Promise.all([
        this.getTextEmbeddings(styleDescriptors),
        this.getTextEmbeddings(periodDescriptors),
        this.getTextEmbeddings(techniqueDescriptors)
      ]);

      // Calculate similarities
      const styleSimilarities = styleEmbeddings.map(embedding => 
        this.calculateCosineSimilarity(imageEmbeddings, embedding)
      );
      const periodSimilarities = periodEmbeddings.map(embedding => 
        this.calculateCosineSimilarity(imageEmbeddings, embedding)
      );
      const techniqueSimilarities = techniqueEmbeddings.map(embedding => 
        this.calculateCosineSimilarity(imageEmbeddings, embedding)
      );

      // Find best matches
      const bestStyleIndex = styleSimilarities.indexOf(Math.max(...styleSimilarities));
      const bestPeriodIndex = periodSimilarities.indexOf(Math.max(...periodSimilarities));
      const bestTechniqueIndex = techniqueSimilarities.indexOf(Math.max(...techniqueSimilarities));

      const maxSimilarity = Math.max(
        Math.max(...styleSimilarities),
        Math.max(...periodSimilarities),
        Math.max(...techniqueSimilarities)
      );

      return {
        style: styleDescriptors[bestStyleIndex]?.replace(' art', '') ?? 'unknown',
        period: periodDescriptors[bestPeriodIndex]?.replace(' period', '').replace(' art', '') ?? 'unknown',
        technique: techniqueDescriptors[bestTechniqueIndex] ?? 'unknown',
        confidence: Math.min(maxSimilarity, 1.0),
      };

    } catch (error) {
      console.error('Artistic analysis error:', error);
      return {
        style: 'unknown',
        period: 'unknown',
        technique: 'unknown',
        confidence: 0.0,
      };
    }
  }

  private async getTextEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      try {
        const result = await this.textModel(text);
        embeddings.push(Array.from(result.data) as number[]);
      } catch (error) {
        console.error(`Error getting embeddings for "${text}":`, error);
        // Add zero vector as fallback
        embeddings.push(new Array(512).fill(0));
      }
    }
    
    return embeddings;
  }

  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += (vec1[i] ?? 0) * (vec2[i] ?? 0);
      magnitude1 += (vec1[i] ?? 0) * (vec1[i] ?? 0);
      magnitude2 += (vec2[i] ?? 0) * (vec2[i] ?? 0);
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (magnitude1 * magnitude2);
  }

  async testService(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      return this.isEnabled;
    } catch (error) {
      console.error('Local CLIP test failed:', error);
      return false;
    }
  }

  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  // Utility method to extract keywords from analysis
  extractKeywords(result: LocalClipResult): string[] {
    const keywords = [];
    
    if (result.artistic_style !== 'unknown') {
      keywords.push(result.artistic_style);
    }
    
    if (result.period !== 'unknown') {
      keywords.push(result.period);
    }
    
    if (result.technique !== 'unknown') {
      keywords.push(result.technique);
    }

    return keywords;
  }
}