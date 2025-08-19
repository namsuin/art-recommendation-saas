import { logger } from '../../shared/logger';
import axios from 'axios';

interface SmithsonianArtwork {
  id: string;
  title: string;
  content?: {
    descriptiveNonRepeating?: {
      title?: {
        content?: string;
      };
      record_ID?: string;
      unit_code?: string;
      online_media?: {
        media?: Array<{
          content?: string;
          thumbnail?: string;
          idsId?: string;
          type?: string;
          usage?: {
            access?: string;
          };
        }>;
      };
      data_source?: string;
      record_link?: string;
    };
    freetext?: {
      name?: Array<{
        label?: string;
        content?: string;
      }>;
      date?: Array<{
        label?: string;
        content?: string;
      }>;
      notes?: Array<{
        label?: string;
        content?: string;
      }>;
      physicalDescription?: Array<{
        label?: string;
        content?: string;
      }>;
      dataSource?: Array<{
        label?: string;
        content?: string;
      }>;
      objectType?: Array<{
        label?: string;
        content?: string;
      }>;
      topic?: Array<{
        label?: string;
        content?: string;
      }>;
    };
    indexedStructured?: {
      name?: string[];
      date?: string[];
      object_type?: string[];
      topic?: string[];
      place?: string[];
      culture?: string[];
      material?: string[];
      technique?: string[];
    };
  };
}

interface SmithsonianSearchResult {
  artworks: SmithsonianArtwork[];
  total: number;
  source: 'smithsonian';
}

export class SmithsonianMuseumService {
  private apiKey: string;
  private baseUrl = 'https://api.si.edu/openaccess/api/v1.0';
  private artUnitCodes = [
    'SAAM',    // Smithsonian American Art Museum
    'HMSG',    // Hirshhorn Museum and Sculpture Garden  
    'CHNDM',   // Cooper Hewitt, Smithsonian Design Museum
    'NPG',     // National Portrait Gallery
    'FSG',     // Freer and Sackler Galleries
    'NMAAHC',  // National Museum of African American History and Culture
    'ACM',     // Anacostia Community Museum
    'NMAI'     // National Museum of the American Indian
  ];

  constructor() {
    // Smithsonian API requires registration at api.data.gov
    this.apiKey = process.env.SMITHSONIAN_API_KEY || 'DEMO_KEY';
  }

  /**
   * Search artworks by keywords from art museums only
   */
  async searchByKeywords(keywords: string[], limit: number = 20): Promise<SmithsonianSearchResult> {
    try {
      const query = keywords.join(' ');
      
      // Build query to search only in art museums
      const unitFilter = this.artUnitCodes.map(code => `unit_code:"${code}"`).join(' OR ');
      const fullQuery = `(${query}) AND (${unitFilter}) AND online_media_type:Images`;
      
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          api_key: this.apiKey,
          q: fullQuery,
          rows: Math.min(limit, 100),
          start: 0
        },
        headers: {
          'Accept': 'application/json'
        }
      });

      const results = response.data.response?.rows || [];
      
      // Filter for artworks with images
      const artworks = results
        .filter((item: any) => this.hasValidImage(item))
        .map((item: any) => this.formatArtwork(item));

      logger.info(`✅ Smithsonian search completed: ${artworks.length} artworks found`);

      return {
        artworks,
        total: response.data.response?.rowCount || artworks.length,
        source: 'smithsonian'
      };

    } catch (error) {
      logger.error('Smithsonian search failed:', error);
      return { artworks: [], total: 0, source: 'smithsonian' };
    }
  }

  /**
   * Get artwork by specific museum unit
   */
  async searchByMuseum(museum: string, keywords: string[], limit: number = 20): Promise<SmithsonianArtwork[]> {
    try {
      const query = keywords.length > 0 ? keywords.join(' ') : '*:*';
      const fullQuery = `unit_code:"${museum}" AND online_media_type:Images${keywords.length > 0 ? ` AND (${query})` : ''}`;
      
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          api_key: this.apiKey,
          q: fullQuery,
          rows: Math.min(limit, 100),
          start: 0
        }
      });

      const results = response.data.response?.rows || [];
      
      return results
        .filter((item: any) => this.hasValidImage(item))
        .map((item: any) => this.formatArtwork(item));

    } catch (error) {
      logger.error(`Failed to search Smithsonian museum ${museum}:`, error);
      return [];
    }
  }

  /**
   * Get random artworks for discovery
   */
  async getRandomArtworks(limit: number = 10): Promise<SmithsonianArtwork[]> {
    try {
      // Use random start offset for variety
      const randomStart = Math.floor(Math.random() * 1000);
      const unitFilter = this.artUnitCodes.map(code => `unit_code:"${code}"`).join(' OR ');
      
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          api_key: this.apiKey,
          q: `(${unitFilter}) AND online_media_type:Images`,
          rows: Math.min(limit, 100),
          start: randomStart
        }
      });

      const results = response.data.response?.rows || [];
      
      return results
        .filter((item: any) => this.hasValidImage(item))
        .map((item: any) => this.formatArtwork(item))
        .slice(0, limit);

    } catch (error) {
      logger.error('Failed to get random Smithsonian artworks:', error);
      return [];
    }
  }

  /**
   * Check if item has valid image
   */
  private hasValidImage(item: any): boolean {
    const media = item.content?.descriptiveNonRepeating?.online_media?.media;
    if (!media || !Array.isArray(media)) return false;
    
    // Check for CC0 or public domain images
    return media.some((m: any) => 
      m.content && 
      m.type === 'Images' &&
      (m.usage?.access === 'CC0' || m.usage?.access === 'unrestricted')
    );
  }

  /**
   * Format raw Smithsonian data to internal artwork structure
   */
  private formatArtwork(item: any): SmithsonianArtwork {
    return {
      id: item.id || item.content?.descriptiveNonRepeating?.record_ID || '',
      title: item.title || item.content?.descriptiveNonRepeating?.title?.content || 'Untitled',
      content: item.content
    };
  }

  /**
   * Format Smithsonian artwork for display
   */
  formatForDisplay(artwork: SmithsonianArtwork): any {
    const descriptive = artwork.content?.descriptiveNonRepeating;
    const freetext = artwork.content?.freetext;
    const indexed = artwork.content?.indexedStructured;
    
    // Get the best available image
    const media = descriptive?.online_media?.media || [];
    const validImage = media.find((m: any) => 
      m.content && (m.usage?.access === 'CC0' || m.usage?.access === 'unrestricted')
    );
    
    const imageUrl = validImage?.content || '';
    const thumbnailUrl = validImage?.thumbnail || imageUrl;
    
    // Extract artist name
    const artistData = freetext?.name?.find((n: any) => 
      n.label === 'Artist' || n.label === 'Creator' || n.label === 'Maker'
    );
    const artist = artistData?.content || indexed?.name?.[0] || 'Unknown Artist';
    
    // Extract date
    const dateData = freetext?.date?.find((d: any) => 
      d.label === 'Date' || d.label === 'Created'
    );
    const date = dateData?.content || indexed?.date?.[0] || '';
    
    // Extract medium/technique
    const physicalDesc = freetext?.physicalDescription?.[0]?.content || '';
    const technique = indexed?.technique?.join(', ') || '';
    const material = indexed?.material?.join(', ') || '';
    
    // Build description
    const descriptionParts = [];
    if (physicalDesc) descriptionParts.push(physicalDesc);
    if (technique) descriptionParts.push(technique);
    if (material) descriptionParts.push(material);
    if (date) descriptionParts.push(date);
    
    // Extract notes for additional info
    const notes = freetext?.notes?.map((n: any) => n.content).join(' ') || '';
    
    // Get museum name
    const unitCode = descriptive?.unit_code || '';
    const museumNames: Record<string, string> = {
      'SAAM': 'Smithsonian American Art Museum',
      'HMSG': 'Hirshhorn Museum and Sculpture Garden',
      'CHNDM': 'Cooper Hewitt, Smithsonian Design Museum',
      'NPG': 'National Portrait Gallery',
      'FSG': 'Freer and Sackler Galleries',
      'NMAAHC': 'National Museum of African American History and Culture',
      'ACM': 'Anacostia Community Museum',
      'NMAI': 'National Museum of the American Indian'
    };
    const museum = museumNames[unitCode] || 'Smithsonian Institution';
    
    return {
      id: `smithsonian_${artwork.id}`,
      title: artwork.title,
      artist: artist,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      source: museum,
      source_url: descriptive?.record_link || `https://www.si.edu/object/${artwork.id}`,
      description: descriptionParts.join(' | '),
      additional_info: notes,
      keywords: [
        ...(indexed?.object_type || []),
        ...(indexed?.topic || []),
        ...(indexed?.culture || []),
        ...(indexed?.place || [])
      ].filter(k => k).map(k => k.toLowerCase()),
      metadata: {
        unit_code: unitCode,
        data_source: descriptive?.data_source,
        object_types: indexed?.object_type,
        topics: indexed?.topic,
        date: date,
        has_cc0_image: validImage?.usage?.access === 'CC0'
      }
    };
  }

  /**
   * Search artworks by style keywords for AI recommendations
   */
  async searchByStyleKeywords(keywords: string[]): Promise<any[]> {
    try {
      const results = await this.searchByKeywords(keywords, 30);
      return results.artworks.map(artwork => {
        const formatted = this.formatForDisplay(artwork);
        // Calculate similarity based on keyword matches
        const artworkKeywords = formatted.keywords || [];
        const matchCount = keywords.filter(keyword => 
          artworkKeywords.some(ak => 
            ak.toLowerCase().includes(keyword.toLowerCase()) ||
            keyword.toLowerCase().includes(ak.toLowerCase())
          )
        ).length;
        formatted.similarity = matchCount > 0 ? matchCount / keywords.length : 0.45; // Default 45% for Smithsonian
        return formatted;
      });
    } catch (error) {
      logger.error('Failed to search Smithsonian by style keywords:', error);
      return [];
    }
  }

  /**
   * Get artworks from specific Smithsonian art museums
   */
  async getArtMuseumHighlights(limit: number = 5): Promise<any[]> {
    try {
      const highlights: any[] = [];
      
      // Get a few items from each major art museum
      for (const museum of ['SAAM', 'HMSG', 'NPG']) {
        const museumArtworks = await this.searchByMuseum(museum, [], 3);
        const formatted = museumArtworks.map(artwork => this.formatForDisplay(artwork));
        highlights.push(...formatted);
      }
      
      return highlights.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get Smithsonian art museum highlights:', error);
      return [];
    }
  }
}

// Export singleton instance
export const smithsonianMuseum = new SmithsonianMuseumService();