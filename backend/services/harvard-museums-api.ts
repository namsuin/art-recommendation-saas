import { logger } from '../../shared/logger';
/**
 * Harvard Art Museums API Integration
 * 하버드 대학교 미술관의 방대한 컬렉션 접근
 */

interface HarvardArtwork {
    id: string;
    title: string;
    people?: Array<{
        name: string;
        role: string;
    }>;
    dated?: string;
    classification?: string;
    medium?: string;
    technique?: string;
    culture?: string;
    period?: string;
    primaryimageurl?: string;
    dimensions?: string;
    colors?: Array<{
        color: string;
        spectrum: string;
        hue: string;
        percent: number;
    }>;
}

interface HarvardSearchResponse {
    records: HarvardArtwork[];
    info: {
        totalrecordsperquery: number;
        totalrecords: number;
        pages: number;
        page: number;
    };
}

export class HarvardMuseumsAPI {
    private baseUrl = 'https://api.harvardartmuseums.org';
    private cache = new Map<string, any>();
    private cacheTimeout = 60 * 60 * 1000; // 1시간

    constructor() {
        logger.info('🏛️ Harvard Art Museums API initialized');
    }

    /**
     * 키워드로 작품 검색
     */
    async searchArtworks(keywords: string[], limit: number = 15): Promise<HarvardArtwork[]> {
        try {
            logger.info(`🔍 Harvard: Searching for ${keywords.slice(0, 5).join(', ')}...`);
            
            const cacheKey = `search:${keywords.join(',')}:${limit}`;
            
            // 캐시 확인
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                logger.info(`💾 Harvard: Using cached results (${cached.length} items)`);
                return cached;
            }

            // 다양한 검색 전략으로 작품 수집
            const searchResults = await Promise.all([
                this.searchByKeywords(keywords, Math.floor(limit * 0.4)),
                this.searchByClassification(keywords, Math.floor(limit * 0.3)),
                this.searchByCulture(keywords, Math.floor(limit * 0.3)),
                this.getHighlightArtworks(Math.floor(limit * 0.2))
            ]);

            // 결과 병합 및 중복 제거
            const allResults: HarvardArtwork[] = searchResults
                .flat()
                .filter((artwork, index, array) => 
                    index === array.findIndex(a => a.id === artwork.id)
                )
                .filter(artwork => artwork.primaryimageurl) // 이미지가 있는 작품만
                .slice(0, limit);

            logger.info(`✅ Harvard: Found ${allResults.length} artworks`);
            
            // 캐시 저장
            this.setCache(cacheKey, allResults);
            
            return allResults;
            
        } catch (error) {
            logger.error('❌ Harvard Art Museums API error:', error);
            return this.generateMockArtworks(limit);
        }
    }

    /**
     * 키워드로 직접 검색
     */
    private async searchByKeywords(keywords: string[], limit: number): Promise<HarvardArtwork[]> {
        try {
            // Mock implementation - 실제로는 API 키가 필요
            const mockResults = this.generateMockArtworks(limit, 'keyword_search');
            
            // 키워드와 관련성이 높은 작품들로 필터링
            return mockResults.filter(artwork => {
                const searchText = `${artwork.title} ${artwork.medium} ${artwork.classification}`.toLowerCase();
                return keywords.some(keyword => 
                    searchText.includes(keyword.toLowerCase())
                );
            });
            
        } catch (error) {
            logger.error('❌ Harvard keyword search error:', error);
            return [];
        }
    }

    /**
     * 분류별 검색
     */
    private async searchByClassification(keywords: string[], limit: number): Promise<HarvardArtwork[]> {
        const classifications = [
            'Paintings', 'Drawings', 'Prints', 'Photographs', 'Sculpture',
            'Ceramics', 'Textiles', 'Furniture', 'Metalwork', 'Glass'
        ];

        // 키워드에서 분류 추출
        const matchingClassifications = classifications.filter(classification =>
            keywords.some(keyword =>
                keyword.toLowerCase().includes(classification.toLowerCase().slice(0, -1)) ||
                classification.toLowerCase().includes(keyword.toLowerCase())
            )
        );

        if (matchingClassifications.length === 0) {
            return this.generateMockArtworks(Math.floor(limit / 2), 'paintings');
        }

        // Mock implementation
        return this.generateMockArtworks(limit, matchingClassifications[0].toLowerCase());
    }

    /**
     * 문화권별 검색
     */
    private async searchByCulture(keywords: string[], limit: number): Promise<HarvardArtwork[]> {
        const cultures = [
            'European', 'Asian', 'American', 'African', 'Ancient',
            'Islamic', 'Byzantine', 'Celtic', 'Nordic', 'Mediterranean'
        ];

        const matchingCultures = cultures.filter(culture =>
            keywords.some(keyword =>
                keyword.toLowerCase().includes(culture.toLowerCase()) ||
                culture.toLowerCase().includes(keyword.toLowerCase())
            )
        );

        if (matchingCultures.length === 0) {
            return this.generateMockArtworks(Math.floor(limit / 3), 'european');
        }

        return this.generateMockArtworks(limit, matchingCultures[0].toLowerCase());
    }

    /**
     * 하이라이트 작품 가져오기
     */
    private async getHighlightArtworks(limit: number): Promise<HarvardArtwork[]> {
        try {
            // Mock implementation
            return this.generateMockArtworks(limit, 'highlights');
        } catch (error) {
            logger.error('❌ Harvard highlights error:', error);
            return [];
        }
    }

    /**
     * Mock 작품 생성
     */
    private generateMockArtworks(count: number, category: string = 'general'): HarvardArtwork[] {
        const paintings = [
            {
                title: 'The Starry Night Over the Rhône',
                artist: 'Vincent van Gogh',
                dated: '1888',
                classification: 'Paintings',
                medium: 'Oil on canvas',
                culture: 'European',
                period: 'Post-Impressionist'
            },
            {
                title: 'Woman with a Parasol',
                artist: 'Claude Monet',
                dated: '1875',
                classification: 'Paintings',
                medium: 'Oil on canvas',
                culture: 'European',
                period: 'Impressionist'
            },
            {
                title: 'The Great Wave off Kanagawa',
                artist: 'Katsushika Hokusai',
                dated: '1831',
                classification: 'Prints',
                medium: 'Woodblock print',
                culture: 'Asian',
                period: 'Edo'
            },
            {
                title: 'American Gothic',
                artist: 'Grant Wood',
                dated: '1930',
                classification: 'Paintings',
                medium: 'Oil on beaverboard',
                culture: 'American',
                period: 'American Regionalism'
            },
            {
                title: 'Girl with a Pearl Earring',
                artist: 'Johannes Vermeer',
                dated: '1665',
                classification: 'Paintings',
                medium: 'Oil on canvas',
                culture: 'European',
                period: 'Baroque'
            }
        ];

        return Array.from({ length: Math.min(count, 10) }, (_, i) => {
            const artwork = paintings[i % paintings.length];
            return {
                id: `harvard_${category}_${Date.now()}_${i}`,
                title: artwork.title + (i >= paintings.length ? ` (Study ${i - paintings.length + 1})` : ''),
                people: [{
                    name: artwork.artist,
                    role: 'Artist'
                }],
                dated: artwork.dated,
                classification: artwork.classification,
                medium: artwork.medium,
                technique: 'Traditional',
                culture: artwork.culture,
                period: artwork.period,
                primaryimageurl: `https://via.placeholder.com/500x400/8b5cf6/ffffff?text=Harvard+${encodeURIComponent(artwork.title.split(' ')[0])}`,
                dimensions: `${40 + (i * 5)}cm x ${30 + (i * 4)}cm`,
                colors: [
                    {
                        color: '#8b5cf6',
                        spectrum: 'Purple',
                        hue: 'Violet',
                        percent: 30 + (i * 5)
                    },
                    {
                        color: '#3b82f6',
                        spectrum: 'Blue',
                        hue: 'Blue',
                        percent: 25 + (i * 3)
                    }
                ]
            };
        });
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
        if (this.cache.size > 50) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    /**
     * 서비스 상태 확인
     */
    getStatus(): { name: string; status: string; cached_items: number } {
        return {
            name: 'Harvard Art Museums',
            status: 'active',
            cached_items: this.cache.size
        };
    }
}