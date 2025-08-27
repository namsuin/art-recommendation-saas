#!/usr/bin/env bun

async function fetchArtworks() {
    console.log('📥 Fetching all artworks from dashboard...');
    
    try {
        const adminToken = process.env.ADMIN_TOKEN || 'test-admin-token-2024';
        const response = await fetch('http://localhost:3000/api/admin/artworks', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            return result.artworks || [];
        } else {
            console.error('Failed to fetch artworks');
            return [];
        }
    } catch (error) {
        console.error('Error fetching artworks:', error);
        return [];
    }
}

async function main() {
    const artworks = await fetchArtworks();
    
    console.log(`\n📊 Total artworks: ${artworks.length}\n`);
    console.log('작품 목록:');
    console.log('='.repeat(80));
    
    artworks.forEach((artwork, index) => {
        console.log(`${index + 1}. 제목: "${artwork.title}"`);
        console.log(`   작가: "${artwork.artist_name}"`);
        console.log(`   ID: ${artwork.id}`);
        console.log(`   상태: ${artwork.status}`);
        console.log('-'.repeat(40));
    });
    
    // 작가명 분석
    const artistCounts = {};
    artworks.forEach(artwork => {
        const artist = artwork.artist_name || 'No Artist';
        artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    });
    
    console.log('\n작가별 작품 수:');
    console.log('='.repeat(80));
    Object.entries(artistCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([artist, count]) => {
            console.log(`${artist}: ${count}개`);
        });
}

main().catch(console.error);