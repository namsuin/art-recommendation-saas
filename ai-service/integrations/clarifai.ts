import type { ClarifaiResult } from '../../shared/types';
import { logger } from '../../shared/logger';

export class ClarifaiService {
  private isEnabled: boolean;
  private apiKey: string;

  constructor() {
    const apiKey = process.env.CLARIFAI_API_KEY;
    
    if (apiKey) {
      this.apiKey = apiKey;
      this.isEnabled = true;
      logger.info('✅ Clarifai API initialized');
    } else {
      logger.warn('⚠️ Clarifai API key not found');
      this.isEnabled = false;
      this.apiKey = '';
    }
  }

  async analyzeImage(imageBuffer: Buffer): Promise<ClarifaiResult | null> {
    if (!this.isEnabled) {
      console.warn('Clarifai service is not enabled');
      return null;
    }

    try {
      const base64Image = imageBuffer.toString('base64');

      // Use general model for concept detection
      const generalResponse = await this.predictWithModel(
        'aaa03c23b3724a16a56b629203edc62c', // General model
        base64Image
      );

      // Use color model for color analysis
      const colorResponse = await this.predictWithModel(
        'eeed0b6733a644cea07cf4c60f87ebb7', // Color model
        base64Image
      );

      // Use art classification model if available
      const artResponse = await this.predictWithModel(
        'e466caa0619f444ab97497640cefc4dc', // Art model (if available)
        base64Image
      );

      // Combine results
      const concepts = [
        ...(generalResponse?.concepts || []),
        ...(artResponse?.concepts || [])
      ];

      const colors = colorResponse?.colors || [];

      return {
        concepts: concepts.slice(0, 30), // Limit to top 30 concepts
        colors: colors.slice(0, 10), // Limit to top 10 colors
      };

    } catch (error) {
      console.error('Clarifai analysis error:', error);
      return null;
    }
  }

  private async predictWithModel(modelId: string, base64Image: string): Promise<any> {
    try {
      const response = await fetch('https://api.clarifai.com/v2/models/' + modelId + '/outputs', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_app_id: {
            user_id: "clarifai",
            app_id: "main"
          },
          inputs: [
            {
              data: {
                image: {
                  base64: base64Image
                }
              }
            }
          ]
        })
      });

      if (!response.ok) {
        console.error(`Clarifai model ${modelId} HTTP error:`, response.status, response.statusText);
        return null;
      }

      const data = await response.json() as any;

      if (data.status?.code !== 10000) {
        console.error(`Clarifai model ${modelId} failed:`, data.status);
        return null;
      }

      const output = data.outputs?.[0];
      if (!output) {
        console.error(`Clarifai model ${modelId} no output`);
        return null;
      }
      
      // Parse concepts
      const concepts = output.data?.concepts?.map((concept: any) => ({
        name: concept.name,
        value: concept.value,
      })) || [];

      // Parse colors
      const colors = output.data?.colors?.map((color: any) => ({
        hex: color.w3c?.hex || color.hex,
        value: color.value,
      })) || [];

      return { concepts, colors };
    } catch (error) {
      console.error(`Clarifai model ${modelId} error:`, error);
      return null;
    }
  }

  // Extract art-specific keywords from Clarifai results
  extractArtKeywords(result: ClarifaiResult): string[] {
    const keywords = new Set<string>();

    // Process concepts with confidence threshold
    result.concepts.forEach(concept => {
      if (concept.value > 0.3) { // Lowered threshold for more concepts
        keywords.add(concept.name.toLowerCase());
      }
    });

    // Add dominant colors
    result.colors.forEach(colorInfo => {
      if (colorInfo.value > 0.1) {
        const colorName = this.hexToColorName(colorInfo.hex);
        keywords.add(colorName);
      }
    });

    return Array.from(keywords);
  }

  // Convert hex color to color name
  private hexToColorName(hex: string): string {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Simple color name mapping
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    // Grayscale
    if (diff < 30) {
      if (max < 50) return 'black';
      if (max < 130) return 'gray';
      if (max < 200) return 'light gray';
      return 'white';
    }

    // Colored
    if (r === max) {
      if (g > b) return 'orange';
      return 'red';
    }
    if (g === max) {
      if (r > b) return 'yellow';
      return 'green';
    }
    if (b === max) {
      if (r > g) return 'purple';
      return 'blue';
    }

    return 'multicolor';
  }

  async testService(): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      // Test with a simple 1x1 pixel image
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
        0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x25,
        0xDB, 0x56, 0xCA, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);

      const result = await this.analyzeImage(testImageBuffer);
      return result !== null;
    } catch (error) {
      console.error('Clarifai test failed:', error);
      return false;
    }
  }

  isServiceEnabled(): boolean {
    return this.isEnabled;
  }
}