/**
 * Sync Mock Database - Update with latest artist names
 * Sync the mock database with the updated Artsper data
 */

const artsperDataPath = './artsper-dashboard-full.json';
const mockDatabasePath = './backend/mock-database.json';

async function syncMockDatabase() {
  console.log('🔄 Syncing Mock Database with Updated Artist Names...');

  try {
    // Load both databases
    const artsperFile = Bun.file(artsperDataPath);
    const artsperData = await artsperFile.json();
    
    const mockFile = Bun.file(mockDatabasePath);
    const mockData = await mockFile.json();
    
    console.log(`📊 Artsper data: ${artsperData.artworks.length} artworks`);
    console.log(`📊 Mock data: ${mockData.artworks.length} artworks`);

    let updatedCount = 0;
    let matchedCount = 0;
    const updates = [];

    // Update mock database with real artist names from Artsper data
    for (const artsperArtwork of artsperData.artworks) {
      // Skip if still has Artsper Artist format
      if (artsperArtwork.artist.startsWith('Artsper Artist')) {
        continue;
      }

      // Find corresponding artwork in mock database
      const mockArtworkIndex = mockData.artworks.findIndex(mockArtwork => 
        mockArtwork.id === artsperArtwork.id.replace('artsper-', 'artsper_')
      );

      if (mockArtworkIndex !== -1) {
        matchedCount++;
        const mockArtwork = mockData.artworks[mockArtworkIndex];
        
        // Update if the artist name is different
        if (mockArtwork.artist !== artsperArtwork.artist) {
          const oldArtist = mockArtwork.artist;
          mockData.artworks[mockArtworkIndex].artist = artsperArtwork.artist;
          mockData.artworks[mockArtworkIndex].artist_id = `artist_${artsperArtwork.artist.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          
          updatedCount++;
          updates.push({
            id: mockArtwork.id,
            title: mockArtwork.title,
            oldArtist,
            newArtist: artsperArtwork.artist
          });

          if (updatedCount <= 10) {
            console.log(`✅ ${updatedCount}. "${oldArtist}" → "${artsperArtwork.artist}" for "${mockArtwork.title}"`);
          }
        }
      }
    }

    // Save updated mock database
    if (updatedCount > 0) {
      await Bun.write(mockDatabasePath, JSON.stringify(mockData, null, 2));
      console.log(`💾 Updated mock database with ${updatedCount} new artist names`);
    } else {
      console.log('ℹ️ No updates needed - mock database is already synchronized');
    }

    // Generate summary statistics
    const mockStats = {
      total: mockData.artworks.length,
      realArtists: 0,
      artsperArtists: 0,
      unknownArtists: 0
    };

    for (const artwork of mockData.artworks) {
      if (artwork.artist.startsWith('Artsper Artist')) {
        mockStats.artsperArtists++;
      } else if (artwork.artist === 'Unknown Artist' || artwork.artist.includes('Unknown')) {
        mockStats.unknownArtists++;
      } else {
        mockStats.realArtists++;
      }
    }

    console.log('\n📊 Mock Database Status After Sync:');
    console.log(`📊 Total artworks: ${mockStats.total.toLocaleString()}`);
    console.log(`✅ Real artist names: ${mockStats.realArtists.toLocaleString()} (${Math.round(mockStats.realArtists/mockStats.total*100)}%)`);
    console.log(`❌ Artsper Artist format: ${mockStats.artsperArtists.toLocaleString()} (${Math.round(mockStats.artsperArtists/mockStats.total*100)}%)`);
    console.log(`❓ Unknown artists: ${mockStats.unknownArtists.toLocaleString()}`);

    console.log('\n📋 Sync Summary:');
    console.log(`🔍 Matched artworks: ${matchedCount.toLocaleString()}`);
    console.log(`✅ Updated artist names: ${updatedCount.toLocaleString()}`);
    console.log(`🎯 Mock database quality: ${Math.round(mockStats.realArtists/mockStats.total*100)}%`);

    if (updatedCount > 10) {
      console.log('\n📝 Additional Updates (sample):');
      updates.slice(10, 15).forEach((update, index) => {
        console.log(`${index + 11}. "${update.newArtist}" for "${update.title}"`);
      });
      
      if (updates.length > 15) {
        console.log(`... and ${updates.length - 15} more updates`);
      }
    }

  } catch (error) {
    console.error('❌ Error syncing mock database:', error);
  }
}

if (import.meta.main) {
  await syncMockDatabase();
}