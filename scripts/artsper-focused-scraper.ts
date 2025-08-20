#!/usr/bin/env bun

import axios from 'axios';
import * as fs from 'fs';
import { setTimeout } from 'timers/promises';

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

class ArtsperFocusedScraper {
  private baseUrl = 'https://www.artsper.com';
  private artworks = new Map<string, Artwork>();
  private delayMs = 1500; // 1.5 seconds between requests (safer)
  private maxRetries = 3;
  private saveEvery = 500; // Save every 500 artworks

  async scrapeAllArtworks(startPage = 1, endPage = 538) {
    console.log('🎨 Starting focused Artsper artwork collection...');
    console.log(`📊 Scraping pages ${startPage} to ${endPage}`);
    console.log(`⏱️ Estimated time: ${Math.ceil((endPage - startPage + 1) * 1.5 / 60)} minutes`);
    console.log(`🎯 Expected ~${(endPage - startPage + 1) * 101} artworks`);
    
    const baseUrl = `${this.baseUrl}/kr/contemporary-artworks`;
    let failedPages = [];
    
    try {
      for (let page = startPage; page <= endPage; page++) {
        console.log(`\n📄 Scraping page ${page}/${endPage} (${((page - startPage + 1) / (endPage - startPage + 1) * 100).toFixed(1)}%)`);
        
        const success = await this.scrapePage(baseUrl, page);
        if (!success) {
          failedPages.push(page);
          console.log(`❌ Failed to scrape page ${page}`);
        }
        
        // Progress update
        console.log(`✅ Total artworks collected: ${this.artworks.size}`);
        
        // Save progress periodically
        if (this.artworks.size % this.saveEvery === 0) {
          await this.saveProgress(page);
        }
        
        // Rate limiting delay
        if (page < endPage) {
          await setTimeout(this.delayMs);
        }
      }
      
      // Retry failed pages
      if (failedPages.length > 0) {
        console.log(`\n🔄 Retrying ${failedPages.length} failed pages...`);
        for (const page of failedPages) {
          console.log(`🔄 Retry page ${page}`);
          await this.scrapePage(baseUrl, page);
          await setTimeout(this.delayMs * 2); // Longer delay for retries
        }
      }
      
      // Final save
      await this.saveFinalResults();
      
    } catch (error) {
      console.error('❌ Error during scraping:', error);
      await this.saveFinalResults();
    }
  }

  async scrapePage(baseUrl: string, page: number): Promise<boolean> {
    const url = `${baseUrl}?page=${page}`;
    
    for (let retry = 0; retry < this.maxRetries; retry++) {
      try {
        const response = await this.makeRequest(url);
        if (!response) continue;
        
        const html = response.data;
        const artworksFound = this.extractArtworks(html, 'contemporary', page);
        
        if (artworksFound > 0) {
          console.log(`✅ Page ${page}: Found ${artworksFound} new artworks`);
          return true;
        } else {
          console.log(`⚠️ Page ${page}: No artworks found`);
          return false;
        }
        
      } catch (error) {
        console.error(`❌ Retry ${retry + 1}/${this.maxRetries} for page ${page}:`, error.message);
        if (retry < this.maxRetries - 1) {
          await setTimeout(this.delayMs * (retry + 1));
        }
      }
    }
    
    return false;
  }

  async makeRequest(url: string) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 20000,
        maxRedirects: 5
      });
      return response;
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('⚠️ Rate limited, waiting 30 seconds...');
        await setTimeout(30000);
      }
      throw error;
    }
  }

  extractArtworks(html: string, category: string, page: number): number {
    let newCount = 0;
    
    // Extract from article elements - improved pattern based on testing
    const articleRegex = /<article[^>]*class="[^"]*artwork[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    let match;
    
    while ((match = articleRegex.exec(html)) !== null) {
      const artworkHtml = match[1];
      
      try {
        // Extract ID from data-id attribute or href
        const idMatch = artworkHtml.match(/data-id="(\d+)"/i) ||
                       artworkHtml.match(/href="[^"]*\/(\d+)\/[^"]*"/i);
        const id = idMatch ? idMatch[1] : `${category}_${Date.now()}_${Math.random()}`;
        
        // Skip if already collected
        if (this.artworks.has(id)) continue;
        
        // Extract title from the URL path
        const urlMatch = artworkHtml.match(/href="\/[^"]*\/[^"]*\/(\d+)\/([^"]+)"/i);
        let title = 'Untitled';
        if (urlMatch && urlMatch[2]) {
          title = this.decodeHtml(urlMatch[2].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
        }
        
        // Extract artist 
        let artist = 'Unknown Artist';
        const artistMatch = artworkHtml.match(/<(?:h2|span|div)[^>]*class="[^"]*(?:artist|author)[^"]*"[^>]*>([^<]+)</i) ||
                           artworkHtml.match(/by\s+([^<,\n]+)/i);
        if (artistMatch) {
          artist = this.decodeHtml(artistMatch[1].trim());
        }
        
        // Extract image URL
        const imgMatch = artworkHtml.match(/src="(https:\/\/media\.artsper\.com\/artwork\/[^"]+)"/);
        let imageUrl = '';
        if (imgMatch) {
          imageUrl = imgMatch[1];
        }
        
        // Extract dimensions
        const sizeMatch = artworkHtml.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(?:x\s*(\d+(?:\.\d+)?))?\s*cm/i);
        const dimensions = sizeMatch ? sizeMatch[0] : 'Dimensions not specified';
        
        // Extract price
        const priceMatch = artworkHtml.match(/(\$[\d,]+(?:\.\d{2})?)/) ||
                          artworkHtml.match(/(€[\d,]+(?:\.\d{2})?)/) ||
                          artworkHtml.match(/(£[\d,]+(?:\.\d{2})?)/) ||
                          artworkHtml.match(/(₩[\d,]+)/) ||
                          artworkHtml.match(/data-price="(\d+)"/i);
        let price = 'Price on request';
        if (priceMatch) {
          if (priceMatch[1].match(/^[\$€£₩]/)) {
            price = priceMatch[1];
          } else {
            const priceValue = parseInt(priceMatch[1]);
            price = `$${(priceValue / 100).toFixed(2)}`;
          }
        }
        
        // Extract artwork URL - get the full link to the artwork page
        let artworkUrl = '';
        const linkMatch = artworkHtml.match(/href="([^"]+)"/);
        if (linkMatch) {
          artworkUrl = linkMatch[1];
          if (!artworkUrl.startsWith('http')) {
            artworkUrl = `https://www.artsper.com${artworkUrl}`;
          }
        }
        
        // Extract medium from URL path
        const mediumMatch = artworkHtml.match(/href="\/[^"]*\/(painting|sculpture|photography|print|drawing|design|collage|mixed-media|installation|digital-art|textile)\//) ||
                           artworkHtml.match(/data-category="([^"]+)"/);
        const medium = mediumMatch ? mediumMatch[1] : 'contemporary';
        
        // Create artwork object
        const artwork: Artwork = {
          id,
          title,
          artist,
          medium,
          dimensions,
          price,
          imageUrl,
          category,
          url: artworkUrl,
          source: `artsper_page_${page}`
        };
        
        // Add if has essential data
        if (id && imageUrl) {
          this.artworks.set(id, artwork);
          newCount++;
        }
        
      } catch (error) {
        // Silent fail for individual artworks
      }
    }
    
    return newCount;
  }

  decodeHtml(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  }

  async saveProgress(currentPage: number) {
    const filename = `artsper-progress-page-${currentPage}.json`;
    const data = {
      metadata: {
        scrapedAt: new Date().toISOString(),
        currentPage,
        totalArtworks: this.artworks.size,
        source: 'artsper.com',
        status: 'in_progress'
      },
      artworks: Array.from(this.artworks.values())
    };
    
    await fs.promises.writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`💾 Progress saved: ${this.artworks.size} artworks in ${filename}`);
  }

  async saveFinalResults() {
    const filename = `artsper-complete-${Date.now()}.json`;
    const data = {
      metadata: {
        scrapedAt: new Date().toISOString(),
        totalArtworks: this.artworks.size,
        source: 'artsper.com',
        scrapeComplete: true,
        pagesScraped: '1-538'
      },
      artworks: Array.from(this.artworks.values())
    };
    
    await fs.promises.writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`\n🎉 Scraping complete! ${this.artworks.size} artworks saved to ${filename}`);
    
    // Also save a CSV for easier analysis
    await this.saveCsv(filename.replace('.json', '.csv'));
  }
  
  async saveCsv(filename: string) {
    const headers = ['id', 'title', 'artist', 'medium', 'dimensions', 'price', 'imageUrl', 'category', 'url', 'source'];
    const csvRows = [headers.join(',')];
    
    for (const artwork of this.artworks.values()) {
      const row = headers.map(header => {
        const value = artwork[header] || '';
        return `"${value.toString().replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    }
    
    await fs.promises.writeFile(filename, csvRows.join('\n'));
    console.log(`📊 CSV saved: ${filename}`);
  }
}

// Command line interface
const args = process.argv.slice(2);
const startPage = args[0] ? parseInt(args[0]) : 1;
const endPage = args[1] ? parseInt(args[1]) : 538;

console.log('🚀 Artsper Focused Scraper v3.0');
console.log('=================================');
console.log('Usage: bun artsper-focused-scraper.ts [startPage] [endPage]');
console.log('Example: bun artsper-focused-scraper.ts 1 538');
console.log('=================================\n');

const scraper = new ArtsperFocusedScraper();
scraper.scrapeAllArtworks(startPage, endPage).catch(console.error);