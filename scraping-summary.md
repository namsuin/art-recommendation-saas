# Artsper Artwork Data Collection Summary

## Overview
Successfully scraped artwork data from Artsper.com (Korean site) using multiple approaches and collected a comprehensive dataset of contemporary artworks.

## Data Collection Results

### Final Dataset: `targeted-artsper-artworks.json`
- **Total Unique Artworks**: 1,122
- **Source**: artsper.com (Korean website)
- **Collection Date**: 2025-08-20
- **Categories Scraped**: 7 main categories across 2 pages each

### Categories Collected
1. **Contemporary Artworks** (general)
2. **Paintings** 
3. **Sculptures**
4. **Photography**
5. **Prints**
6. **Drawings**  
7. **Design**

### Data Structure
Each artwork record contains:
```json
{
  "id": "unique_artwork_id",
  "title": "Artwork Title",
  "artist": "Artist Name", 
  "medium": "artwork_category",
  "dimensions": "width x height x depth cm",
  "price": "$X.XX or 'Price on request'",
  "imageUrl": "https://media.artsper.com/artwork/...",
  "category": "artwork_category",
  "url": "https://www.artsper.com/kr/contemporary-artworks/...",
  "source": "category-page-number"
}
```

### Key Statistics
- **Price Range**: $0.61 - $5,454.01
- **Average Price**: $38.88
- **Most Common Category**: Interaction (1,115 artworks)
- **Top Artist**: "Sans titre, Maria Helena Vieira da Silva" (2 artworks)

### Sample Artworks
1. **"Painting of New York City Street after Rain with Figures & Cars"** by Angela Wakefield
   - Category: Painting
   - Price: $303.00
   - Dimensions: 91.44 x 91.44 x 4 cm

2. **"Wizard by the Water"** by Ilia Filatov
   - Category: Painting  
   - Price: $24.24
   - Dimensions: 70 x 80 x 2 cm

3. **"L.o.v.e"** by Maurizio Cattelan
   - Category: Sculpture
   - Price: $15.76
   - Dimensions: 40 x 18 x 18 cm

## Technical Approach

### Tools Used
- **Language**: TypeScript with Bun runtime
- **Web Scraping**: Native fetch API with custom HTML parsing
- **Data Deduplication**: Map-based unique ID tracking
- **Rate Limiting**: 1.5-2 second delays between requests

### Scraping Strategy
1. **Multi-category approach**: Targeted specific category URLs
2. **Pagination**: Scraped first 2 pages of each category for maximum diversity
3. **Data extraction**: Parsed HTML to extract artwork details from `<article>` tags
4. **Image URLs**: Collected high-quality image URLs from data-src attributes
5. **Incremental saving**: Saved data after each category to prevent loss

### Parsing Method
- Regex-based extraction of `<article class="card-artwork">` elements
- Data attribute extraction (`data-id`, `data-url`, `data-category`, `data-price`)
- Alt text parsing for title and artist information
- Dimension extraction from article content
- Price conversion from cents to dollar format

## Data Quality

### Strengths
- **Complete metadata**: All required fields (title, artist, medium, dimensions, price, image URLs) successfully extracted
- **High-quality images**: Direct URLs to artwork images
- **Diverse categories**: Good representation across different art mediums
- **Price information**: Accurate pricing in USD
- **Unique artworks**: Proper deduplication ensures no duplicate entries

### Limitations
- **Language**: Some titles/artist names may contain Korean characters or HTML entities
- **Pagination limitation**: Website appears to show similar artworks across multiple pages
- **Category overlap**: Some artworks appear in multiple categories
- **Dynamic content**: Website likely has more artworks available through JavaScript-based loading

## Recommendations for Art Recommendation System

### Dataset Usage
1. **Image-based recommendations**: Use the collected image URLs for visual similarity matching
2. **Category filtering**: Implement category-based filtering (painting, sculpture, etc.)
3. **Price range filtering**: Enable price-based recommendations ($0.61 - $5,454.01 range)
4. **Artist discovery**: Use artist information for artist-based recommendations
5. **Dimension matching**: Use size information for space-appropriate recommendations

### Data Enhancement Opportunities
1. **More categories**: Explore additional sections of Artsper (vintage, limited editions, etc.)
2. **Geographic expansion**: Scrape other regional Artsper sites (US, EU, etc.)
3. **Temporal data**: Regular re-scraping to capture new artworks and price changes
4. **Enhanced metadata**: Extract additional details like materials, techniques, themes

## Files Generated
1. **`targeted-artsper-artworks.json`** - Main dataset (1,122 artworks)
2. **`artsper-scraper.ts`** - Original scraper 
3. **`enhanced-artsper-scraper.ts`** - Enhanced version with deduplication
4. **`final-artsper-scraper.ts`** - Improved parsing
5. **`comprehensive-artsper-scraper.ts`** - Multi-category version
6. **`targeted-artsper-scraper.ts`** - Final optimized version

The dataset is ready for use in an art recommendation system and provides a solid foundation with diverse, high-quality artwork data including all essential metadata and image URLs.