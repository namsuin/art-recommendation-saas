#!/usr/bin/env bun

import * as fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface ArtsperArtwork {
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

async function extractArtistFromArtsperPage(url: string): Promise<string> {
  try {
    console.log(`  📝 Fetching: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // First try to extract from page title which has format: "Artwork Title by Artist Name, Year"
    const pageTitle = $('title').text();
    const titleMatch = pageTitle.match(/by\s+([^,]+),/);
    if (titleMatch && titleMatch[1]) {
      const artistName = titleMatch[1].trim();
      if (artistName && !artistName.toLowerCase().includes('unknown')) {
        console.log(`  ✅ Found artist in title: ${artistName}`);
        return artistName;
      }
    }
    
    // Try meta tags
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const metaMatch = metaDescription.match(/by\s+([^\.]+)\./);
    if (metaMatch && metaMatch[1]) {
      const artistName = metaMatch[1].trim();
      if (artistName && !artistName.toLowerCase().includes('unknown')) {
        console.log(`  ✅ Found artist in meta: ${artistName}`);
        return artistName;
      }
    }
    
    // Multiple selectors to find artist name
    const selectors = [
      'a.artist-name',
      '.artist-name a',
      '.artwork-artist a',
      '.artist-link',
      'h2.artist-name',
      '[data-testid="artist-name"]',
      '.artwork-details .artist',
      'meta[property="artsper:artist"]',
      'a[href*="/artist/"] span',
      'a[href*="/artist/"]'
    ];
    
    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        let artistName = '';
        
        // Try getting content attribute for meta tags
        if (selector.includes('meta')) {
          artistName = element.attr('content') || '';
        } else {
          artistName = element.text().trim();
        }
        
        // Clean up the artist name
        artistName = artistName
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (artistName && artistName !== '' && !artistName.toLowerCase().includes('unknown')) {
          console.log(`  ✅ Found artist: ${artistName}`);
          return artistName;
        }
      }
    }
    
    // Try to find artist in JSON-LD structured data
    const jsonLdScripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < jsonLdScripts.length; i++) {
      try {
        const jsonData = JSON.parse($(jsonLdScripts[i]).html() || '{}');
        if (jsonData.artist?.name) {
          console.log(`  ✅ Found artist in JSON-LD: ${jsonData.artist.name}`);
          return jsonData.artist.name;
        }
        if (jsonData.creator?.name) {
          console.log(`  ✅ Found creator in JSON-LD: ${jsonData.creator.name}`);
          return jsonData.creator.name;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    
    console.log(`  ❌ No artist found`);
    return 'Unknown Artist';
  } catch (error: any) {
    console.error(`  ⚠️ Error fetching ${url}: ${error.message}`);
    return 'Unknown Artist';
  }
}

async function fixRealArtistNames() {
  console.log('🎨 Fetching REAL artist names from Artsper...\n');
  
  // Check if we have previous progress
  let updatedArtworks: ArtsperArtwork[] = [];
  let data: any = {};
  let startBatch = 0;
  let totalFixed = 0;
  
  // Check for previous progress file
  const progressFile = './artsper-with-real-artists.json';
  if (fs.existsSync(progressFile)) {
    console.log('📂 Found previous progress, continuing from where we left off...\n');
    data = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
    updatedArtworks = data.artworks || [];
    totalFixed = data.metadata?.fixedCount || 0;
    startBatch = Math.floor(totalFixed / 100); // We process 100 at a time
    console.log(`✅ Already fixed ${totalFixed} artist names, starting from batch ${startBatch + 1}\n`);
  } else {
    // Load the original JSON file
    const filePath = './artsper-complete-1755699137005.json';
    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found:', filePath);
      return;
    }
    
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    updatedArtworks = data.artworks || [];
  }
  
  const artworks: ArtsperArtwork[] = updatedArtworks;
  
  console.log(`📊 Found ${artworks.length} artworks\n`);
  
  // Filter artworks that need fixing
  const unknownArtworks = artworks.filter(a => a.artist === 'Unknown Artist' && a.url);
  console.log(`❗ ${unknownArtworks.length} artworks need artist names\n`);
  
  if (unknownArtworks.length === 0) {
    console.log('✅ No artworks need fixing!');
    return;
  }
  
  // Process in batches to avoid overwhelming the server
  const batchSize = 100; // Process 100 at a time
  const totalBatches = Math.ceil(unknownArtworks.length / batchSize);
  
  console.log(`📦 Processing in ${totalBatches} batches of ${batchSize} artworks each\n`);
  
  // totalFixed is already set from previous progress
  // updatedArtworks is already loaded
  
  for (let batchNum = startBatch; batchNum < totalBatches; batchNum++) {
    const start = batchNum * batchSize;
    const end = Math.min(start + batchSize, unknownArtworks.length);
    const batch = unknownArtworks.slice(start, end);
    
    console.log(`\n📝 Processing batch ${batchNum + 1}/${totalBatches} (artworks ${start + 1}-${end})...\n`);
    
    for (let i = 0; i < batch.length; i++) {
      const artwork = batch[i];
      const globalIndex = start + i;
      
      process.stdout.write(`\r  Progress: ${i + 1}/${batch.length} (Total: ${globalIndex + 1}/${unknownArtworks.length})`);
      
      if (artwork.url) {
        const artistName = await extractArtistFromArtsperPage(artwork.url);
        
        if (artistName !== 'Unknown Artist') {
          // Update in the main array
          const originalIndex = updatedArtworks.findIndex(a => a.id === artwork.id);
          if (originalIndex !== -1) {
            updatedArtworks[originalIndex].artist = artistName;
            totalFixed++;
          }
        }
        
        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    // Save progress after each batch
    const progressFile = `./artsper-artists-progress-batch-${batchNum + 1}.json`;
    fs.writeFileSync(progressFile, JSON.stringify({
      batchNumber: batchNum + 1,
      totalBatches: totalBatches,
      fixedCount: totalFixed,
      timestamp: new Date().toISOString(),
      artworks: updatedArtworks
    }, null, 2));
    
    console.log(`\n💾 Saved progress to ${progressFile}`);
    console.log(`✅ Fixed ${totalFixed} artist names so far\n`);
  }
  
  // Save final result
  const outputPath = './artsper-with-real-artists.json';
  fs.writeFileSync(outputPath, JSON.stringify({
    ...data,
    artworks: updatedArtworks,
    metadata: {
      ...data.metadata,
      artistsFixed: true,
      fixedCount: totalFixed,
      fixedAt: new Date().toISOString(),
      fixMethod: 'real-scraping'
    }
  }, null, 2));
  
  console.log(`\n💾 Saved final data to ${outputPath}`);
  console.log(`\n🎉 Fixed ${totalFixed} real artist names!`);
  
  // Now update the dashboard data
  console.log('\n📋 Updating dashboard data with real artist names...');
  
  // Transform to dashboard format
  const dashboardArtworks = updatedArtworks.map((artwork, index) => {
    // Parse price
    let priceValue = 0;
    if (artwork.price && artwork.price !== 'Price on request') {
      const priceMatch = artwork.price.match(/[\d,]+(?:\.\d{2})?/);
      if (priceMatch) {
        priceValue = parseFloat(priceMatch[0].replace(/,/g, ''));
      }
    }
    
    // Generate realistic metadata
    const views = Math.floor(Math.random() * 1000) + 10;
    const likes = Math.floor(views * (Math.random() * 0.15 + 0.01));
    const daysAgo = Math.floor(Math.random() * 90);
    
    return {
      id: `artsper-${artwork.id}`,
      title: artwork.title || 'Untitled',
      artist: artwork.artist || 'Unknown Artist',
      artist_email: `artist${artwork.id}@artsper.com`,
      registration_date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
      approval_date: new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000).toISOString(),
      image_url: artwork.imageUrl,
      description: `${artwork.medium || 'Artwork'} from Artsper collection. ${artwork.dimensions || ''}`.trim(),
      price: priceValue,
      category: artwork.category || artwork.medium || 'Contemporary',
      medium: artwork.medium || 'Mixed Media',
      dimensions: artwork.dimensions || 'Dimensions not specified',
      views: views,
      likes: likes,
      artwork_url: artwork.url
    };
  });
  
  // Calculate summary
  const summary = {
    total_artworks: dashboardArtworks.length,
    approved: dashboardArtworks.filter(a => a.status === 'approved').length,
    pending: 0,
    rejected: 0,
    total_value: dashboardArtworks.reduce((sum, a) => sum + a.price, 0),
    average_price: dashboardArtworks.reduce((sum, a) => sum + a.price, 0) / dashboardArtworks.length
  };
  
  // Create TypeScript export file
  const dataContent = `// Artsper Artworks with Real Artist Names
// Generated at ${new Date().toISOString()}
// Total artworks: ${dashboardArtworks.length}

export const artsperArtworks = ${JSON.stringify(dashboardArtworks, null, 2)};

export const artsperSummary = ${JSON.stringify(summary, null, 2)};
`;
  
  fs.writeFileSync('../backend/artsper-dashboard-data.ts', dataContent);
  console.log('✅ Updated backend/artsper-dashboard-data.ts');
  
  console.log('\n🎉 Real artist name fixing complete!');
  console.log('📌 Server will auto-reload with --hot mode');
}

// Run the fixer
fixRealArtistNames().catch(console.error);