// Debug the actual HTML structure more carefully
async function debugStructure() {
  const response = await fetch('https://www.artsper.com/kr/contemporary-artworks');
  const html = await response.text();
  
  // Look for all articles
  const articleMatches = html.match(/<article[^>]*>/g) || [];
  console.log(`Found ${articleMatches.length} article opening tags`);
  
  if (articleMatches.length > 0) {
    console.log('First few article tags:');
    articleMatches.slice(0, 5).forEach((match, i) => {
      console.log(`${i + 1}: ${match}`);
    });
  }
  
  // Look for img tags with data-src
  const imgMatches = html.match(/<img[^>]*data-src[^>]*>/g) || [];
  console.log(`\nFound ${imgMatches.length} img tags with data-src`);
  
  if (imgMatches.length > 0) {
    console.log('First few img tags:');
    imgMatches.slice(0, 3).forEach((match, i) => {
      console.log(`${i + 1}: ${match.substring(0, 200)}...`);
    });
  }
  
  // Look for complete artwork sections
  const artworkSections = html.match(/<article[\s\S]*?<\/article>/g) || [];
  console.log(`\nFound ${artworkSections.length} complete article sections`);
  
  if (artworkSections.length > 0) {
    console.log('\nFirst complete article section:');
    console.log(artworkSections[0].substring(0, 500) + '...');
  }
  
  // Look for data-id attributes
  const dataIdMatches = html.match(/data-id="[^"]+"/g) || [];
  console.log(`\nFound ${dataIdMatches.length} data-id attributes`);
  
  if (dataIdMatches.length > 0) {
    console.log('First few data-id values:');
    dataIdMatches.slice(0, 10).forEach((match, i) => {
      console.log(`${i + 1}: ${match}`);
    });
  }
}

debugStructure();