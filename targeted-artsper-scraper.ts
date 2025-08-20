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
  source: string;
}

class TargetedArtsperScraper {
  private baseUrl = 'https://www.artsper.com/kr';
  private artworks: Map<string, Artwork> = new Map();

  // Focus on categories that worked
  private workingCategories = [
    'contemporary-artworks',
    'contemporary-artworks/painting',
    'contemporary-artworks/sculpture', 
    'contemporary-artworks/photography',
    'contemporary-artworks/print',
    'contemporary-artworks/drawing',
    'contemporary-artworks/design'
  ];

  async fetchPage(url: string): Promise<string> {
    console.log(`Fetching: ${url}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        console.log(`Failed: ${response.status} ${response.statusText}`);
        return '';
      }
      return await response.text();
    } catch (error) {
      console.error(`Error: ${error}`);
      return '';
    }
  }

  parseArtworksFromHtml(html: string, sourcePage: string): Artwork[] {
    const artworks: Artwork[] = [];
    const articleRegex = /<article[^>]*class="[^"]*card-artwork[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
    let articleMatch;
    
    while ((articleMatch = articleRegex.exec(html)) !== null) {
      const articleContent = articleMatch[1];
      const fullArticle = articleMatch[0];
      
      const dataIdMatch = fullArticle.match(/data-id="([^"]+)"/);
      if (!dataIdMatch) continue;
      const artworkId = dataIdMatch[1];
      
      const dataUrlMatch = fullArticle.match(/data-url="([^"]+)"/);
      const artworkUrl = dataUrlMatch ? dataUrlMatch[1] : '';
      
      const dataCategoryMatch = fullArticle.match(/data-category="([^"]*)"/);
      const dataCategory = dataCategoryMatch ? dataCategoryMatch[1] : '';
      
      const imgMatch = articleContent.match(/<img[^>]*data-src="([^"]+)"[^>]*alt="([^"]+)"[^>]*(?:data-price="([^"]*)"[^>]*)?/);
      
      if (imgMatch) {
        const [, imageUrl, altText, priceData] = imgMatch;
        
        let title = altText.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        let artist = 'Unknown Artist';
        
        const titleArtistMatch = title.match(/^(.+?),\s*(.+)$/);
        if (titleArtistMatch) {
          title = titleArtistMatch[1].trim();
          artist = titleArtistMatch[2].trim();
        }
        
        let price = priceData;
        if (!price) {
          const priceMatch = articleContent.match(/data-price="([^"]*)"/);
          price = priceMatch ? priceMatch[1] : '0';
        }
        
        const priceNum = parseInt(price || '0');
        const formattedPrice = priceNum > 0 ? `$${(priceNum / 100).toFixed(2)}` : 'Price on request';
        
        const dimensionsMatch = articleContent.match(/(\d+(?:\.\d+)?\s*[×x]\s*\d+(?:\.\d+)?\s*(?:[×x]\s*\d+(?:\.\d+)?)?\s*cm)/i);
        const dimensions = dimensionsMatch ? dimensionsMatch[1] : '';
        
        const category = dataCategory || this.getCategoryFromUrl(artworkUrl) || 'contemporary';
        
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

  async scrapeTargetedCategories(): Promise<void> {
    console.log('Starting targeted scraping...');
    
    for (const category of this.workingCategories) {
      console.log(`\n=== Scraping: ${category} ===`);
      
      // Get first 2 pages of each category to maximize diversity
      for (let page = 1; page <= 2; page++) {
        const url = page === 1 ? 
          `${this.baseUrl}/${category}` : 
          `${this.baseUrl}/${category}?page=${page}`;
        
        const html = await this.fetchPage(url);
        if (!html) continue;
        
        const pageArtworks = this.parseArtworksFromHtml(html, `${category}-page-${page}`);
        const newCount = this.addArtworks(pageArtworks);
        
        console.log(`Page ${page}: ${pageArtworks.length} found, ${newCount} new. Total: ${this.artworks.size}`);
        
        // Save periodically
        if (this.artworks.size % 500 === 0) {
          await this.saveData('/Users/suin2/art-recommendation-saas/targeted-artsper-artworks-partial.json');
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      // Save after each category
      await this.saveData('/Users/suin2/art-recommendation-saas/targeted-artsper-artworks.json');
      console.log(`Category completed. Total unique artworks: ${this.artworks.size}`);
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

  async saveData(filename: string): Promise<void> {
    const artworksArray = Array.from(this.artworks.values());
    
    const categoryStats: Record<string, number> = {};
    const artistStats: Record<string, number> = {};
    const priceRanges: number[] = [];
    
    artworksArray.forEach(artwork => {
      categoryStats[artwork.category] = (categoryStats[artwork.category] || 0) + 1;
      artistStats[artwork.artist] = (artistStats[artwork.artist] || 0) + 1;
      
      const price = parseFloat(artwork.price.replace(/[^0-9.]/g, ''));
      if (price > 0) priceRanges.push(price);
    });
    
    const data = {
      metadata: {
        scrapedAt: new Date().toISOString(),
        totalArtworks: artworksArray.length,
        categories: categoryStats,
        topArtists: Object.entries(artistStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 20)
          .reduce((acc, [artist, count]) => ({ ...acc, [artist]: count }), {}),
        priceStats: priceRanges.length > 0 ? {
          min: Math.min(...priceRanges),
          max: Math.max(...priceRanges),
          average: priceRanges.reduce((a, b) => a + b, 0) / priceRanges.length
        } : null,
        source: 'artsper.com'
      },
      artworks: artworksArray
    };
    
    await writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filename}`);
  }
}

async function main() {
  const scraper = new TargetedArtsperScraper();
  
  try {
    await scraper.scrapeTargetedCategories();
    
    console.log('\n=== SCRAPING COMPLETED ===');
    console.log(`Check the saved JSON file for complete data.`);
    
  } catch (error) {
    console.error('Scraping failed:', error);
  }
}

if (import.meta.main) {
  main();
}