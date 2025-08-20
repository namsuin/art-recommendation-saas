import { writeFile } from 'fs/promises';

interface Artwork {
  id: string;
  title: string;
  artist: string;
  artistUrl?: string;
  medium: string;
  dimensions: string;
  price: string;
  imageUrl: string;
  category: string;
  url: string;
  page: number;
}

class EnhancedArtsperScraper {
  private baseUrl = 'https://www.artsper.com/kr/contemporary-artworks';
  private artworks: Map<string, Artwork> = new Map(); // Use Map to prevent duplicates
  
  async fetchPage(page: number): Promise<string> {
    const url = page === 1 ? this.baseUrl : `${this.baseUrl}?page=${page}`;
    console.log(`Fetching page ${page}: ${url}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      return '';
    }
  }

  parseArtworksFromHtml(html: string, pageNumber: number): Artwork[] {
    const artworks: Artwork[] = [];
    
    // More flexible regex to match different article structures
    const patterns = [
      // Pattern 1: Standard article with data-id and data-url
      /<article[^>]*class="[^"]*card-artwork[^"]*"[^>]*data-id="([^"]+)"[^>]*data-url="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g,
      // Pattern 2: Alternative structure
      /<article[^>]*data-id="([^"]+)"[^>]*class="[^"]*card-artwork[^"]*"[^>]*data-url="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g,
      // Pattern 3: Even simpler pattern
      /<article[^>]*class="[^"]*card-artwork[^"]*"[^>]*>([\s\S]*?)data-id="([^"]+)"[\s\S]*?<\/article>/g
    ];
    
    for (const cardRegex of patterns) {
      let cardMatch;
      cardRegex.lastIndex = 0; // Reset regex
      
      while ((cardMatch = cardRegex.exec(html)) !== null) {
        let artworkId, artworkUrl, cardHtml;
        
        if (patterns.indexOf(cardRegex) < 2) {
          [, artworkId, artworkUrl, cardHtml] = cardMatch;
        } else {
          [, cardHtml, artworkId] = cardMatch;
          artworkUrl = '';
        }
        
        // Find image with data attributes
        const imgPatterns = [
          /<img[^>]*data-src="([^"]+)"[^>]*alt="([^"]+)"[^>]*data-id="[^"]*"[^>]*data-artist="([^"]*)"[^>]*data-vendor="([^"]*)"[^>]*data-price="([^"]*)"[^>]*data-category="([^"]*)"[^>]*>/,
          /<img[^>]*alt="([^"]+)"[^>]*data-src="([^"]+)"[^>]*data-id="[^"]*"[^>]*data-price="([^"]*)"[^>]*data-category="([^"]*)"[^>]*>/
        ];
        
        let imgMatch = null;
        for (const imgPattern of imgPatterns) {
          imgMatch = cardHtml.match(imgPattern);
          if (imgMatch) break;
        }
        
        if (imgMatch && artworkId) {
          let imageUrl, altText, artistId, vendorId, price, category;
          
          if (imgPatterns.indexOf(imgMatch.input ? imgPatterns[0] : imgPatterns[1]) === 0) {
            [, imageUrl, altText, artistId, vendorId, price, category] = imgMatch;
          } else {
            [, altText, imageUrl, price, category] = imgMatch;
            artistId = '';
            vendorId = '';
          }
          
          // Extract title and artist from alt text
          const titleArtistMatch = altText.match(/^(.+?),\s*(.+)$/);
          let title = altText;
          let artist = 'Unknown';
          
          if (titleArtistMatch) {
            title = titleArtistMatch[1].trim();
            artist = titleArtistMatch[2].trim();
          }
          
          // Look for dimensions
          const dimensionsMatch = cardHtml.match(/(\d+(?:\.\d+)?\s*[×x]\s*\d+(?:\.\d+)?\s*(?:[×x]\s*\d+(?:\.\d+)?)?\s*cm)/i);
          const dimensions = dimensionsMatch ? dimensionsMatch[1] : '';
          
          // Convert price
          const priceNum = parseInt(price || '0');
          const formattedPrice = priceNum > 0 ? `$${(priceNum / 100).toFixed(2)}` : 'Price on request';
          
          // Build artwork URL if not found
          if (!artworkUrl && title && category) {
            const slugTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            artworkUrl = `/kr/contemporary-artworks/${category}/${artworkId}/${slugTitle}`;
          }
          
          const artwork: Artwork = {
            id: artworkId,
            title: title,
            artist: artist,
            artistUrl: '',
            medium: category || 'unknown',
            dimensions: dimensions,
            price: formattedPrice,
            imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://media.artsper.com${imageUrl}`,
            category: category || 'unknown',
            url: artworkUrl.startsWith('http') ? artworkUrl : `https://www.artsper.com${artworkUrl}`,
            page: pageNumber
          };
          
          artworks.push(artwork);
          break; // Found artwork, move to next card
        }
      }
    }

    console.log(`Extracted ${artworks.length} artworks from page ${pageNumber}`);
    return artworks;
  }

  async tryAlternativeUrls(startPage: number = 1, maxPages: number = 20): Promise<void> {
    console.log(`Trying alternative URL patterns for more artworks...`);
    
    // Try different URL patterns that might work
    const urlPatterns = [
      (page: number) => `${this.baseUrl}?p=${page}`,
      (page: number) => `${this.baseUrl}?offset=${(page - 1) * 48}`,
      (page: number) => `${this.baseUrl}?start=${(page - 1) * 48}`,
      (page: number) => `${this.baseUrl}/page/${page}`,
    ];
    
    for (const urlPattern of urlPatterns) {
      console.log(`Trying URL pattern: ${urlPattern(2)}`);
      
      const testUrl = urlPattern(2);
      const response = await fetch(testUrl);
      
      if (response.ok) {
        const html = await response.text();
        const testArtworks = this.parseArtworksFromHtml(html, 0);
        
        if (testArtworks.length > 0 && !this.hasArtwork(testArtworks[0].id)) {
          console.log(`Found working pattern! Collecting more pages...`);
          
          for (let page = startPage; page <= maxPages; page++) {
            const pageHtml = await this.fetchPageWithPattern(urlPattern, page);
            if (pageHtml) {
              const pageArtworks = this.parseArtworksFromHtml(pageHtml, page);
              this.addArtworks(pageArtworks);
              
              if (pageArtworks.length === 0) {
                console.log(`No more artworks found at page ${page}, stopping.`);
                break;
              }
              
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          }
          break; // Found working pattern, stop trying others
        }
      }
    }
  }

  async fetchPageWithPattern(urlPattern: (page: number) => string, page: number): Promise<string> {
    try {
      const response = await fetch(urlPattern(page));
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.error(`Error with pattern page ${page}:`, error);
    }
    return '';
  }

  hasArtwork(id: string): boolean {
    return this.artworks.has(id);
  }

  addArtworks(artworks: Artwork[]): void {
    artworks.forEach(artwork => {
      this.artworks.set(artwork.id, artwork);
    });
  }

  async scrapePages(startPage: number = 1, endPage: number = 10): Promise<void> {
    console.log(`Starting enhanced scraping from pages ${startPage} to ${endPage}`);
    
    // First try the basic pagination
    for (let page = startPage; page <= Math.min(endPage, 3); page++) {
      const html = await this.fetchPage(page);
      if (!html) continue;
      
      const pageArtworks = this.parseArtworksFromHtml(html, page);
      this.addArtworks(pageArtworks);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const initialCount = this.artworks.size;
    console.log(`Initial scraping found ${initialCount} unique artworks`);
    
    // If we have very few artworks or duplicates, try alternative methods
    if (initialCount < 20) {
      await this.tryAlternativeUrls(1, endPage);
    }
    
    console.log(`Total unique artworks collected: ${this.artworks.size}`);
  }

  async saveData(filename: string = 'enhanced-artsper-artworks.json'): Promise<void> {
    const artworksArray = Array.from(this.artworks.values());
    
    // Group by category for stats
    const categoryStats: Record<string, number> = {};
    artworksArray.forEach(artwork => {
      categoryStats[artwork.category] = (categoryStats[artwork.category] || 0) + 1;
    });
    
    const data = {
      metadata: {
        scrapedAt: new Date().toISOString(),
        totalArtworks: artworksArray.length,
        uniqueArtworks: this.artworks.size,
        categories: categoryStats,
        priceRange: {
          min: Math.min(...artworksArray.map(a => parseFloat(a.price.replace(/[^0-9.]/g, '')) || 0)),
          max: Math.max(...artworksArray.map(a => parseFloat(a.price.replace(/[^0-9.]/g, '')) || 0))
        },
        source: 'artsper.com'
      },
      artworks: artworksArray
    };
    
    await writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`Enhanced data saved to ${filename}`);
  }

  getArtworks(): Artwork[] {
    return Array.from(this.artworks.values());
  }
}

// Main execution
async function main() {
  const scraper = new EnhancedArtsperScraper();
  
  try {
    await scraper.scrapePages(1, 20);
    await scraper.saveData('/Users/suin2/art-recommendation-saas/enhanced-artsper-artworks.json');
    
    const artworks = scraper.getArtworks();
    console.log(`\nEnhanced scraping completed!`);
    console.log(`Total unique artworks collected: ${artworks.length}`);
    
    if (artworks.length > 0) {
      console.log(`\nSample artworks:`);
      artworks.slice(0, 3).forEach((artwork, i) => {
        console.log(`${i + 1}. ${artwork.title} by ${artwork.artist} (${artwork.category}) - ${artwork.price}`);
        console.log(`   Image: ${artwork.imageUrl}`);
        console.log(`   URL: ${artwork.url}\n`);
      });
      
      // Show category breakdown
      const categories = artworks.reduce((acc, artwork) => {
        acc[artwork.category] = (acc[artwork.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('Category breakdown:');
      Object.entries(categories).forEach(([category, count]) => {
        console.log(`  ${category}: ${count} artworks`);
      });
    }
  } catch (error) {
    console.error('Enhanced scraping failed:', error);
  }
}

if (import.meta.main) {
  main();
}

export { EnhancedArtsperScraper };