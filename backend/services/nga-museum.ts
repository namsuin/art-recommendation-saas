import { logger } from '../../shared/logger';
import axios from 'axios';

interface NGAArtwork {
  objectid: number;
  accessioned: string;
  accessionnum: string;
  locationid: string;
  title: string;
  displaydate: string;
  beginyear: number;
  endyear: number;
  visualbrowsertimespan: string;
  medium: string;
  dimensions: string;
  inscription: string;
  markings: string;
  attributioninverted: string;
  attribution: string;
  provenancetext: string;
  classification: string;
  subclassification: string;
  visualbrowserclassification: string;
  parentid: number;
  isvirtual: number;
  departmentabbr: string;
  portfolio: string;
  series: string;
  volume: string;
  watermarks: string;
  lastdetectedmodification: string;
  wikidataid: string;
  customprinturl: string;
  
  // Artist fields
  artistid?: number;
  artistname?: string;
  artistdisplayname?: string;
  artistdisplaydate?: string;
  artistbegindate?: number;
  artistenddate?: number;
  artistnationality?: string;
  artistrole?: string;
  
  // Image fields
  iiifthumburl?: string;
  iiifurl?: string;
  imageurl?: string;
}

interface NGASearchResult {
  artworks: NGAArtwork[];
  total: number;
  source: 'nga';
}

export class NGAMuseumService {
  private dataUrl = 'https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/';
  private artworksData: NGAArtwork[] = [];
  private isDataLoaded = false;
  private lastDataUpdate: Date | null = null;

  /**
   * Load artwork data from GitHub (cached for performance)
   */
  private async loadArtworkData(): Promise<void> {
    // Check if data is already loaded and fresh (within 24 hours)
    if (this.isDataLoaded && this.lastDataUpdate) {
      const hoursSinceUpdate = (Date.now() - this.lastDataUpdate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate < 24) {
        return; // Use cached data
      }
    }

    try {
      logger.info('📥 Loading NGA artwork data from GitHub...');
      
      // For now, we'll use a subset approach to avoid loading massive CSV in memory
      // In production, this should ideally use a database or streaming approach
      const response = await axios.get(`${this.dataUrl}published_images.csv`, {
        responseType: 'text',
        maxContentLength: 50 * 1024 * 1024, // 50MB limit
        timeout: 30000 // 30 second timeout
      });

      // Parse CSV data
      this.artworksData = this.parseCSV(response.data);
      this.isDataLoaded = true;
      this.lastDataUpdate = new Date();
      
      logger.info(`✅ Loaded ${this.artworksData.length} NGA artworks with images`);
    } catch (error) {
      logger.error('Failed to load NGA artwork data:', error);
      // Fall back to empty dataset if loading fails
      this.artworksData = [];
    }
  }

  /**
   * Parse CSV data into artwork objects
   */
  private parseCSV(csvData: string): NGAArtwork[] {
    const lines = csvData.split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const artworks: NGAArtwork[] = [];

    // Process only first 1000 rows for performance (or implement pagination)
    const maxRows = Math.min(lines.length, 1000);
    
    for (let i = 1; i < maxRows; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue;
      
      const artwork: any = {};
      headers.forEach((header, index) => {
        const value = values[index]?.replace(/"/g, '').trim();
        if (value && value !== 'NULL' && value !== '') {
          // Convert numeric fields
          if (['objectid', 'beginyear', 'endyear', 'parentid', 'isvirtual', 'artistid', 'artistbegindate', 'artistenddate'].includes(header)) {
            artwork[header] = parseInt(value, 10);
          } else {
            artwork[header] = value;
          }
        }
      });
      
      // Only include artworks with images
      if (artwork.iiifthumburl || artwork.iiifurl || artwork.imageurl || artwork.customprinturl) {
        artworks.push(artwork as NGAArtwork);
      }
    }
    
    return artworks;
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Search artworks by keywords
   */
  async searchByKeywords(keywords: string[], limit: number = 20): Promise<NGASearchResult> {
    await this.loadArtworkData();
    
    try {
      const query = keywords.join(' ').toLowerCase();
      
      // Filter artworks based on keywords
      const matchedArtworks = this.artworksData.filter(artwork => {
        const searchableText = [
          artwork.title,
          artwork.attribution,
          artwork.artistname,
          artwork.artistdisplayname,
          artwork.medium,
          artwork.classification,
          artwork.visualbrowserclassification,
          artwork.displaydate
        ].filter(Boolean).join(' ').toLowerCase();
        
        return keywords.some(keyword => searchableText.includes(keyword.toLowerCase()));
      });

      // Limit results
      const limitedArtworks = matchedArtworks.slice(0, limit);
      
      logger.info(`✅ NGA search completed: ${limitedArtworks.length} artworks found`);

      return {
        artworks: limitedArtworks,
        total: matchedArtworks.length,
        source: 'nga'
      };

    } catch (error) {
      logger.error('NGA search failed:', error);
      return { artworks: [], total: 0, source: 'nga' };
    }
  }

  /**
   * Get artworks by classification (painting, sculpture, etc.)
   */
  async searchByClassification(classification: string, limit: number = 20): Promise<NGAArtwork[]> {
    await this.loadArtworkData();
    
    const classificationLower = classification.toLowerCase();
    const matchedArtworks = this.artworksData.filter(artwork => 
      artwork.classification?.toLowerCase().includes(classificationLower) ||
      artwork.visualbrowserclassification?.toLowerCase().includes(classificationLower)
    );
    
    return matchedArtworks.slice(0, limit);
  }

  /**
   * Get artworks by time period
   */
  async searchByPeriod(startYear: number, endYear: number, limit: number = 20): Promise<NGAArtwork[]> {
    await this.loadArtworkData();
    
    const matchedArtworks = this.artworksData.filter(artwork => {
      const year = artwork.beginyear || artwork.endyear;
      return year && year >= startYear && year <= endYear;
    });
    
    return matchedArtworks.slice(0, limit);
  }

  /**
   * Get random artworks for discovery
   */
  async getRandomArtworks(limit: number = 10): Promise<NGAArtwork[]> {
    await this.loadArtworkData();
    
    if (this.artworksData.length === 0) return [];
    
    const shuffled = [...this.artworksData].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit);
  }

  /**
   * Format NGA artwork for display
   */
  formatForDisplay(artwork: NGAArtwork): any {
    // Construct IIIF image URL if available
    let imageUrl = '';
    let thumbnailUrl = '';
    
    if (artwork.iiifurl) {
      // IIIF URL format: https://api.nga.gov/iiif/[identifier]/full/!200,200/0/default.jpg
      const iiifBase = artwork.iiifurl.replace('/info.json', '');
      imageUrl = `${iiifBase}/full/!800,800/0/default.jpg`;
      thumbnailUrl = `${iiifBase}/full/!400,400/0/default.jpg`;
    } else if (artwork.iiifthumburl) {
      thumbnailUrl = artwork.iiifthumburl;
      imageUrl = artwork.iiifthumburl.replace('!200,200', '!800,800');
    } else if (artwork.imageurl) {
      imageUrl = artwork.imageurl;
      thumbnailUrl = artwork.imageurl;
    } else if (artwork.customprinturl) {
      imageUrl = artwork.customprinturl;
      thumbnailUrl = artwork.customprinturl;
    }
    
    // Build artist display name
    const artist = artwork.artistdisplayname || 
                  artwork.attribution || 
                  artwork.artistname || 
                  'Unknown Artist';
    
    // Build description
    const descriptionParts = [];
    if (artwork.medium) descriptionParts.push(artwork.medium);
    if (artwork.displaydate) descriptionParts.push(artwork.displaydate);
    if (artwork.dimensions) descriptionParts.push(artwork.dimensions);
    
    // Additional info from inscriptions or markings
    const additionalInfo = [
      artwork.inscription,
      artwork.markings,
      artwork.provenancetext
    ].filter(Boolean).join(' ');
    
    return {
      id: `nga_${artwork.objectid}`,
      title: artwork.title || 'Untitled',
      artist: artist,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      source: 'National Gallery of Art',
      source_url: `https://www.nga.gov/collection/art-object-page.${artwork.objectid}.html`,
      description: descriptionParts.join(' | '),
      additional_info: additionalInfo,
      keywords: [
        artwork.classification,
        artwork.visualbrowserclassification,
        artwork.visualbrowsertimespan,
        artwork.artistnationality,
        artwork.portfolio,
        artwork.series
      ].filter(k => k).map(k => k.toLowerCase()),
      metadata: {
        accession_number: artwork.accessionnum,
        object_id: artwork.objectid,
        classification: artwork.classification,
        time_period: artwork.visualbrowsertimespan,
        begin_year: artwork.beginyear,
        end_year: artwork.endyear,
        wikidata_id: artwork.wikidataid,
        department: artwork.departmentabbr,
        has_iiif: !!artwork.iiifurl
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
      logger.error('Failed to search NGA by style keywords:', error);
      return [];
    }
  }

  /**
   * Get masterpiece highlights
   */
  async getMasterpieces(limit: number = 10): Promise<any[]> {
    await this.loadArtworkData();
    
    // Filter for known masterpieces (paintings with complete information)
    const masterpieces = this.artworksData.filter(artwork => 
      artwork.classification?.toLowerCase().includes('painting') &&
      artwork.iiifurl &&
      artwork.artistdisplayname &&
      artwork.beginyear && artwork.beginyear < 1950 // Classic works
    );
    
    // Sort by object ID (often correlates with importance in collection)
    masterpieces.sort((a, b) => (a.objectid || 0) - (b.objectid || 0));
    
    return masterpieces
      .slice(0, limit)
      .map(artwork => this.formatForDisplay(artwork));
  }
}

// Export singleton instance
export const ngaMuseum = new NGAMuseumService();