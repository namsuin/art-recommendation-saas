import { ImageAnnotatorClient } from '@google-cloud/vision';
import type { GoogleVisionResult } from '../../shared/types';
import { logger } from '../../shared/logger';

export class GoogleVisionService {
  private client!: ImageAnnotatorClient;
  private isEnabled: boolean;

  constructor() {
    try {
      const keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
      const serviceAccountKey = process.env.GOOGLE_VISION_SERVICE_ACCOUNT_KEY;
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      // Try service account key from environment variable (for Render)
      if (serviceAccountKey) {
        try {
          const credentials = JSON.parse(serviceAccountKey);
          logger.info('🔑 Initializing Google Vision with service account from env var');
          logger.info('📋 Credential type:', credentials.type);
          
          // Write credentials to a temporary file for Google Cloud SDK
          const fs = require('fs');
          const path = require('path');
          const tmpDir = process.env.TMPDIR || '/tmp';
          const tmpFile = path.join(tmpDir, 'google-vision-key.json');
          
          fs.writeFileSync(tmpFile, serviceAccountKey);
          logger.info('📝 Wrote credentials to temporary file:', tmpFile);
          
          // Initialize with the temporary file
          this.client = new ImageAnnotatorClient({
            keyFilename: tmpFile,
            projectId: credentials.project_id || projectId,
          });
          
          this.isEnabled = true;
          logger.info('✅ Google Vision AI initialized with service account (env var via temp file)');
          return; // Exit constructor after successful initialization
        } catch (parseError) {
          logger.error('❌ Failed to initialize Google Vision with env var:', parseError);
          // Continue to try other methods
        }
      }
      
      if (keyFilename && projectId) {
        logger.info('🔑 Initializing Google Vision with service account key file');
        this.client = new ImageAnnotatorClient({
          keyFilename,
          projectId,
        });
        this.isEnabled = true;
        logger.info('✅ Google Vision AI initialized with service account (file)');
      } else if (projectId && clientId && clientSecret) {
        logger.info('🔑 Initializing Google Vision with OAuth credentials');
        this.client = new ImageAnnotatorClient({
          projectId,
          credentials: {
            client_id: clientId,
            client_secret: clientSecret,
            type: 'authorized_user'
          }
        });
        this.isEnabled = true;
        logger.info('✅ Google Vision AI initialized with OAuth credentials');
      } else if (projectId) {
        logger.info('🔑 Missing detailed credentials, trying with project ID only...');
        this.client = new ImageAnnotatorClient({
          projectId
        });
        this.isEnabled = true;
        logger.info('✅ Google Vision AI initialized with project ID');
      } else {
        logger.info('🔑 Trying Google Vision with default credentials...');
        this.client = new ImageAnnotatorClient();
        this.isEnabled = true;
        logger.info('✅ Google Vision AI initialized with default credentials');
      }
    } catch (error) {
      logger.error('❌ Google Vision AI initialization failed:', error);
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
        labels: labels.slice(0, 10),
        objects: objects.slice(0, 5),
        colors: [],
        imageProperties: null,
        visionFilter: {
          isSafe: true,
          hasPerson: objects.some(obj => obj.name.toLowerCase().includes('person')),
          isArtRelated: labels.some(label =>
            ['art', 'painting', 'drawing', 'illustration', 'photograph']
            .includes(label.description.toLowerCase())
                                   )
        }
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
      if (label.score > 0.2) { // Further lowered threshold for more keywords
        const desc = label.description.toLowerCase();
        keywords.add(desc);
        
        // Add art-specific mappings
        if (desc.includes('paint') || desc.includes('canvas')) keywords.add('painting');
        if (desc.includes('draw') || desc.includes('sketch')) keywords.add('drawing');
        if (desc.includes('photograph') || desc.includes('photo')) keywords.add('realistic');
        if (desc.includes('sculpture') || desc.includes('statue')) keywords.add('sculpture');
      }
    });

    // Process objects
    result.objects.forEach(obj => {
      if (obj.score > 0.3) { // Lowered threshold for more objects
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

  /**
   * Extract colors from Google Vision result
   */
  extractColors(result: GoogleVisionResult): string[] {
    const colors: string[] = [];
    
    // Extract from image properties if available
    if (result.imageProperties && result.imageProperties.dominantColors) {
      result.imageProperties.dominantColors.colors?.forEach(colorInfo => {
        if (colorInfo.color) {
          const color = this.rgbToColorName(
            colorInfo.color.red || 0,
            colorInfo.color.green || 0,  
            colorInfo.color.blue || 0
          );
          if (color) colors.push(color);
        }
      });
    }
    
    // Extract from labels (color keywords)
    if (result.labels) {
      result.labels.forEach(label => {
        const colorKeywords = this.extractColorFromLabel(label.description || '');
        colors.push(...colorKeywords);
      });
    }
    
    return [...new Set(colors)]; // Remove duplicates
  }

  /**
   * Convert RGB values to color name
   */
  private rgbToColorName(r: number, g: number, b: number): string | null {
    // More detailed color mapping
    if (r > 240 && g > 240 && b > 240) return 'white';
    if (r < 30 && g < 30 && b < 30) return 'black';
    
    // Gray shades
    if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30) {
      if (r < 100) return 'dark gray';
      if (r < 180) return 'gray';
      return 'light gray';
    }
    
    // Color detection with better thresholds
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    if (r >= g && r >= b) {
      if (r - g < 50 && g > b + 30) return 'orange';
      if (r - g < 30 && r - b < 30) return 'pink';
      return 'red';
    }
    
    if (g >= r && g >= b) {
      if (g - b < 50 && b > r + 20) return 'cyan';
      if (g - r < 40 && r > 100) return 'lime';
      return 'green';
    }
    
    if (b >= r && b >= g) {
      if (b - r < 50 && r > 80) return 'purple';
      if (b - g < 30 && g > 100) return 'teal';
      return 'blue';
    }
    
    // Additional color combinations
    if (r > 200 && g > 200 && b < 100) return 'yellow';
    if (r > 150 && g < 100 && b > 150) return 'magenta';
    if (r < 100 && g > 150 && b > 150) return 'turquoise';
    
    return 'brown';
  }

  /**
   * Extract color keywords from label text
   */
  private extractColorFromLabel(label: string): string[] {
    const colors: string[] = [];
    const colorKeywords = [
      'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
      'brown', 'black', 'white', 'gray', 'grey', 'gold', 'silver',
      'crimson', 'scarlet', 'azure', 'navy', 'emerald', 'jade', 'amber',
      'maroon', 'burgundy', 'coral', 'salmon', 'turquoise', 'cyan',
      'magenta', 'violet', 'indigo', 'tan', 'beige', 'khaki'
    ];
    
    const lowerLabel = label.toLowerCase();
    colorKeywords.forEach(color => {
      if (lowerLabel.includes(color)) {
        colors.push(color);
      }
    });
    
    // Additional color inference from common objects
    if (lowerLabel.includes('sky')) colors.push('blue');
    if (lowerLabel.includes('grass') || lowerLabel.includes('leaf')) colors.push('green');
    if (lowerLabel.includes('sun') || lowerLabel.includes('sunset')) colors.push('yellow', 'orange');
    if (lowerLabel.includes('ocean') || lowerLabel.includes('water')) colors.push('blue');
    if (lowerLabel.includes('fire') || lowerLabel.includes('flame')) colors.push('red', 'orange');
    if (lowerLabel.includes('wood') || lowerLabel.includes('tree')) colors.push('brown');
    if (lowerLabel.includes('snow') || lowerLabel.includes('cloud')) colors.push('white');
    
    return colors;
  }

  isServiceEnabled(): boolean {
    return this.isEnabled;
  }
}
