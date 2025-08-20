// Debug script to examine HTML structure
async function debugHtml() {
  const response = await fetch('https://www.artsper.com/kr/contemporary-artworks');
  const html = await response.text();
  
  // Save full HTML for inspection
  await Bun.write('/Users/suin2/art-recommendation-saas/page-source.html', html);
  
  // Look for various patterns
  console.log('=== LOOKING FOR ARTWORK CARDS ===');
  const cardPatterns = [
    /class="[^"]*card[^"]*"/g,
    /class="[^"]*artwork[^"]*"/g,
    /data-artwork/g,
    /data-id/g
  ];
  
  cardPatterns.forEach((pattern, i) => {
    const matches = html.match(pattern) || [];
    console.log(`Pattern ${i + 1}: Found ${matches.length} matches`);
    if (matches.length > 0) {
      console.log('First few matches:', matches.slice(0, 5));
    }
  });
  
  console.log('\n=== LOOKING FOR JSON DATA ===');
  const jsonPatterns = [
    /window\.__INITIAL_STATE__/g,
    /window\.APP_STATE/g,
    /<script[^>]*type="application\/json"[^>]*>/g,
    /<script[^>]*>[\s\S]*?artworks?[\s\S]*?<\/script>/gi
  ];
  
  jsonPatterns.forEach((pattern, i) => {
    const matches = html.match(pattern) || [];
    console.log(`JSON Pattern ${i + 1}: Found ${matches.length} matches`);
  });
  
  console.log('\n=== LOOKING FOR IMAGE TAGS ===');
  const imgMatches = html.match(/<img[^>]*>/g) || [];
  console.log(`Found ${imgMatches.length} img tags`);
  if (imgMatches.length > 0) {
    console.log('First few img tags:', imgMatches.slice(0, 3));
  }
}

debugHtml();