import { writeFile } from 'fs/promises';

interface Artwork {
  id: string;
  title: string;
  artist: string;
  medium: string;
  dimensions: string;
  price: string;
  imageUrl: string;
  category: string;
  url: string;
  source: string; // which category/page it came from
}

class ComprehensiveArtsperScraper {
  private baseUrl = 'https://www.artsper.com/kr';
  private artworks: Map<string, Artwork> = new Map();

  // Different categories and sections to explore
  private categories = [
    'contemporary-artworks',
    'contemporary-artworks/painting',
    'contemporary-artworks/sculpture', 
    'contemporary-artworks/photography',
    'contemporary-artworks/print',
    'contemporary-artworks/drawing',
    'contemporary-artworks/design',
    'artworks', // general artworks section
    'affordable-art',
    'unique-pieces',
    'top-sellers'
  ];

  async fetchPage(url: string): Promise<string> {
    console.log(`Fetching: ${url}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        }
      });
      
      if (!response.ok) {
        console.log(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        return '';
      }
      return await response.text();
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      return '';
    }
  }

  parseArtworksFromHtml(html: string, sourcePage: string): Artwork[] {
    const artworks: Artwork[] = [];
    
    // Updated regex to be more flexible
    const articleRegex = /<article[^>]*class="[^"]*card-artwork[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
    let articleMatch;
    
    while ((articleMatch = articleRegex.exec(html)) !== null) {
      const articleContent = articleMatch[1];
      
      // Extract data-id from the article tag itself
      const dataIdMatch = articleMatch[0].match(/data-id="([^"]+)"/);
      if (!dataIdMatch) continue;
      const artworkId = dataIdMatch[1];
      
      // Extract data-url
      const dataUrlMatch = articleMatch[0].match(/data-url="([^"]+)"/);
      const artworkUrl = dataUrlMatch ? dataUrlMatch[1] : '';
      
      // Extract data-category
      const dataCategoryMatch = articleMatch[0].match(/data-category="([^"]*)"/);
      const dataCategory = dataCategoryMatch ? dataCategoryMatch[1] : '';
      
      // Extract image information
      const imgMatch = articleContent.match(/<img[^>]*data-src="([^"]+)"[^>]*alt="([^"]+)"[^>]*(?:data-price="([^"]*)"[^>]*)?(?:data-category="([^"]*)"[^>]*)?/);
      
      if (imgMatch) {
        const [, imageUrl, altText, priceData, imgCategory] = imgMatch;
        
        // Parse title and artist from alt text
        let title = altText.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        let artist = 'Unknown Artist';
        
        const titleArtistMatch = title.match(/^(.+?),\s*(.+)$/);
        if (titleArtistMatch) {
          title = titleArtistMatch[1].trim();
          artist = titleArtistMatch[2].trim();
        }
        
        // Extract price from different possible locations
        let price = priceData;
        if (!price) {
          const priceMatch = articleContent.match(/data-price="([^"]*)"/);
          price = priceMatch ? priceMatch[1] : '0';
        }
        
        // Convert price
        const priceNum = parseInt(price || '0');
        const formattedPrice = priceNum > 0 ? `$${(priceNum / 100).toFixed(2)}` : 'Price on request';
        
        // Look for dimensions
        const dimensionsMatch = articleContent.match(/(\d+(?:\.\d+)?\s*[×x]\s*\d+(?:\.\d+)?\s*(?:[×x]\s*\d+(?:\.\d+)?)?\s*cm)/i);
        const dimensions = dimensionsMatch ? dimensionsMatch[1] : '';
        
        // Determine category
        const category = imgCategory || dataCategory || this.getCategoryFromUrl(artworkUrl) || 'unknown';
        
        const artwork: Artwork = {
          id: artworkId,
          title: title,
          artist: artist,
          medium: category,
          dimensions: dimensions,
          price: formattedPrice,
          imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://media.artsper.com${imageUrl}`,
          category: category,
          url: artworkUrl.startsWith('http') ? artworkUrl : `https://www.artsper.com${artworkUrl}`,
          source: sourcePage
        };
        
        artworks.push(artwork);
      }
    }
    
    return artworks;
  }

  getCategoryFromUrl(url: string): string {
    const match = url.match(/contemporary-artworks\/([^\/]+)/);
    return match ? match[1] : 'contemporary';
  }

  async scrapeCategory(category: string, maxPages: number = 5): Promise<void> {
    console.log(`\n=== Scraping category: ${category} ===`);
    
    for (let page = 1; page <= maxPages; page++) {
      let url: string;
      
      if (page === 1) {
        url = `${this.baseUrl}/${category}`;
      } else {
        // Try different pagination patterns
        const paginationPatterns = [
          `${this.baseUrl}/${category}?page=${page}`,
          `${this.baseUrl}/${category}?p=${page}`,
          `${this.baseUrl}/${category}/page/${page}`
        ];
        
        // Try the first pattern, but we could enhance this later
        url = paginationPatterns[0];
      }
      
      const html = await this.fetchPage(url);
      if (!html) continue;
      
      const pageArtworks = this.parseArtworksFromHtml(html, `${category}-page-${page}`);
      
      if (pageArtworks.length === 0) {
        console.log(`No artworks found on ${category} page ${page}`);
        if (page === 1) {
          // Try alternative URL structure
          const altUrl = `${this.baseUrl}/artworks/${category.replace('contemporary-artworks/', '')}`;
          const altHtml = await this.fetchPage(altUrl);
          if (altHtml) {
            const altArtworks = this.parseArtworksFromHtml(altHtml, `${category}-alt`);
            this.addArtworks(altArtworks);
            console.log(`Found ${altArtworks.length} artworks with alternative URL`);
          }
        }
        break;
      }
      
      const newArtworks = this.addArtworks(pageArtworks);
      console.log(`Page ${page}: Found ${pageArtworks.length} artworks (${newArtworks} new)`);
      
      // If we got fewer than expected, this might be the last page
      if (pageArtworks.length < 5) {
        console.log(`Few artworks found, assuming end of category`);
        break;
      }
      
      // Respectful delay
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  addArtworks(artworks: Artwork[]): number {
    let newCount = 0;
    artworks.forEach(artwork => {
      if (!this.artworks.has(artwork.id)) {
        newCount++;
      }
      this.artworks.set(artwork.id, artwork);
    });
    return newCount;
  }

  async scrapeMultipleCategories(): Promise<void> {
    console.log('Starting comprehensive scraping across multiple categories...');
    
    for (const category of this.categories) {
      await this.scrapeCategory(category, 3);
      console.log(`Total unique artworks so far: ${this.artworks.size}`);
      
      // Longer delay between categories
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log(`\nCompleted scraping all categories. Total unique artworks: ${this.artworks.size}`);
  }

  async saveData(filename: string = 'comprehensive-artsper-artworks.json'): Promise<void> {
    const artworksArray = Array.from(this.artworks.values());
    
    // Generate comprehensive statistics
    const categoryStats: Record<string, number> = {};
    const artistStats: Record<string, number> = {};
    const sourceStats: Record<string, number> = {};
    const priceRanges: number[] = [];
    
    artworksArray.forEach(artwork => {
      categoryStats[artwork.category] = (categoryStats[artwork.category] || 0) + 1;
      artistStats[artwork.artist] = (artistStats[artwork.artist] || 0) + 1;
      sourceStats[artwork.source] = (sourceStats[artwork.source] || 0) + 1;
      
      const price = parseFloat(artwork.price.replace(/[^0-9.]/g, ''));
      if (price > 0) priceRanges.push(price);
    });
    
    const data = {
      metadata: {
        scrapedAt: new Date().toISOString(),
        totalArtworks: artworksArray.length,
        uniqueArtworks: this.artworks.size,
        categoriesScraped: this.categories,
        statistics: {
          categories: categoryStats,
          topArtists: Object.entries(artistStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20)
            .reduce((acc, [artist, count]) => ({ ...acc, [artist]: count }), {}),
          sources: sourceStats,
          priceStats: priceRanges.length > 0 ? {
            min: Math.min(...priceRanges),
            max: Math.max(...priceRanges),
            average: priceRanges.reduce((a, b) => a + b, 0) / priceRanges.length,
            count: priceRanges.length
          } : null
        },
        source: 'artsper.com'
      },
      artworks: artworksArray
    };
    
    await writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`Comprehensive data saved to ${filename}`);
  }

  getArtworks(): Artwork[] {
    return Array.from(this.artworks.values());
  }
}

// Main execution
async function main() {
  const scraper = new ComprehensiveArtsperScraper();
  
  try {
    await scraper.scrapeMultipleCategories();
    await scraper.saveData('/Users/suin2/art-recommendation-saas/comprehensive-artsper-artworks.json');
    
    const artworks = scraper.getArtworks();
    console.log(`\n=== COMPREHENSIVE SCRAPING COMPLETED ===`);
    console.log(`Total unique artworks collected: ${artworks.length}`);
    
    if (artworks.length > 0) {
      // Show diverse sample
      console.log(`\n=== DIVERSE SAMPLE OF ARTWORKS ===`);
      const sampleArtworks = artworks
        .filter((artwork, index, arr) => 
          // Get diverse sample by category
          arr.findIndex(a => a.category === artwork.category) === index || 
          index < 10
        )
        .slice(0, 10);
      
      sampleArtworks.forEach((artwork, i) => {
        console.log(`\n${i + 1}. "${artwork.title}" by ${artwork.artist}`);
        console.log(`   Category: ${artwork.category} | Price: ${artwork.price}`);
        console.log(`   Dimensions: ${artwork.dimensions || 'Not specified'}`);
        console.log(`   Source: ${artwork.source}`);
        console.log(`   Image: ${artwork.imageUrl}`);
        console.log(`   URL: ${artwork.url}`);
      });
      
      // Category breakdown
      const categories = artworks.reduce((acc, artwork) => {
        acc[artwork.category] = (acc[artwork.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`\n=== CATEGORY BREAKDOWN ===`);
      Object.entries(categories)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, count]) => {
          console.log(`${category}: ${count} artworks`);
        });
      
      // Source breakdown
      const sources = artworks.reduce((acc, artwork) => {
        acc[artwork.source] = (acc[artwork.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`\n=== SOURCE BREAKDOWN ===`);
      Object.entries(sources)
        .sort(([,a], [,b]) => b - a)
        .forEach(([source, count]) => {
          console.log(`${source}: ${count} artworks`);
        });
    }
  } catch (error) {
    console.error('Comprehensive scraping failed:', error);
  }
}

if (import.meta.main) {
  main();
}

export { ComprehensiveArtsperScraper };