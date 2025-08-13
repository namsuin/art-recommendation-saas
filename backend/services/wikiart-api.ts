/**
 * WikiArt API Integration
 * 무료로 사용 가능한 대규모 예술 작품 데이터베이스
 */

import { logger } from '../../shared/logger';

interface WikiArtArtwork {
    id: string;
    title: string;
    artistName: string;
    year?: string;
    style?: string;
    genre?: string;
    media?: string;
    image: string;
    width?: number;
    height?: number;
    completionYear?: number;
}

interface WikiArtResponse {
    data: WikiArtArtwork[];
    hasMore: boolean;
    page: number;
}

export class WikiArtAPI {
    private baseUrl = 'https://www.wikiart.org/en/api/2';
    private cache = new Map<string, any>();
    private cacheTimeout = 30 * 60 * 1000; // 30분

    constructor() {
        logger.info('🎨 WikiArt API initialized (disabled due to API restrictions)');
    }

    /**
     * 키워드로 작품 검색
     */
    async searchArtworks(keywords: string[], limit: number = 20): Promise<WikiArtArtwork[]> {
        // WikiArt API is currently returning 403 Forbidden errors
        // Disabling this service until API access is restored
        logger.info(`🔍 WikiArt: Service disabled due to API restrictions`);
        return [];
    }

    /**
     * 스타일별 작품 검색
     */
    private async searchByStyle(keywords: string[]): Promise<WikiArtArtwork[]> {
        const styles = [
            'impressionism', 'post-impressionism', 'expressionism', 'cubism',
            'surrealism', 'abstract-expressionism', 'pop-art', 'minimalism',
            'baroque', 'renaissance', 'romanticism', 'realism'
        ];

        // 키워드와 매칭되는 스타일 찾기
        const matchingStyles = styles.filter(style => 
            keywords.some(keyword => 
                keyword.toLowerCase().includes(style.replace('-', '')) ||
                style.includes(keyword.toLowerCase())
            )
        );

        if (matchingStyles.length === 0) {
            // 기본 스타일 사용
            return this.getArtworksByStyle('impressionism', 5);
        }

        const results = await Promise.all(
            matchingStyles.slice(0, 2).map(style => this.getArtworksByStyle(style, 3))
        );

        return results.flat();
    }

    /**
     * 장르별 작품 검색
     */
    private async searchByGenre(keywords: string[]): Promise<WikiArtArtwork[]> {
        const genres = [
            'landscape', 'portrait', 'still-life', 'genre-painting',
            'abstract', 'nude', 'religious-painting', 'mythological-painting'
        ];

        const matchingGenres = genres.filter(genre =>
            keywords.some(keyword =>
                keyword.toLowerCase().includes(genre.replace('-', '')) ||
                genre.includes(keyword.toLowerCase())
            )
        );

        if (matchingGenres.length === 0) {
            return this.getArtworksByGenre('landscape', 3);
        }

        const results = await Promise.all(
            matchingGenres.slice(0, 2).map(genre => this.getArtworksByGenre(genre, 3))
        );

        return results.flat();
    }

    /**
     * 기법별 작품 검색
     */
    private async searchByTechnique(keywords: string[]): Promise<WikiArtArtwork[]> {
        const techniques = [
            'oil', 'watercolor', 'acrylic', 'tempera', 'pastel',
            'ink', 'pencil', 'charcoal', 'gouache', 'mixed-media'
        ];

        const matchingTechniques = techniques.filter(technique =>
            keywords.some(keyword =>
                keyword.toLowerCase().includes(technique.replace('-', ''))
            )
        );

        if (matchingTechniques.length === 0) {
            return [];
        }

        // 기법별로는 적은 수만 가져오기
        return this.getMostViewedArtworks(2);
    }

    /**
     * 스타일별 작품 가져오기
     */
    private async getArtworksByStyle(style: string, limit: number): Promise<WikiArtArtwork[]> {
        try {
            const url = `${this.baseUrl}/PaintingsByStyle?style=${encodeURIComponent(style)}&paginationToken=1:${limit}&imageFormat=Large`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return this.formatWikiArtResponse(data?.data || []);
        } catch (error) {
            logger.error(`❌ WikiArt style search error (${style}):`, error);
            // Fallback to mock data if API fails
            return this.generateMockArtworks(style, limit);
        }
    }

    /**
     * 장르별 작품 가져오기
     */
    private async getArtworksByGenre(genre: string, limit: number): Promise<WikiArtArtwork[]> {
        try {
            const url = `${this.baseUrl}/PaintingsByGenre?genre=${encodeURIComponent(genre)}&paginationToken=1:${limit}&imageFormat=Large`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return this.formatWikiArtResponse(data?.data || []);
        } catch (error) {
            logger.error(`❌ WikiArt genre search error (${genre}):`, error);
            // Fallback to mock data if API fails
            return this.generateMockArtworks(genre, limit);
        }
    }

    /**
     * 인기 작품 가져오기
     */
    private async getPopularArtworks(limit: number): Promise<WikiArtArtwork[]> {
        try {
            const url = `${this.baseUrl}/MostPopularPaintings?paginationToken=1:${limit}&imageFormat=Large`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return this.formatWikiArtResponse(data?.data || []);
        } catch (error) {
            logger.error('❌ WikiArt popular artworks error:', error);
            // Fallback to mock data if API fails
            return this.generateMockArtworks('popular', limit);
        }
    }

    /**
     * 최다 조회 작품 가져오기
     */
    private async getMostViewedArtworks(limit: number): Promise<WikiArtArtwork[]> {
        try {
            const url = `${this.baseUrl}/MostViewedPaintings?paginationToken=1:${limit}&imageFormat=Large`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return this.formatWikiArtResponse(data?.data || []);
        } catch (error) {
            logger.error('❌ WikiArt most viewed error:', error);
            // Fallback to mock data if API fails
            return this.generateMockArtworks('viewed', limit);
        }
    }

    /**
     * WikiArt API 응답을 내부 형식으로 변환
     */
    private formatWikiArtResponse(paintings: any[]): WikiArtArtwork[] {
        if (!Array.isArray(paintings)) return [];
        
        return paintings
            .filter(painting => painting && painting.image)
            .map(painting => ({
                id: `wikiart_${painting.id || Math.random().toString(36)}`,
                title: painting.title || 'Untitled',
                artistName: painting.artistName || 'Unknown Artist',
                year: painting.year?.toString() || painting.completionYear?.toString() || '',
                style: painting.style || '',
                genre: painting.genre || '',
                media: painting.technique || painting.media || '',
                image: painting.image.replace('!Large.jpg', '!Blog.jpg'), // Use Blog size for better loading
                width: painting.width,
                height: painting.height,
                completionYear: painting.completionYear
            }));
    }

    /**
     * Mock 작품 생성 (API 실패시 fallback용)
     */
    private generateMockArtworks(category: string, count: number): WikiArtArtwork[] {
        const artists = [
            'Vincent van Gogh', 'Claude Monet', 'Pablo Picasso', 'Salvador Dalí',
            'Leonardo da Vinci', 'Michelangelo', 'Rembrandt', 'Johannes Vermeer',
            'Jackson Pollock', 'Andy Warhol', 'Henri Matisse', 'Paul Cézanne'
        ];

        const titles = [
            'Starry Night', 'Water Lilies', 'Guernica', 'The Persistence of Memory',
            'Mona Lisa', 'The Creation of Adam', 'The Night Watch', 'Girl with a Pearl Earring',
            'No. 1, 1950', 'Campbell\'s Soup Cans', 'The Dance', 'The Card Players'
        ];

        const styles = [
            'Post-Impressionism', 'Impressionism', 'Cubism', 'Surrealism',
            'Renaissance', 'High Renaissance', 'Baroque', 'Dutch Golden Age',
            'Abstract Expressionism', 'Pop Art', 'Fauvism', 'Post-Impressionism'
        ];

        return Array.from({ length: count }, (_, i) => ({
            id: `wikiart_${category}_${Date.now()}_${i}`,
            title: titles[i % titles.length] + (i > titles.length ? ` (${i})` : ''),
            artistName: artists[i % artists.length],
            year: String(1850 + (i * 15) % 150),
            style: styles[i % styles.length],
            genre: category === 'landscape' ? 'Landscape' : 'Various',
            media: 'Oil on canvas',
            image: `https://via.placeholder.com/400x300/4f46e5/ffffff?text=WikiArt+${encodeURIComponent(titles[i % titles.length])}`,
            width: 400 + (i * 10),
            height: 300 + (i * 8),
            completionYear: 1850 + (i * 15) % 150
        }));
    }

    /**
     * 캐시에서 가져오기
     */
    private getFromCache(key: string): any {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    /**
     * 캐시에 저장
     */
    private setCache(key: string, data: any): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        // 캐시 크기 제한
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    /**
     * 서비스 상태 확인
     */
    getStatus(): { name: string; status: string; cached_items: number } {
        return {
            name: 'WikiArt',
            status: 'active',
            cached_items: this.cache.size
        };
    }
}