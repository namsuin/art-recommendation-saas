#!/usr/bin/env bun

import * as fs from 'fs';

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

async function extractArtistFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Try multiple patterns to find artist name
    const patterns = [
      /<a[^>]*class="[^"]*artist-name[^"]*"[^>]*>([^<]+)</,
      /<span[^>]*class="[^"]*artist[^"]*"[^>]*>([^<]+)</,
      /<h2[^>]*class="[^"]*artist[^"]*"[^>]*>([^<]+)</,
      /by\s+<a[^>]*>([^<]+)</i,
      /artist":\s*"([^"]+)"/,
      /<meta[^>]*property="og:title"[^>]*content="[^"]*by\s+([^"]+)"/,
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const artist = match[1].trim();
        if (artist && artist !== '' && !artist.includes('Unknown')) {
          return artist;
        }
      }
    }
    
    return 'Unknown Artist';
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return 'Unknown Artist';
  }
}

async function fixArtistNames() {
  console.log('🎨 Fixing artist names in Artsper artworks...\n');
  
  // Load the JSON file
  const filePath = './artsper-complete-1755699137005.json';
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const artworks: ArtsperArtwork[] = data.artworks || [];
  
  console.log(`📊 Found ${artworks.length} artworks\n`);
  
  // Count how many need fixing
  const unknownCount = artworks.filter(a => a.artist === 'Unknown Artist').length;
  console.log(`❗ ${unknownCount} artworks have "Unknown Artist"\n`);
  
  if (unknownCount === 0) {
    console.log('✅ No artworks need fixing!');
    return;
  }
  
  // Fix a sample batch first (100 artworks)
  console.log('🔧 Fixing artist names for a sample of 100 artworks...\n');
  
  let fixed = 0;
  const sampleSize = Math.min(100, unknownCount);
  const unknownArtworks = artworks.filter(a => a.artist === 'Unknown Artist').slice(0, sampleSize);
  
  for (let i = 0; i < unknownArtworks.length; i++) {
    const artwork = unknownArtworks[i];
    
    if (artwork.url) {
      process.stdout.write(`\r  Fixing ${i + 1}/${sampleSize}...`);
      
      const artistName = await extractArtistFromUrl(artwork.url);
      
      if (artistName !== 'Unknown Artist') {
        // Update the artist name in the original array
        const originalIndex = artworks.findIndex(a => a.id === artwork.id);
        if (originalIndex !== -1) {
          artworks[originalIndex].artist = artistName;
          fixed++;
        }
      }
      
      // Rate limiting - wait 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`\n\n✅ Fixed ${fixed} artist names\n`);
  
  // Save the updated data
  const outputPath = './artsper-with-artists.json';
  fs.writeFileSync(outputPath, JSON.stringify({
    ...data,
    artworks: artworks,
    metadata: {
      ...data.metadata,
      artistsFixed: true,
      fixedCount: fixed,
      fixedAt: new Date().toISOString()
    }
  }, null, 2));
  
  console.log(`💾 Saved updated data to ${outputPath}\n`);
  
  // Update the dashboard data file if needed
  console.log('📋 Updating dashboard data...');
  
  const dashboardScript = './integrate-all-artsper-to-dashboard.ts';
  if (fs.existsSync(dashboardScript)) {
    // Update the script to use the new file
    let scriptContent = fs.readFileSync(dashboardScript, 'utf-8');
    scriptContent = scriptContent.replace(
      './artsper-complete-1755699137005.json',
      './artsper-with-artists.json'
    );
    fs.writeFileSync(dashboardScript, scriptContent);
    console.log('✅ Updated integration script to use new data file');
  }
  
  console.log('\n🎉 Artist name fixing complete!');
  console.log('📌 Next steps:');
  console.log('   1. Run "bun integrate-all-artsper-to-dashboard.ts" to update dashboard');
  console.log('   2. Restart the server to see updated artist names');
}

// Run the fixer
fixArtistNames().catch(console.error);