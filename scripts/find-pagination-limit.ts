#!/usr/bin/env bun

import axios from 'axios';
import { setTimeout } from 'timers/promises';

class PaginationLimitFinder {
  private baseUrl = 'https://www.artsper.com';
  
  async findLimit() {
    console.log('Finding exact pagination limit...');
    
    const baseUrl = 'https://www.artsper.com/kr/contemporary-artworks';
    
    // Binary search to find the exact limit
    let low = 500; // We know this works
    let high = 2000; // We know this gives fewer results
    let lastValidPage = 500;
    
    console.log('Using binary search to find exact limit...');
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      console.log(`\nTesting page ${mid} (range: ${low}-${high})`);
      
      try {
        const url = `${baseUrl}?page=${mid}`;
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          timeout: 10000
        });
        
        const artworkCount = this.countArtworks(response.data);
        console.log(`Page ${mid}: ${artworkCount} artworks`);
        
        if (artworkCount >= 50) { // Consider >= 50 as "full" page
          lastValidPage = mid;
          low = mid + 1;
          console.log(`Page ${mid} is valid, searching higher`);
        } else {
          high = mid - 1;
          console.log(`Page ${mid} has few artworks, searching lower`);
        }
        
        await setTimeout(1500); // Rate limiting
        
      } catch (error) {
        console.log(`Page ${mid}: Error - ${error.message}`);
        high = mid - 1;
      }
    }
    
    console.log(`\nLast valid page found: ${lastValidPage}`);
    
    // Test a few pages around the limit for confirmation
    console.log('\nConfirming limit with nearby pages...');
    const testPages = [];
    for (let i = lastValidPage - 5; i <= lastValidPage + 10; i++) {
      if (i > 0) testPages.push(i);
    }
    
    const results = [];
    for (const page of testPages) {
      try {
        const url = `${baseUrl}?page=${page}`;
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          timeout: 10000
        });
        
        const artworkCount = this.countArtworks(response.data);
        results.push({ page, artworks: artworkCount });
        console.log(`Page ${page}: ${artworkCount} artworks`);
        
        await setTimeout(1000);
        
      } catch (error) {
        results.push({ page, artworks: 0, error: error.message });
        console.log(`Page ${page}: Error`);
      }
    }
    
    // Calculate estimated total artworks
    const fullPageCount = lastValidPage;
    const artworksPerPage = 101;
    const estimatedTotal = fullPageCount * artworksPerPage;
    
    console.log(`\n--- Results ---`);
    console.log(`Last full page: ${lastValidPage}`);
    console.log(`Estimated total artworks: ${estimatedTotal.toLocaleString()}`);
    console.log(`This would be ${Math.floor(estimatedTotal / 1000)}k+ artworks available`);
    
    return { lastValidPage, estimatedTotal };
  }
  
  countArtworks(html: string): number {
    const matches = html.match(/<article[^>]*class="[^"]*artwork[^"]*"/gi);
    return matches ? matches.length : 0;
  }
}

const finder = new PaginationLimitFinder();
finder.findLimit().catch(console.error);