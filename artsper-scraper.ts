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

class ArtsperScraper {
  private baseUrl = 'https://www.artsper.com/kr/contemporary-artworks';
  private artworks: Artwork[] = [];

  async fetchPage(page: number): Promise<string> {
    const url = page === 1 ? this.baseUrl : `${this.baseUrl}?page=${page}`;
    console.log(`Fetching page ${page}: ${url}`);
    
    try {
      const response = await fetch(url);
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
    
    // Look for artwork cards - they are <article> elements with card-artwork class
    const cardRegex = /<article[^>]*class="[^"]*card-artwork[^"]*"[^>]*data-id="([^"]+)"[^>]*data-url="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g;
    let cardMatch;
    
    while ((cardMatch = cardRegex.exec(html)) !== null) {
      const artworkId = cardMatch[1];
      const artworkUrl = cardMatch[2];
      const cardHtml = cardMatch[3];
      
      // Extract image data attributes which contain most of the info
      const imgMatch = cardHtml.match(/<img[^>]*data-src="([^"]+)"[^>]*data-srcset="([^"]+)"[^>]*alt="([^"]+)"[^>]*data-id="[^"]*"[^>]*data-artist="([^"]*)"[^>]*data-vendor="([^"]*)"[^>]*data-price="([^"]*)"[^>]*data-category="([^"]*)"[^>]*>/);
      
      if (imgMatch) {
        const [, imageUrl, srcSet, altText, artistId, vendorId, price, category] = imgMatch;
        
        // Extract title and artist from alt text (format: "Title, Artist Name")
        const titleArtistMatch = altText.match(/^(.+?),\s*(.+)$/);
        let title = altText;
        let artist = 'Unknown';
        
        if (titleArtistMatch) {
          title = titleArtistMatch[1].trim();
          artist = titleArtistMatch[2].trim();
        }
        
        // Look for dimensions in the card HTML
        const dimensionsMatch = cardHtml.match(/<div[^>]*class="[^"]*card-artwork__text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        let dimensions = '';
        
        if (dimensionsMatch) {
          // Extract dimensions from text content
          const textContent = dimensionsMatch[1].replace(/<[^>]*>/g, '').trim();
          const dimMatch = textContent.match(/(\d+(?:\.\d+)?\s*×\s*\d+(?:\.\d+)?\s*(?:×\s*\d+(?:\.\d+)?)?\s*cm)/);
          if (dimMatch) {
            dimensions = dimMatch[1];
          }
        }
        
        // Convert price from cents to formatted price
        const priceNum = parseInt(price);
        const formattedPrice = priceNum > 0 ? `$${(priceNum / 100).toFixed(2)}` : 'Price on request';
        
        artworks.push({
          id: artworkId,
          title: title,
          artist: artist,
          artistUrl: '', // Would need separate API call to get artist URL
          medium: category,
          dimensions: dimensions,
          price: formattedPrice,
          imageUrl: imageUrl,
          category: category,
          url: `https://www.artsper.com${artworkUrl}`,
          page: pageNumber
        });
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
      this.artworks.push(...pageArtworks);
      
      // Add delay to be respectful to the server
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`Total artworks collected: ${this.artworks.length}`);
  }

  async saveData(filename: string = 'artsper-artworks.json'): Promise<void> {
    const data = {
      metadata: {
        scrapedAt: new Date().toISOString(),
        totalArtworks: this.artworks.length,
        pages: [...new Set(this.artworks.map(a => a.page))],
        source: 'artsper.com'
      },
      artworks: this.artworks
    };
    
    await writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filename}`);
  }

  getArtworks(): Artwork[] {
    return this.artworks;
  }
}

// Main execution
async function main() {
  const scraper = new ArtsperScraper();
  
  try {
    await scraper.scrapePages(1, 10);
    await scraper.saveData('/Users/suin2/art-recommendation-saas/artsper-artworks.json');
    
    const artworks = scraper.getArtworks();
    console.log(`\nScraping completed!`);
    console.log(`Total artworks collected: ${artworks.length}`);
    console.log(`Data saved to: artsper-artworks.json`);
    
    if (artworks.length > 0) {
      console.log(`\nSample artwork:`);
      console.log(JSON.stringify(artworks[0], null, 2));
    }
  } catch (error) {
    console.error('Scraping failed:', error);
  }
}

if (import.meta.main) {
  main();
}

export { ArtsperScraper };