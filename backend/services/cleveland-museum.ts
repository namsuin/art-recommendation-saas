import { logger } from '../../shared/logger';
import axios from 'axios';

interface ClevelandArtwork {
  id: number;
  accession_number: string;
  title: string;
  creation_date?: string;
  creators?: Array<{
    description: string;
    role: string;
  }>;
  culture?: string[];
  technique?: string;
  department?: string;
  type?: string;
  measurements?: string;
  description?: string;
  did_you_know?: string;
  images?: {
    web?: {
      url: string;
      width: string;
      height: string;
    };
    print?: {
      url: string;
      width: string;
      height: string;
    };
    full?: {
      url: string;
      width: string;
      height: string;
    };
  };
  url?: string;
  citations?: Array<{
    citation: string;
    page_number?: string;
    url?: string;
  }>;
  fun_fact?: string;
  digital_description?: string;
}

interface ClevelandSearchResult {
  artworks: ClevelandArtwork[];
  total: number;
  source: 'cleveland_museum';
}

export class ClevelandMuseumService {
  private baseUrl = 'https://openaccess-api.clevelandart.org/api';
  private maxResults = 100; // API limit per request

  /**
   * Search artworks by keywords
   */
  async searchByKeywords(keywords: string[], limit: number = 20): Promise<ClevelandSearchResult> {
    try {
      // Build search query
      const query = keywords.join(' ');
      
      const response = await axios.get(`${this.baseUrl}/artworks`, {
        params: {
          q: query,
          limit: Math.min(limit, this.maxResults),
          has_image: 1, // Only get artworks with images
          cc0: 1, // Only get CC0 licensed works
          skip: 0,
          indent: 1
        }
      });

      const artworks = response.data.data || [];
      
      logger.info(`✅ Cleveland Museum search completed: ${artworks.length} results`);

      return {
        artworks: artworks,
        total: response.data.info?.total || artworks.length,
        source: 'cleveland_museum'
      };

    } catch (error) {
      logger.error('Cleveland Museum search failed:', error);
      return { artworks: [], total: 0, source: 'cleveland_museum' };
    }
  }

  /**
   * Get artwork details by ID
   */
  async getArtworkById(artworkId: number): Promise<ClevelandArtwork | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/artworks/${artworkId}`, {
        params: {
          indent: 1
        }
      });

      return response.data.data;

    } catch (error) {
      logger.error(`Failed to get Cleveland Museum artwork ${artworkId}:`, error);
      return null;
    }
  }

  /**
   * Search similar artworks based on style, period, or department
   */
  async findSimilarArtworks(
    criteria: {
      department?: string;
      type?: string;
      culture?: string;
      technique?: string;
      creation_date_start?: number;
      creation_date_end?: number;
    },
    limit: number = 10
  ): Promise<ClevelandArtwork[]> {
    try {
      const params: any = {
        limit: Math.min(limit, this.maxResults),
        has_image: 1,
        cc0: 1,
        skip: 0,
        indent: 1
      };

      // Add search criteria
      if (criteria.department) params.department = criteria.department;
      if (criteria.type) params.type = criteria.type;
      if (criteria.culture) params.culture = criteria.culture;
      if (criteria.technique) params.technique = criteria.technique;
      if (criteria.creation_date_start) params.created_after = criteria.creation_date_start;
      if (criteria.creation_date_end) params.created_before = criteria.creation_date_end;

      const response = await axios.get(`${this.baseUrl}/artworks`, { params });

      return response.data.data || [];

    } catch (error) {
      logger.error('Failed to find similar Cleveland Museum artworks:', error);
      return [];
    }
  }

  /**
   * Search by specific artist/creator
   */
  async searchByArtist(artistName: string, limit: number = 20): Promise<ClevelandArtwork[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/artworks`, {
        params: {
          artists: artistName,
          limit: Math.min(limit, this.maxResults),
          has_image: 1,
          cc0: 1,
          skip: 0,
          indent: 1
        }
      });

      return response.data.data || [];

    } catch (error) {
      logger.error(`Failed to search Cleveland Museum by artist ${artistName}:`, error);
      return [];
    }
  }

  /**
   * Get random artworks for discovery
   */
  async getRandomArtworks(limit: number = 10): Promise<ClevelandArtwork[]> {
    try {
      // Get a random skip value
      const randomSkip = Math.floor(Math.random() * 1000);
      
      const response = await axios.get(`${this.baseUrl}/artworks`, {
        params: {
          limit: Math.min(limit, this.maxResults),
          has_image: 1,
          cc0: 1,
          skip: randomSkip,
          indent: 1
        }
      });

      return response.data.data || [];

    } catch (error) {
      logger.error('Failed to get random Cleveland Museum artworks:', error);
      return [];
    }
  }

  /**
   * Format Cleveland Museum artwork for internal display
   */
  formatForDisplay(artwork: ClevelandArtwork): any {
    // Get the best available image
    const imageUrl = artwork.images?.web?.url || 
                     artwork.images?.print?.url || 
                     artwork.images?.full?.url || '';

    // Extract artist name from creators
    const artist = artwork.creators?.find(c => c.role === 'artist' || c.role === 'maker')?.description || 
                   artwork.creators?.[0]?.description || 
                   'Unknown Artist';

    // Build description
    const descriptionParts = [];
    if (artwork.technique) descriptionParts.push(artwork.technique);
    if (artwork.creation_date) descriptionParts.push(artwork.creation_date);
    if (artwork.culture?.length) descriptionParts.push(artwork.culture.join(', '));
    if (artwork.measurements) descriptionParts.push(artwork.measurements);
    
    // Add fun fact or did you know if available
    const additionalInfo = artwork.fun_fact || artwork.did_you_know || artwork.digital_description;

    return {
      id: `cleveland_${artwork.id}`,
      title: artwork.title,
      artist: artist,
      image_url: imageUrl,
      thumbnail_url: imageUrl, // Cleveland provides responsive images
      source: 'Cleveland Museum of Art',
      source_url: artwork.url || `https://www.clevelandart.org/art/${artwork.accession_number}`,
      description: descriptionParts.join(' | '),
      additional_info: additionalInfo,
      keywords: [
        artwork.department,
        artwork.type,
        artwork.technique,
        ...(artwork.culture || [])
      ].filter(k => k).map(k => k.toLowerCase()),
      metadata: {
        accession_number: artwork.accession_number,
        department: artwork.department,
        type: artwork.type,
        creation_date: artwork.creation_date,
        citations: artwork.citations,
        has_high_res: !!artwork.images?.full?.url
      }
    };
  }

  /**
   * Search artworks by style keywords for AI recommendations
   */
  async searchByStyleKeywords(keywords: string[]): Promise<any[]> {
    try {
      const results = await this.searchByKeywords(keywords, 30);
      return results.artworks.map(artwork => this.formatForDisplay(artwork));
    } catch (error) {
      logger.error('Failed to search Cleveland Museum by style keywords:', error);
      return [];
    }
  }
}

// Export singleton instance
export const clevelandMuseum = new ClevelandMuseumService();