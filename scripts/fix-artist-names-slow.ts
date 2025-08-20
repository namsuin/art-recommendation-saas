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

// Rate limiting configuration
const DELAY_BETWEEN_REQUESTS = 3000; // 3 seconds between requests
const DELAY_AFTER_429 = 60000; // 60 seconds after rate limit error
const BATCH_SIZE = 50; // Smaller batch size
const DELAY_BETWEEN_BATCHES = 300000; // 5 minutes between batches

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractArtistFromArtsperPage(url: string, retryCount = 0): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 15000,
      maxRedirects: 5
    });
    
    const $ = cheerio.load(response.data);
    
    // First try to extract from page title which has format: "Artwork Title by Artist Name, Year"
    const pageTitle = $('title').text();
    const titleMatch = pageTitle.match(/by\s+([^,]+),/);
    if (titleMatch && titleMatch[1]) {
      const artistName = titleMatch[1].trim();
      if (artistName && !artistName.toLowerCase().includes('unknown')) {
        return artistName;
      }
    }
    
    // Try meta tags
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const metaMatch = metaDescription.match(/by\s+([^\.]+)\./);
    if (metaMatch && metaMatch[1]) {
      const artistName = metaMatch[1].trim();
      if (artistName && !artistName.toLowerCase().includes('unknown')) {
        return artistName;
      }
    }
    
    // Try Open Graph meta tags
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogMatch = ogTitle.match(/by\s+([^,]+),/);
    if (ogMatch && ogMatch[1]) {
      const artistName = ogMatch[1].trim();
      if (artistName && !artistName.toLowerCase().includes('unknown')) {
        return artistName;
      }
    }
    
    return 'Unknown Artist';
  } catch (error: any) {
    if (error.response?.status === 429 && retryCount < 3) {
      console.log(`\n⚠️  Rate limited, waiting ${DELAY_AFTER_429/1000} seconds before retry...`);
      await sleep(DELAY_AFTER_429);
      return extractArtistFromArtsperPage(url, retryCount + 1);
    }
    
    if (error.code === 'ECONNRESET' && retryCount < 3) {
      console.log(`\n⚠️  Connection reset, retrying in 10 seconds...`);
      await sleep(10000);
      return extractArtistFromArtsperPage(url, retryCount + 1);
    }
    
    console.error(`\n❌ Error fetching ${url}: ${error.message}`);
    return 'Unknown Artist';
  }
}

async function fixRealArtistNamesSlow() {
  console.log('🎨 Fetching REAL artist names from Artsper (SLOW MODE)...\n');
  console.log('⚠️  Running in slow mode to avoid rate limiting');
  console.log(`📝 Configuration:
  - Delay between requests: ${DELAY_BETWEEN_REQUESTS/1000}s
  - Delay after rate limit: ${DELAY_AFTER_429/1000}s
  - Batch size: ${BATCH_SIZE}
  - Delay between batches: ${DELAY_BETWEEN_BATCHES/1000/60} minutes\n`);
  
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
    startBatch = Math.floor(totalFixed / BATCH_SIZE);
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
  
  // Process in smaller batches with longer delays
  const totalBatches = Math.ceil(unknownArtworks.length / BATCH_SIZE);
  
  console.log(`📦 Processing in ${totalBatches} batches of ${BATCH_SIZE} artworks each\n`);
  
  // Process only 5 batches at a time, then require manual restart
  const maxBatchesPerRun = 5;
  const endBatch = Math.min(startBatch + maxBatchesPerRun, totalBatches);
  
  console.log(`🔄 Will process batches ${startBatch + 1} to ${endBatch} in this run\n`);
  
  for (let batchNum = startBatch; batchNum < endBatch; batchNum++) {
    const start = batchNum * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, unknownArtworks.length);
    const batch = unknownArtworks.slice(start, end);
    
    console.log(`\n📝 Processing batch ${batchNum + 1}/${totalBatches} (artworks ${start + 1}-${end})...\n`);
    
    const batchStartTime = Date.now();
    
    for (let i = 0; i < batch.length; i++) {
      const artwork = batch[i];
      const globalIndex = start + i;
      
      // Show progress
      const progress = ((globalIndex + 1) / unknownArtworks.length * 100).toFixed(2);
      console.log(`[${new Date().toLocaleTimeString()}] Progress: ${i + 1}/${batch.length} (Total: ${globalIndex + 1}/${unknownArtworks.length} - ${progress}%)`);
      
      if (artwork.url) {
        console.log(`  📝 Fetching: ${artwork.title} (ID: ${artwork.id})`);
        
        const artistName = await extractArtistFromArtsperPage(artwork.url);
        
        if (artistName !== 'Unknown Artist') {
          // Update in the main array
          const originalIndex = updatedArtworks.findIndex(a => a.id === artwork.id);
          if (originalIndex !== -1) {
            updatedArtworks[originalIndex].artist = artistName;
            totalFixed++;
            console.log(`  ✅ Found artist: ${artistName}`);
          }
        } else {
          console.log(`  ❌ No artist found`);
        }
        
        // Delay between requests
        await sleep(DELAY_BETWEEN_REQUESTS);
      }
    }
    
    const batchEndTime = Date.now();
    const batchDuration = (batchEndTime - batchStartTime) / 1000 / 60;
    
    // Save progress after each batch
    const progressBatchFile = `./artsper-artists-progress-batch-${batchNum + 1}.json`;
    fs.writeFileSync(progressBatchFile, JSON.stringify({
      batchNumber: batchNum + 1,
      totalBatches: totalBatches,
      fixedCount: totalFixed,
      timestamp: new Date().toISOString(),
      artworks: updatedArtworks
    }, null, 2));
    
    console.log(`\n💾 Saved progress to ${progressBatchFile}`);
    console.log(`✅ Batch ${batchNum + 1} completed in ${batchDuration.toFixed(2)} minutes`);
    console.log(`📊 Fixed ${totalFixed} artist names so far\n`);
    
    // Save to main progress file
    const outputPath = './artsper-with-real-artists.json';
    fs.writeFileSync(outputPath, JSON.stringify({
      ...data,
      artworks: updatedArtworks,
      metadata: {
        ...data.metadata,
        artistsFixed: true,
        fixedCount: totalFixed,
        lastBatch: batchNum + 1,
        fixedAt: new Date().toISOString(),
        fixMethod: 'real-scraping-slow'
      }
    }, null, 2));
    
    // Delay between batches (except for the last batch)
    if (batchNum < endBatch - 1) {
      console.log(`⏰ Waiting ${DELAY_BETWEEN_BATCHES/1000/60} minutes before next batch...`);
      console.log(`   (You can stop the script with Ctrl+C and resume later)`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }
  
  console.log(`\n🎉 Completed ${endBatch - startBatch} batches!`);
  console.log(`📊 Total fixed: ${totalFixed} artist names`);
  
  if (endBatch < totalBatches) {
    console.log(`\n⚠️  There are ${totalBatches - endBatch} more batches remaining.`);
    console.log(`   Run the script again to continue from batch ${endBatch + 1}`);
  } else {
    console.log('\n✅ All batches completed!');
    
    // Update dashboard data
    console.log('\n📋 Updating dashboard data...');
    await updateDashboardData(updatedArtworks, data);
  }
}

async function updateDashboardData(artworks: ArtsperArtwork[], data: any) {
  // Transform to dashboard format
  const dashboardArtworks = artworks.map((artwork, index) => {
    // Parse price
    let priceValue = 0;
    if (artwork.price && artwork.price !== 'Price on request') {
      const priceMatch = artwork.price.match(/[\d,]+(?:\.\\d{2})?/);
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
  const dataContent = `// Artsper Artworks with Real Artist Names (Slow Scraping)
// Generated at ${new Date().toISOString()}
// Total artworks: ${dashboardArtworks.length}

export const artsperArtworks = ${JSON.stringify(dashboardArtworks, null, 2)};

export const artsperSummary = ${JSON.stringify(summary, null, 2)};
`;
  
  fs.writeFileSync('../backend/artsper-dashboard-data.ts', dataContent);
  console.log('✅ Updated backend/artsper-dashboard-data.ts');
}

// Run the fixer
fixRealArtistNamesSlow().catch(console.error);