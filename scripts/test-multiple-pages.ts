#!/usr/bin/env bun

import axios from 'axios';
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

class ArtsperMultiPageTester {
  private baseUrl = 'https://www.artsper.com';
  private allArtworks = new Map<string, Artwork>();
  
  async testMultiplePages(maxPages = 10) {
    console.log(`Testing multiple pages (1 to ${maxPages})...`);
    
    const baseUrl = 'https://www.artsper.com/kr/contemporary-artworks';
    
    for (let page = 1; page <= maxPages; page++) {
      try {
        console.log(`\n--- Testing Page ${page} ---`);
        const url = `${baseUrl}?page=${page}`;
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          },
          timeout: 15000
        });
        
        const artworks = this.extractArtworks(response.data, 'all', page);
        
        console.log(`Page ${page}: Found ${artworks.length} artworks`);
        
        // Track unique artworks
        let newCount = 0;
        for (const artwork of artworks) {
          if (!this.allArtworks.has(artwork.id)) {
            this.allArtworks.set(artwork.id, artwork);
            newCount++;
          }
        }
        
        console.log(`Page ${page}: ${newCount} new unique artworks (total: ${this.allArtworks.size})`);
        
        // Show sample from this page
        if (artworks.length > 0) {
          const sample = artworks[0];
          console.log(`Sample: "${sample.title}" by ${sample.artist} - ${sample.price}`);
        }
        
        // Delay between requests
        if (page < maxPages) {
          console.log('Waiting 2 seconds...');
          await setTimeout(2000);
        }
        
      } catch (error) {
        console.error(`Error on page ${page}:`, error.message);
        if (error.response?.status === 404) {
          console.log(`Page ${page} not found - might be the limit`);
          break;
        }
      }
    }
    
    console.log(`\n--- Final Results ---`);
    console.log(`Total unique artworks collected: ${this.allArtworks.size}`);
    console.log(`Expected from ${Math.min(maxPages, 10)} pages: ${Math.min(maxPages, 10) * 101}`);
    console.log(`Actual collection rate: ${(this.allArtworks.size / (Math.min(maxPages, 10) * 101) * 100).toFixed(1)}%`);
    
    // Test a high page number to see limits
    console.log(`\n--- Testing High Page Numbers ---`);
    const testPages = [100, 500, 1000, 1500, 2000];
    
    for (const testPage of testPages) {
      try {
        const url = `${baseUrl}?page=${testPage}`;
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          },
          timeout: 10000
        });
        
        const artworks = this.extractArtworks(response.data, 'all', testPage);
        console.log(`Page ${testPage}: ${artworks.length} artworks found`);
        
        if (artworks.length === 0) {
          console.log(`Page ${testPage}: No artworks - this might be beyond the limit`);
          break;
        }
        
        await setTimeout(1000);
        
      } catch (error) {
        console.log(`Page ${testPage}: Error - ${error.message}`);
        if (error.response?.status === 404) {
          console.log(`Page ${testPage}: Not found - limit reached`);
          break;
        }
      }
    }
  }
  
  extractArtworks(html: string, category: string, page: number): Artwork[] {
    const artworks: Artwork[] = [];
    
    // Extract from article elements - improved pattern based on actual HTML structure
    const articleRegex = /<article[^>]*class="[^"]*artwork[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    let match;
    
    while ((match = articleRegex.exec(html)) !== null) {
      const artworkHtml = match[1];
      
      try {
        // Extract ID from data-id attribute or href
        const idMatch = artworkHtml.match(/data-id="(\d+)"/i) ||
                       artworkHtml.match(/href="[^"]*\/(\d+)\/[^"]*"/i);
        const id = idMatch ? idMatch[1] : `${category}_${Date.now()}_${Math.random()}`;
        
        // Extract title from the URL path - this seems more reliable
        const urlMatch = artworkHtml.match(/href="\/[^"]*\/[^"]*\/(\d+)\/([^"]+)"/i);
        let title = 'Untitled';
        if (urlMatch && urlMatch[2]) {
          title = this.decodeHtml(urlMatch[2].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
        }
        
        // Extract artist from data-artist or other patterns
        let artist = 'Unknown Artist';
        
        // Try to find artist name in the HTML - need to look for actual artist display
        const artistMatch = artworkHtml.match(/<(?:h2|span|div)[^>]*class="[^"]*(?:artist|author)[^"]*"[^>]*>([^<]+)</i) ||
                           artworkHtml.match(/by\s+([^<,\n]+)/i);
        if (artistMatch) {
          artist = this.decodeHtml(artistMatch[1].trim());
        }
        
        // Extract image URL - this pattern works
        const imgMatch = artworkHtml.match(/src="(https:\/\/media\.artsper\.com\/artwork\/[^"]+)"/);
        let imageUrl = '';
        if (imgMatch) {
          imageUrl = imgMatch[1];
        }
        
        // Extract dimensions
        const sizeMatch = artworkHtml.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(?:x\s*(\d+(?:\.\d+)?))?\s*cm/i);
        const dimensions = sizeMatch ? sizeMatch[0] : 'Dimensions not specified';
        
        // Extract price - improved patterns
        const priceMatch = artworkHtml.match(/(\$[\d,]+(?:\.\d{2})?)/) ||
                          artworkHtml.match(/(€[\d,]+(?:\.\d{2})?)/) ||
                          artworkHtml.match(/(£[\d,]+(?:\.\d{2})?)/) ||
                          artworkHtml.match(/(₩[\d,]+)/) ||
                          artworkHtml.match(/data-price="(\d+)"/i);
        let price = 'Price on request';
        if (priceMatch) {
          if (priceMatch[1].startsWith('$') || priceMatch[1].startsWith('€') || priceMatch[1].startsWith('£') || priceMatch[1].startsWith('₩')) {
            price = priceMatch[1];
          } else {
            // Convert data-price to USD (assuming it's in cents/lowest unit)
            const priceValue = parseInt(priceMatch[1]);
            price = `$${(priceValue / 100).toFixed(2)}`;
          }
        }
        
        // Extract URL
        let artworkUrl = '';
        if (urlMatch) {
          const fullMatch = artworkHtml.match(/href="([^"]+)"/);
          if (fullMatch) {
            artworkUrl = `${this.baseUrl}${fullMatch[1]}`;
          }
        }
        
        // Extract medium/category from URL path
        const mediumMatch = artworkHtml.match(/href="\/[^"]*\/(painting|sculpture|photography|print|drawing|design|collage|mixed-media|installation|digital-art|textile)\//) ||
                           artworkHtml.match(/data-category="([^"]+)"/);
        const medium = mediumMatch ? mediumMatch[1] : category;
        
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
          source: `${category}_page_${page}`
        };
        
        // Add if has minimum required data (ID and image are essential)
        if (id && imageUrl) {
          artworks.push(artwork);
        }
        
      } catch (error) {
        console.log(`Error extracting artwork: ${error.message}`);
      }
    }
    
    return artworks;
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
}

const tester = new ArtsperMultiPageTester();
tester.testMultiplePages(10).catch(console.error);