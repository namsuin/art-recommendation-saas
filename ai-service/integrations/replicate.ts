import Replicate from 'replicate';
import type { ReplicateResult } from '../../shared/types';

export class ReplicateService {
  private client!: Replicate;
  private isEnabled: boolean;

  constructor() {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    
    if (apiToken) {
      this.client = new Replicate({
        auth: apiToken,
      });
      this.isEnabled = true;
      console.log('✅ Replicate API initialized');
    } else {
      console.warn('⚠️ Replicate API token not found');
      this.isEnabled = false;
    }
  }

  async analyzeWithCLIP(imageBuffer: Buffer): Promise<ReplicateResult | null> {
    if (!this.isEnabled) {
      console.warn('Replicate service is not enabled');
      return null;
    }

    try {
      // Convert buffer to base64 data URL
      const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

      // Use CLIP model for image analysis
      const output = await this.client.run(
        "pharmapsychotic/clip-interrogator:a4a8bafd6089e1716b06057c42b19378250d008b80fe87caa5cd36d40c1eda90",
        {
          input: {
            image: base64Image,
            mode: "best"
          }
        }
      ) as unknown as string;

      // Parse the output to extract meaningful information
      const textDescription = output || '';
      const styleTags = this.extractStyleTags(textDescription);
      const embeddings = await this.getImageEmbeddings(base64Image);

      return {
        embeddings: embeddings || [],
        text_description: textDescription,
        style_tags: styleTags,
        confidence: embeddings ? 0.8 : 0.3, // Higher confidence if we got embeddings
      };

    } catch (error) {
      console.error('Replicate CLIP analysis error:', error);
      return null;
    }
  }

  async getImageEmbeddings(base64Image: string): Promise<number[] | null> {
    if (!this.isEnabled) return null;

    try {
      // Use CLIP model to get image embeddings
      const output = await this.client.run(
        "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
        {
          input: {
            inputs: base64Image
          }
        }
      ) as number[];

      return Array.isArray(output) ? output : null;
    } catch (error) {
      console.error('Replicate embeddings error:', error);
      return null;
    }
  }

  // Extract style-related tags from CLIP interrogator output
  private extractStyleTags(description: string): string[] {
    const styleKeywords = [
      // Art movements
      'renaissance', 'baroque', 'impressionism', 'expressionism', 'cubism',
      'surrealism', 'abstract', 'realism', 'romanticism', 'modernism',
      'postmodern', 'contemporary', 'classical', 'neoclassical',
      
      // Art styles
      'oil painting', 'watercolor', 'acrylic', 'digital art', 'sketch',
      'charcoal', 'pastel', 'ink', 'mixed media', 'collage',
      
      // Techniques
      'detailed', 'highly detailed', 'photorealistic', 'stylized',
      'minimalist', 'maximalist', 'geometric', 'organic', 'fluid',
      
      // Lighting and mood
      'dramatic lighting', 'soft lighting', 'natural lighting',
      'moody', 'bright', 'dark', 'warm tones', 'cool tones',
      
      // Composition
      'portrait', 'landscape', 'still life', 'abstract composition',
      'close-up', 'wide shot', 'symmetrical', 'asymmetrical'
    ];

    const foundTags = [];
    const lowerDescription = description.toLowerCase();

    for (const keyword of styleKeywords) {
      if (lowerDescription.includes(keyword)) {
        foundTags.push(keyword);
      }
    }

    // Also extract any adjectives that might describe style
    const adjectives = lowerDescription.match(/\b\w+(?=\s+(?:painting|art|style|drawing|illustration))/g) || [];
    foundTags.push(...adjectives.slice(0, 5)); // Limit to 5 additional adjectives

    return [...new Set(foundTags)]; // Remove duplicates
  }

  async testService(): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      // Test with a simple image (1x1 pixel PNG)
      const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      const base64Data = testImage.split(',')[1];
      if (!base64Data) throw new Error('Invalid test image data');
      const result = await this.analyzeWithCLIP(Buffer.from(base64Data, 'base64'));
      return result !== null;
    } catch (error) {
      console.error('Replicate test failed:', error);
      return false;
    }
  }

  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  // Get similarity between two embeddings
  static calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) return 0;

    // Cosine similarity calculation
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += (embedding1[i] ?? 0) * (embedding2[i] ?? 0);
      magnitude1 += (embedding1[i] ?? 0) * (embedding1[i] ?? 0);
      magnitude2 += (embedding2[i] ?? 0) * (embedding2[i] ?? 0);
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (magnitude1 * magnitude2);
  }
}