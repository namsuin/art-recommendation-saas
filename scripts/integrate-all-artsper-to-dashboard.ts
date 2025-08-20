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

interface DashboardArtwork {
  id: string;
  title: string;
  artist: string;
  artist_email: string;
  registration_date: string;
  status: 'approved' | 'pending' | 'rejected';
  approval_date: string | null;
  image_url: string;
  description: string;
  price: number;
  category: string;
  medium: string;
  dimensions: string;
  views: number;
  likes: number;
  artwork_url?: string;
}

class ArtsperFullIntegrator {
  private dashboardArtworks: DashboardArtwork[] = [];
  
  async integrateAllArtworks() {
    console.log('🎨 Integrating ALL Artsper artworks into dashboard...\n');
    
    // Load complete Artsper data
    const artsperFile = './artsper-complete-1755699137005.json';
    console.log(`📂 Loading ${artsperFile}...`);
    
    const artsperData = JSON.parse(fs.readFileSync(artsperFile, 'utf-8'));
    const artworks: ArtsperArtwork[] = artsperData.artworks || [];
    
    console.log(`📊 Found ${artworks.length} artworks to integrate\n`);
    
    // Process in batches for better performance
    const batchSize = 1000;
    const totalBatches = Math.ceil(artworks.length / batchSize);
    
    console.log('🔄 Converting artworks for dashboard...\n');
    
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const start = batchNum * batchSize;
      const end = Math.min(start + batchSize, artworks.length);
      const batch = artworks.slice(start, end);
      
      console.log(`  Processing batch ${batchNum + 1}/${totalBatches} (artworks ${start + 1}-${end})...`);
      
      const convertedBatch = batch.map((artwork, index) => {
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
        const daysAgo = Math.floor(Math.random() * 90); // Random date within last 90 days
        
        const dashboardArtwork: DashboardArtwork = {
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
        
        return dashboardArtwork;
      });
      
      this.dashboardArtworks.push(...convertedBatch);
    }
    
    console.log(`\n✅ Converted ${this.dashboardArtworks.length} artworks\n`);
    
    // Create dashboard data file
    await this.createDashboardDataFile();
    
    // Show statistics
    this.showStatistics();
    
    console.log('\n🎉 Integration complete!');
    console.log('\n📱 Next Steps:');
    console.log('   1. Server will automatically reload (--hot mode)');
    console.log('   2. Visit http://localhost:3000/dashboard');
    console.log('   3. Go to "작품 관리" tab');
    console.log(`   4. View all ${this.dashboardArtworks.length} Artsper artworks!`);
  }
  
  async createDashboardDataFile() {
    console.log('💾 Creating dashboard data file...');
    
    // Calculate summary
    const summary = {
      total_artworks: this.dashboardArtworks.length,
      approved: this.dashboardArtworks.filter(a => a.status === 'approved').length,
      pending: 0,
      rejected: 0,
      total_value: this.dashboardArtworks.reduce((sum, a) => sum + a.price, 0),
      average_price: this.dashboardArtworks.reduce((sum, a) => sum + a.price, 0) / this.dashboardArtworks.length
    };
    
    // Create TypeScript export file
    const dataContent = `// Artsper Complete Artworks Data for Dashboard
// Generated at ${new Date().toISOString()}
// Total artworks: ${this.dashboardArtworks.length}

export const artsperArtworks = ${JSON.stringify(this.dashboardArtworks, null, 2)};

export const artsperSummary = ${JSON.stringify(summary, null, 2)};
`;
    
    fs.writeFileSync('../backend/artsper-dashboard-data.ts', dataContent);
    console.log('✅ Created backend/artsper-dashboard-data.ts');
    
    // Also save a backup JSON
    const backupData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalArtworks: this.dashboardArtworks.length,
        source: 'artsper-complete-1755699137005.json'
      },
      summary,
      artworks: this.dashboardArtworks
    };
    
    fs.writeFileSync('../artsper-dashboard-full.json', JSON.stringify(backupData, null, 2));
    console.log('✅ Created backup: artsper-dashboard-full.json');
  }
  
  showStatistics() {
    console.log('\n📊 Integration Statistics:');
    
    // Price statistics
    const prices = this.dashboardArtworks.map(a => a.price).filter(p => p > 0);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices.filter(p => p > 0));
    
    console.log(`\n💰 Price Distribution:`);
    console.log(`   - Average: $${avgPrice.toFixed(2)}`);
    console.log(`   - Maximum: $${maxPrice.toFixed(2)}`);
    console.log(`   - Minimum: $${minPrice.toFixed(2)}`);
    console.log(`   - Free/Price on request: ${this.dashboardArtworks.length - prices.length}`);
    
    // Category distribution
    const categories = new Map<string, number>();
    this.dashboardArtworks.forEach(a => {
      categories.set(a.category, (categories.get(a.category) || 0) + 1);
    });
    
    console.log(`\n🎨 Categories (Top 10):`);
    Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([cat, count]) => {
        console.log(`   - ${cat}: ${count} artworks`);
      });
    
    // Artist statistics
    const artists = new Map<string, number>();
    this.dashboardArtworks.forEach(a => {
      artists.set(a.artist, (artists.get(a.artist) || 0) + 1);
    });
    
    console.log(`\n👨‍🎨 Total unique artists: ${artists.size}`);
    console.log(`\n🏆 Top 5 Artists:`);
    Array.from(artists.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([artist, count]) => {
        console.log(`   - ${artist}: ${count} artworks`);
      });
    
    // Engagement statistics
    const totalViews = this.dashboardArtworks.reduce((sum, a) => sum + a.views, 0);
    const totalLikes = this.dashboardArtworks.reduce((sum, a) => sum + a.likes, 0);
    
    console.log(`\n📈 Engagement Metrics:`);
    console.log(`   - Total views: ${totalViews.toLocaleString()}`);
    console.log(`   - Total likes: ${totalLikes.toLocaleString()}`);
    console.log(`   - Average views per artwork: ${Math.round(totalViews / this.dashboardArtworks.length)}`);
    console.log(`   - Average likes per artwork: ${Math.round(totalLikes / this.dashboardArtworks.length)}`);
  }
}

// Run the integrator
const integrator = new ArtsperFullIntegrator();

console.log('🚀 Artsper Complete Collection Dashboard Integrator');
console.log('===================================================\n');

integrator.integrateAllArtworks().catch(console.error);