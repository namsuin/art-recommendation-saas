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
  page: number;
}

class FinalArtsperScraper {
  private baseUrl = 'https://www.artsper.com/kr/contemporary-artworks';
  private artworks: Map<string, Artwork> = new Map();

  async fetchPage(page: number): Promise<string> {
    const url = page === 1 ? this.baseUrl : `${this.baseUrl}?page=${page}`;
    console.log(`Fetching page ${page}: ${url}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
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
    
    // Find all article elements with card-artwork class
    const articleRegex = /<article\s+class="card-artwork[^"]*"[^>]*data-id="([^"]+)"[^>]*data-url="([^"]+)"[^>]*data-category="([^"]*)"[^>]*>([\s\S]*?)<\/article>/g;
    let articleMatch;
    
    while ((articleMatch = articleRegex.exec(html)) !== null) {
      const [, artworkId, artworkUrl, category, articleContent] = articleMatch;
      
      // Extract image information
      const imgRegex = /<img[^>]*data-src="([^"]+)"[^>]*alt="([^"]+)"[^>]*data-price="([^"]*)"[^>]*data-category="([^"]*)"[^>]*>/;
      const imgMatch = articleContent.match(imgRegex);
      
      if (imgMatch) {
        const [, imageUrl, altText, priceData, imgCategory] = imgMatch;
        
        // Parse title and artist from alt text
        let title = altText.replace(/&amp;/g, '&');
        let artist = 'Unknown Artist';
        
        const titleArtistMatch = title.match(/^(.+?),\s*(.+)$/);
        if (titleArtistMatch) {
          title = titleArtistMatch[1].trim();
          artist = titleArtistMatch[2].trim();
        }
        
        // Convert price
        const priceNum = parseInt(priceData || '0');
        const formattedPrice = priceNum > 0 ? `$${(priceNum / 100).toFixed(2)}` : 'Price on request';
        
        // Look for dimensions in the article content
        const dimensionsMatch = articleContent.match(/(\d+(?:\.\d+)?\s*[×x]\s*\d+(?:\.\d+)?\s*(?:[×x]\s*\d+(?:\.\d+)?)?\s*cm)/i);
        const dimensions = dimensionsMatch ? dimensionsMatch[1] : '';
        
        const artwork: Artwork = {
          id: artworkId,
          title: title,
          artist: artist,
          medium: imgCategory || category || 'unknown',
          dimensions: dimensions,
          price: formattedPrice,
          imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://media.artsper.com${imageUrl}`,
          category: imgCategory || category || 'unknown',
          url: `https://www.artsper.com${artworkUrl}`,
          page: pageNumber
        };
        
        artworks.push(artwork);
      }
    }
    
    console.log(`Extracted ${artworks.length} artworks from page ${pageNumber}`);
    return artworks;
  }

  async scrapePages(startPage: number = 1, endPage: number = 10): Promise<void> {
    console.log(`Starting to scrape pages ${startPage} to ${endPage}`);
    
    for (let page = startPage; page <= endPage; page++) {
      const html = await this.fetchPage(page);
      if (!html) {
        console.log(`Skipping page ${page} due to fetch error`);
        continue;
      }
      
      const pageArtworks = this.parseArtworksFromHtml(html, page);
      
      // Add new artworks to the map (prevents duplicates)
      pageArtworks.forEach(artwork => {
        this.artworks.set(artwork.id, artwork);
      });
      
      if (pageArtworks.length === 0) {
        console.log(`No artworks found on page ${page}, stopping.`);
        break;
      }
      
      // Respectful delay
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log(`Total unique artworks collected: ${this.artworks.size}`);
  }

  async saveData(filename: string = 'final-artsper-artworks.json'): Promise<void> {
    const artworksArray = Array.from(this.artworks.values());
    
    // Generate statistics
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
        uniqueArtworks: this.artworks.size,
        categories: categoryStats,
        topArtists: Object.entries(artistStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .reduce((acc, [artist, count]) => ({ ...acc, [artist]: count }), {}),
        priceStats: {
          min: priceRanges.length > 0 ? Math.min(...priceRanges) : 0,
          max: priceRanges.length > 0 ? Math.max(...priceRanges) : 0,
          average: priceRanges.length > 0 ? priceRanges.reduce((a, b) => a + b, 0) / priceRanges.length : 0
        },
        source: 'artsper.com'
      },
      artworks: artworksArray
    };
    
    await writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filename}`);
  }

  getArtworks(): Artwork[] {
    return Array.from(this.artworks.values());
  }
}

// Main execution
async function main() {
  const scraper = new FinalArtsperScraper();
  
  try {
    await scraper.scrapePages(1, 10);
    await scraper.saveData('/Users/suin2/art-recommendation-saas/final-artsper-artworks.json');
    
    const artworks = scraper.getArtworks();
    console.log(`\n=== SCRAPING COMPLETED ===`);
    console.log(`Total unique artworks collected: ${artworks.length}`);
    
    if (artworks.length > 0) {
      console.log(`\n=== SAMPLE ARTWORKS ===`);
      artworks.slice(0, 5).forEach((artwork, i) => {
        console.log(`\n${i + 1}. "${artwork.title}" by ${artwork.artist}`);
        console.log(`   Category: ${artwork.category}`);
        console.log(`   Price: ${artwork.price}`);
        console.log(`   Dimensions: ${artwork.dimensions || 'Not specified'}`);
        console.log(`   Image URL: ${artwork.imageUrl}`);
        console.log(`   Artwork URL: ${artwork.url}`);
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
      
      // Artist breakdown (top 10)
      const artists = artworks.reduce((acc, artwork) => {
        acc[artwork.artist] = (acc[artwork.artist] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`\n=== TOP ARTISTS ===`);
      Object.entries(artists)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([artist, count]) => {
          console.log(`${artist}: ${count} artwork${count > 1 ? 's' : ''}`);
        });
    }
  } catch (error) {
    console.error('Scraping failed:', error);
  }
}

if (import.meta.main) {
  main();
}

export { FinalArtsperScraper };