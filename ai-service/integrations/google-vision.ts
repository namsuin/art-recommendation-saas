import { ImageAnnotatorClient } from '@google-cloud/vision';
import type { GoogleVisionResult } from '../../shared/types';

export class GoogleVisionService {
  private client!: ImageAnnotatorClient;
  private isEnabled: boolean;

  constructor() {
    try {
      const keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (keyFilename && projectId) {
        console.log(`🔑 Initializing Google Vision with service account key`);
        this.client = new ImageAnnotatorClient({
          keyFilename,
          projectId,
        });
        this.isEnabled = true;
        console.log('✅ Google Vision AI initialized with service account');
      } else if (projectId && clientId && clientSecret) {
        console.log('🔑 Initializing Google Vision with OAuth credentials');
        this.client = new ImageAnnotatorClient({
          projectId,
          credentials: {
            client_id: clientId,
            client_secret: clientSecret,
            type: 'authorized_user'
          }
        });
        this.isEnabled = true;
        console.log('✅ Google Vision AI initialized with OAuth credentials');
      } else if (projectId) {
        console.log('🔑 Missing detailed credentials, trying with project ID only...');
        this.client = new ImageAnnotatorClient({
          projectId
        });
        this.isEnabled = true;
        console.log('✅ Google Vision AI initialized with project ID');
      } else {
        console.log('🔑 Trying Google Vision with default credentials...');
        this.client = new ImageAnnotatorClient();
        this.isEnabled = true;
        console.log('✅ Google Vision AI initialized with default credentials');
      }
    } catch (error) {
      console.error('❌ Google Vision AI initialization failed:', error);
      this.isEnabled = false;
    }
  }

  async analyzeImage(imageBuffer: Buffer): Promise<GoogleVisionResult | null> {
    if (!this.isEnabled) {
      console.warn('Google Vision AI is not enabled');
      return null;
    }

    try {
      // Perform multiple detection types in parallel
      const [
        labelResult,
        objectResult,
        imagePropertiesResult,
        safeSearchResult
      ] = await Promise.all([
        this.client.labelDetection({ image: { content: imageBuffer } }),
        this.client.objectLocalization({ image: { content: imageBuffer } }),
        this.client.imageProperties({ image: { content: imageBuffer } }),
        this.client.safeSearchDetection({ image: { content: imageBuffer } })
      ]);

      // Extract labels
      const labels = labelResult[0].labelAnnotations?.map(label => ({
        description: label.description || '',
        score: label.score || 0,
      })) || [];

      // Extract objects
      const objects = objectResult[0].localizedObjectAnnotations?.map(obj => ({
        name: obj.name || '',
        score: obj.score || 0,
      })) || [];

      // Extract dominant colors
      const colors = imagePropertiesResult[0].imagePropertiesAnnotation?.dominantColors?.colors?.map((colorInfo: any) => ({
        color: {
          red: colorInfo.color?.red || 0,
          green: colorInfo.color?.green || 0,
          blue: colorInfo.color?.blue || 0,
        },
        score: colorInfo.score || 0,
      })) || [];

      // Check if image is safe (not adult, violent, etc.)
      const safeSearch = safeSearchResult[0].safeSearchAnnotation;
      const isSafe = safeSearch && 
        safeSearch.adult !== 'LIKELY' && 
        safeSearch.adult !== 'VERY_LIKELY' &&
        safeSearch.violence !== 'LIKELY' && 
        safeSearch.violence !== 'VERY_LIKELY';

      if (!isSafe) {
        console.warn('Image failed safe search detection');
        return null;
      }

      return {
        labels: labels.slice(0, 20), // Limit to top 20 labels
        objects: objects.slice(0, 10), // Limit to top 10 objects
        colors: colors.slice(0, 5), // Limit to top 5 colors
      };

    } catch (error) {
      console.error('❌ Google Vision API error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        details: (error as any)?.details
      });
      return null;
    }
  }

  // Extract art-specific keywords from Google Vision results
  extractArtKeywords(result: GoogleVisionResult): string[] {
    const keywords = new Set<string>();

    // Process labels with confidence threshold
    result.labels.forEach(label => {
      if (label.score > 0.5) {
        keywords.add(label.description.toLowerCase());
      }
    });

    // Process objects
    result.objects.forEach(obj => {
      if (obj.score > 0.5) {
        keywords.add(obj.name.toLowerCase());
      }
    });

    // Add color keywords
    result.colors.forEach(colorInfo => {
      if (colorInfo.score > 0.1) {
        const { red, green, blue } = colorInfo.color;
        const colorName = this.getColorName(red, green, blue);
        keywords.add(colorName);
      }
    });

    return Array.from(keywords);
  }

  // Convert RGB values to color names
  private getColorName(red: number, green: number, blue: number): string {
    // Simple color name mapping based on dominant RGB values
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const diff = max - min;

    // Grayscale
    if (diff < 30) {
      if (max < 50) return 'black';
      if (max < 130) return 'gray';
      if (max < 200) return 'light gray';
      return 'white';
    }

    // Colored
    if (red === max) {
      if (green > blue) return 'orange';
      return 'red';
    }
    if (green === max) {
      if (red > blue) return 'yellow';
      return 'green';
    }
    if (blue === max) {
      if (red > green) return 'purple';
      return 'blue';
    }

    return 'multicolor';
  }

  // Test the service with a simple image
  async testService(): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      // Create a simple test image (1x1 pixel)
      const testImage = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
        0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x25,
        0xDB, 0x56, 0xCA, 0x00, 0x00, 0x00, 0x00, 0x49, // IEND chunk
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);

      const result = await this.analyzeImage(testImage);
      return result !== null;
    } catch (error) {
      console.error('Google Vision test failed:', error);
      return false;
    }
  }

  isServiceEnabled(): boolean {
    return this.isEnabled;
  }
}