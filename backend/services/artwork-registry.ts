import { AIAnalysisService } from './ai-analysis';
import { logger } from '../../shared/logger';

interface RegisteredArtwork {
  id: string;
  title: string;
  artist: string;
  artist_bio?: string;
  image_url: string;
  description?: string;
  year?: number;
  medium?: string;
  style?: string;
  keywords: string[];
  colors: string[];
  analysis: any; // Google Vision analysis data
  created_at: string;
  created_by: string;
  status: 'pending' | 'approved' | 'rejected';
  available: boolean;
  match_score?: number;
}

class ArtworkRegistryService {
  private artworks: Map<string, RegisteredArtwork> = new Map();
  private aiService: AIAnalysisService;

  constructor() {
    this.aiService = AIAnalysisService.getInstance();
    this.loadMockArtworks();
  }

  /**
   * Load some initial mock artworks for testing
   */
  private loadMockArtworks() {
    const mockArtworks: RegisteredArtwork[] = [
      {
        id: 'artwork-1',
        title: 'Starry Night',
        artist: 'Vincent van Gogh',
        artist_bio: 'Dutch Post-Impressionist painter',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
        description: 'A swirling night sky over a village',
        year: 1889,
        medium: 'Oil on canvas',
        style: 'Post-Impressionism',
        keywords: ['night', 'stars', 'sky', 'village', 'swirl', 'blue', 'yellow', 'landscape', 'moon', 'cypress'],
        colors: ['blue', 'yellow', 'black', 'white'],
        analysis: {
          labels: ['Night', 'Sky', 'Painting', 'Art'],
          dominant_colors: ['#1e3a5f', '#f4e04d', '#2c5282']
        },
        created_at: new Date().toISOString(),
        created_by: 'admin',
        status: 'approved',
        available: true
      },
      {
        id: 'artwork-2',
        title: 'The Great Wave',
        artist: 'Katsushika Hokusai',
        artist_bio: 'Japanese ukiyo-e artist',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/The_Great_Wave_off_Kanagawa.jpg/1280px-The_Great_Wave_off_Kanagawa.jpg',
        description: 'A towering wave threatens boats off the coast of Kanagawa',
        year: 1831,
        medium: 'Woodblock print',
        style: 'Ukiyo-e',
        keywords: ['wave', 'ocean', 'sea', 'japan', 'mount fuji', 'boats', 'water', 'blue', 'foam', 'nature'],
        colors: ['blue', 'white', 'beige'],
        analysis: {
          labels: ['Wave', 'Ocean', 'Art', 'Japanese Art'],
          dominant_colors: ['#1e4e8b', '#f5f5dc', '#ffffff']
        },
        created_at: new Date().toISOString(),
        created_by: 'admin',
        status: 'approved',
        available: true
      },
      {
        id: 'artwork-3',
        title: 'Girl with a Pearl Earring',
        artist: 'Johannes Vermeer',
        artist_bio: 'Dutch Baroque Period painter',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/800px-1665_Girl_with_a_Pearl_Earring.jpg',
        description: 'Portrait of a girl with a pearl earring and turban',
        year: 1665,
        medium: 'Oil on canvas',
        style: 'Baroque',
        keywords: ['portrait', 'girl', 'pearl', 'earring', 'turban', 'dutch', 'golden age', 'face', 'baroque'],
        colors: ['blue', 'yellow', 'black', 'brown'],
        analysis: {
          labels: ['Portrait', 'Person', 'Painting', 'Art'],
          dominant_colors: ['#1e3a5f', '#f4e04d', '#2c1810']
        },
        created_at: new Date().toISOString(),
        created_by: 'admin',
        status: 'approved',
        available: true
      }
    ];

    mockArtworks.forEach(artwork => {
      this.artworks.set(artwork.id, artwork);
    });
  }

  /**
   * Register a new artwork with automatic Google Vision analysis
   */
  async registerArtwork(
    data: {
      title: string;
      artist: string;
      artist_bio?: string;
      image_url?: string;
      image_file?: Buffer;
      description?: string;
      year?: number;
      medium?: string;
      style?: string;
    },
    userId: string
  ): Promise<any> {
    try {
      logger.info('🎨 Registering new artwork:', data.title);

      // Generate unique ID
      const id = `artwork-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Analyze image with Google Vision
      let analysis = null;
      let keywords: string[] = [];
      let colors: string[] = [];

      if (data.image_file || data.image_url) {
        logger.info('🔍 Analyzing artwork with Google Vision...');
        
        const analysisResult = await this.aiService.analyzeImageAndRecommend(
          data.image_file || data.image_url!,
          userId,
          undefined,
          0 // Don't get recommendations during registration
        );

        if (analysisResult.success && analysisResult.analysis) {
          analysis = analysisResult.analysis;
          
          // Extract keywords from analysis
          keywords = this.extractKeywords(analysisResult.analysis);
          colors = this.extractColors(analysisResult.analysis);
          
          logger.info('✅ Analysis complete. Keywords:', keywords);
          logger.info('🎨 Dominant colors:', colors);
        } else {
          logger.info('❌ AI Analysis failed, but result has keywords:', analysisResult);
          // Try to extract keywords from the result even if success is false
          if (analysisResult.analysis) {
            keywords = this.extractKeywords(analysisResult.analysis);
            colors = this.extractColors(analysisResult.analysis);
            analysis = analysisResult.analysis;
            logger.info('🔄 Extracted keywords from failed result:', keywords);
          }
        }
      }

      // Handle image URL - if file was uploaded, create data URL
      let imageUrl = data.image_url || '';
      if (data.image_file && !imageUrl) {
        // Convert buffer to base64 data URL
        const base64 = data.image_file.toString('base64');
        imageUrl = `data:image/jpeg;base64,${base64}`;
        logger.info('🖼️ Created data URL for uploaded image');
      }

      // Create artwork record
      const artwork: RegisteredArtwork = {
        id,
        title: data.title,
        artist: data.artist,
        artist_bio: data.artist_bio,
        image_url: imageUrl,
        description: data.description,
        year: data.year,
        medium: data.medium,
        style: data.style,
        keywords,
        colors,
        analysis,
        created_at: new Date().toISOString(),
        created_by: userId,
        status: 'approved', // Auto-approve for admin
        available: true // Auto-activate for admin
      };

      // Save artwork
      this.artworks.set(id, artwork);
      
      logger.info('✅ Artwork registered successfully:', id);

      return {
        success: true,
        artwork,
        message: 'Artwork registered successfully'
      };
    } catch (error) {
      logger.error('Failed to register artwork:', error);
      return {
        success: false,
        error: 'Failed to register artwork'
      };
    }
  }

  /**
   * Extract keywords from AI analysis result
   */
  private extractKeywords(analysis: any): string[] {
    const keywords = new Set<string>();

    // Check if keywords are already processed (from AI Ensemble)
    if (analysis.keywords && Array.isArray(analysis.keywords)) {
      analysis.keywords.forEach((keyword: string) => {
        if (keyword && typeof keyword === 'string') {
          keywords.add(keyword.toLowerCase());
        }
      });
    }

    // Fallback: From Google Vision labels
    if (analysis.labels) {
      analysis.labels.forEach((label: any) => {
        if (typeof label === 'string') {
          keywords.add(label.toLowerCase());
        } else if (label.description) {
          keywords.add(label.description.toLowerCase());
        }
      });
    }

    // From objects
    if (analysis.objects) {
      analysis.objects.forEach((obj: any) => {
        if (obj.name) {
          keywords.add(obj.name.toLowerCase());
        }
      });
    }

    // From text
    if (analysis.text) {
      const words = analysis.text.split(/\s+/).filter((w: string) => w.length > 3);
      words.forEach((word: string) => keywords.add(word.toLowerCase()));
    }

    // From web detection
    if (analysis.web?.entities) {
      analysis.web.entities.forEach((entity: any) => {
        if (entity.description) {
          keywords.add(entity.description.toLowerCase());
        }
      });
    }

    return Array.from(keywords);
  }

  /**
   * Extract colors from Google Vision analysis
   */
  private extractColors(analysis: any): string[] {
    const colors = new Set<string>();

    // Check if colors are already processed (from AI Ensemble)
    if (analysis.colors && Array.isArray(analysis.colors)) {
      analysis.colors.forEach((color: any) => {
        if (typeof color === 'string') {
          colors.add(color.toLowerCase());
        } else {
          // Convert RGB to color name
          const colorName = this.rgbToColorName(color);
          if (colorName) {
            colors.add(colorName.toLowerCase());
          }
        }
      });
    }

    return Array.from(colors);
  }

  /**
   * Convert RGB values to common color names
   */
  private rgbToColorName(color: any): string | null {
    if (!color.red && !color.green && !color.blue) return null;

    const r = color.red || 0;
    const g = color.green || 0;
    const b = color.blue || 0;

    // Simple color classification
    if (r > 200 && g < 100 && b < 100) return 'red';
    if (r < 100 && g > 200 && b < 100) return 'green';
    if (r < 100 && g < 100 && b > 200) return 'blue';
    if (r > 200 && g > 200 && b < 100) return 'yellow';
    if (r > 200 && g < 150 && b > 200) return 'purple';
    if (r > 200 && g > 150 && b < 100) return 'orange';
    if (r > 200 && g > 200 && b > 200) return 'white';
    if (r < 50 && g < 50 && b < 50) return 'black';
    if (r > 100 && g > 100 && b > 100) return 'gray';
    if (r > 150 && g < 100 && b < 100) return 'brown';

    return null;
  }

  /**
   * Get artworks that match given keywords
   */
  async getMatchingArtworks(userKeywords: string[], limit: number = 5): Promise<RegisteredArtwork[]> {
    const matches: Array<{ artwork: RegisteredArtwork; score: number }> = [];

    // Normalize user keywords
    const normalizedUserKeywords = userKeywords.map(k => k.toLowerCase());

    // Calculate match scores for each approved and available artwork
    this.artworks.forEach(artwork => {
      if (artwork.status !== 'approved' || !artwork.available) return;

      let score = 0;
      
      // Check keyword matches
      artwork.keywords.forEach(keyword => {
        if (normalizedUserKeywords.includes(keyword)) {
          score += 2; // Exact match
        } else {
          // Partial match
          normalizedUserKeywords.forEach(userKeyword => {
            if (keyword.includes(userKeyword) || userKeyword.includes(keyword)) {
              score += 1;
            }
          });
        }
      });

      // Check style match
      if (artwork.style) {
        normalizedUserKeywords.forEach(keyword => {
          if (artwork.style!.toLowerCase().includes(keyword)) {
            score += 1.5;
          }
        });
      }

      // Check color matches
      artwork.colors.forEach(color => {
        if (normalizedUserKeywords.includes(color)) {
          score += 1;
        }
      });

      if (score > 0) {
        matches.push({ artwork: { ...artwork, match_score: score }, score });
      }
    });

    // Sort by score and return top matches
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, limit).map(m => m.artwork);
  }

  /**
   * Get all registered artworks
   */
  getAllArtworks(): RegisteredArtwork[] {
    return Array.from(this.artworks.values());
  }

  /**
   * Get artwork by ID
   */
  getArtwork(id: string): RegisteredArtwork | undefined {
    return this.artworks.get(id);
  }

  /**
   * Update artwork status
   */
  updateArtworkStatus(id: string, status: 'pending' | 'approved' | 'rejected'): boolean {
    const artwork = this.artworks.get(id);
    if (artwork) {
      artwork.status = status;
      return true;
    }
    return false;
  }

  /**
   * Update artwork availability
   */
  updateArtworkAvailability(id: string, available: boolean): boolean {
    const artwork = this.artworks.get(id);
    if (artwork) {
      artwork.available = available;
      return true;
    }
    return false;
  }

  /**
   * Delete artwork
   */
  deleteArtwork(id: string): boolean {
    return this.artworks.delete(id);
  }
}

// Singleton instance
export const artworkRegistry = new ArtworkRegistryService();