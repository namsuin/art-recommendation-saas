#!/usr/bin/env bun

import axios from 'axios';

async function testArtworkExtraction() {
  console.log('Testing artwork extraction from Artsper...');
  
  try {
    const url = 'https://www.artsper.com/kr/contemporary-artworks?page=1';
    console.log(`Fetching: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      timeout: 15000
    });
    
    const html = response.data;
    console.log(`Content length: ${html.length}`);
    
    // Extract artwork articles
    const articleRegex = /<article[^>]*class="[^"]*artwork[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    let matches = [];
    let match;
    
    while ((match = articleRegex.exec(html)) !== null) {
      matches.push(match[1]);
    }
    
    console.log(`Found ${matches.length} artwork articles`);
    
    // Analyze first few artworks
    for (let i = 0; i < Math.min(5, matches.length); i++) {
      console.log(`\n--- Artwork ${i + 1} ---`);
      const artworkHtml = matches[i];
      
      // Extract various data points
      console.log('HTML snippet (first 200 chars):', artworkHtml.substring(0, 200));
      
      // Try different patterns for ID
      const idPatterns = [
        /data-artwork-id="(\d+)"/i,
        /data-product-id="(\d+)"/i,
        /data-id="(\d+)"/i,
        /href="[^"]*\/(\d+)(?:\/|"|$)/,
        /artwork\/(\d+)/i
      ];
      
      for (const pattern of idPatterns) {
        const idMatch = artworkHtml.match(pattern);
        if (idMatch) {
          console.log(`ID (${pattern.source}):`, idMatch[1]);
          break;
        }
      }
      
      // Try different patterns for title
      const titlePatterns = [
        /title="([^"]+)"/i,
        /alt="([^"]+)"/i,
        /<h[123][^>]*>([^<]+)</i,
        /class="[^"]*title[^"]*"[^>]*>([^<]+)</i
      ];
      
      for (const pattern of titlePatterns) {
        const titleMatch = artworkHtml.match(pattern);
        if (titleMatch) {
          console.log(`Title (${pattern.source}):`, titleMatch[1].trim());
          break;
        }
      }
      
      // Try patterns for artist
      const artistPatterns = [
        /by\s+([^<]+)</i,
        /artist[^>]*>([^<]+)</i,
        /class="[^"]*artist[^"]*"[^>]*>([^<]+)</i
      ];
      
      for (const pattern of artistPatterns) {
        const artistMatch = artworkHtml.match(pattern);
        if (artistMatch) {
          console.log(`Artist (${pattern.source}):`, artistMatch[1].trim());
          break;
        }
      }
      
      // Image URL
      const imgMatch = artworkHtml.match(/(?:src|data-src|data-lazy)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
      if (imgMatch) {
        console.log('Image URL:', imgMatch[1]);
      }
      
      // Price
      const pricePatterns = [
        /(\$[\d,]+(?:\.\d{2})?)/,
        /(€[\d,]+(?:\.\d{2})?)/,
        /(£[\d,]+(?:\.\d{2})?)/,
        /(₩[\d,]+)/,
        /price[^>]*>([^<]+)</i
      ];
      
      for (const pattern of pricePatterns) {
        const priceMatch = artworkHtml.match(pattern);
        if (priceMatch) {
          console.log(`Price (${pattern.source}):`, priceMatch[1].trim());
          break;
        }
      }
      
      // Dimensions
      const dimMatch = artworkHtml.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(?:x\s*(\d+(?:\.\d+)?))?\s*cm/i);
      if (dimMatch) {
        console.log('Dimensions:', dimMatch[0]);
      }
      
      // URL
      const urlMatch = artworkHtml.match(/href="([^"]+)"/);
      if (urlMatch) {
        console.log('Artwork URL:', urlMatch[1]);
      }
    }
    
    // Test pagination
    console.log('\n--- Pagination Info ---');
    const paginationRegex = /page=(\d+)["'][^>]*>(?:Last|»|끝|Dernier)/i;
    const paginationMatch = html.match(paginationRegex);
    if (paginationMatch) {
      console.log('Last page found:', paginationMatch[1]);
    }
    
    // Look for total count
    const countRegex = /(\d+(?:,\d+)?)\s*(?:artworks?|작품|œuvres?)/i;
    const countMatch = html.match(countRegex);
    if (countMatch) {
      console.log('Total artworks mentioned:', countMatch[1]);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testArtworkExtraction().catch(console.error);