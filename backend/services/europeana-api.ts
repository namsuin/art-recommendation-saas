import { logger } from '../../shared/logger';
/**
 * Europeana API Integration
 * 유럽 최대 규모의 문화 유산 디지털 플랫폼
 */

interface EuropeanaItem {
    id: string;
    title: string[];
    dcCreator?: string[];
    dcDate?: string[];
    dcType?: string[];
    dcFormat?: string[];
    dcDescription?: string[];
    edmPreview?: string[];
    dataProvider: string[];
    provider: string[];
    country: string[];
    language: string[];
    rights: string[];
    edmIsShownAt?: string[];
}

interface EuropeanaResponse {
    success: boolean;
    itemsCount: number;
    totalResults: number;
    items: EuropeanaItem[];
}

export class EuropeanaAPI {
    private baseUrl = 'https://api.europeana.eu/record/v2';
    private searchUrl = 'https://api.europeana.eu/record/v2/search.json';
    private apiKey: string | null = null;
    private cache = new Map<string, any>();
    private cacheTimeout = 45 * 60 * 1000; // 45분

    constructor() {
        // Try to use API key from environment, but don't require it
        this.apiKey = process.env.EUROPEANA_API_KEY || null;
        if (this.apiKey) {
            logger.info('🏛️ Europeana API initialized with API key');
        } else {
            logger.info('🏛️ Europeana API initialized (no API key - using demo mode)');
        }
    }

    /**
     * 키워드로 문화 유산 검색
     */
    async searchArtworks(keywords: string[], limit: number = 12): Promise<EuropeanaItem[]> {
        try {
            logger.info(`🔍 Europeana: Searching for ${keywords.slice(0, 5).join(', ')}...`);
            
            const cacheKey = `search:${keywords.join(',')}:${limit}`;
            
            // 캐시 확인
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                logger.info(`💾 Europeana: Using cached results (${cached.length} items)`);
                return cached;
            }

            // 다양한 검색 전략
            const searchResults = await Promise.all([
                this.searchByType('IMAGE', keywords, Math.floor(limit * 0.6)),
                this.searchByType('3D', keywords, Math.floor(limit * 0.2)),
                this.searchByProvider(keywords, Math.floor(limit * 0.3)),
                this.searchByCountry(keywords, Math.floor(limit * 0.2))
            ]);

            // 결과 병합 및 중복 제거
            const allResults: EuropeanaItem[] = searchResults
                .flat()
                .filter((item, index, array) => 
                    index === array.findIndex(i => i.id === item.id)
                )
                .filter(item => item.edmPreview && item.edmPreview.length > 0) // 이미지가 있는 것만
                .slice(0, limit);

            logger.info(`✅ Europeana: Found ${allResults.length} cultural items`);
            
            // 캐시 저장
            this.setCache(cacheKey, allResults);
            
            return allResults;
            
        } catch (error) {
            logger.error('❌ Europeana API error:', error);
            // Return empty array instead of mock data - let other sources handle recommendations
            return [];
        }
    }

    /**
     * 타입별 검색
     */
    private async searchByType(type: string, keywords: string[], limit: number): Promise<EuropeanaItem[]> {
        try {
            if (!this.apiKey) {
                // No API key available - return empty array to skip
                return [];
            }
            
            const query = this.buildSearchQuery(keywords, type);
            const url = `${this.searchUrl}?wskey=${this.apiKey}&query=${query}&rows=${limit}&profile=rich`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data: EuropeanaResponse = await response.json();
            return this.formatEuropeanaResponse(data.items || []);
        } catch (error) {
            logger.error(`❌ Europeana type search error (${type}):`, error);
            return [];
        }
    }

    /**
     * 제공기관별 검색
     */
    private async searchByProvider(keywords: string[], limit: number): Promise<EuropeanaItem[]> {
        try {
            if (!this.apiKey) {
                return [];
            }
            
            const providers = [
                'Rijksmuseum', 'British Museum', 'Louvre', 'National Gallery',
                'Uffizi', 'Prado', 'Hermitage', 'MOMA'
            ];
            
            const query = this.buildSearchQuery(keywords);
            const url = `${this.searchUrl}?wskey=${this.apiKey}&query=${query}&rows=${limit}&profile=rich`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data: EuropeanaResponse = await response.json();
            return this.formatEuropeanaResponse(data.items || []);
        } catch (error) {
            logger.error('❌ Europeana provider search error:', error);
            return [];
        }
    }

    /**
     * 국가별 검색
     */
    private async searchByCountry(keywords: string[], limit: number): Promise<EuropeanaItem[]> {
        try {
            if (!this.apiKey) {
                return [];
            }
            
            const countries = [
                'France', 'Italy', 'Germany', 'Spain', 'Netherlands',
                'United Kingdom', 'Russia', 'Austria'
            ];
            
            const query = this.buildSearchQuery(keywords);
            const url = `${this.searchUrl}?wskey=${this.apiKey}&query=${query}&rows=${limit}&profile=rich`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data: EuropeanaResponse = await response.json();
            return this.formatEuropeanaResponse(data.items || []);
        } catch (error) {
            logger.error('❌ Europeana country search error:', error);
            return [];
        }
    }

    /**
     * Europeana API 응답을 내부 형식으로 변환
     */
    private formatEuropeanaResponse(items: any[]): EuropeanaItem[] {
        if (!Array.isArray(items)) return [];
        
        return items
            .filter(item => item && (item.edmPreview || item.edmIsShownBy))
            .map(item => ({
                id: `europeana_${item.id || Math.random().toString(36)}`,
                title: Array.isArray(item.title) ? item.title : [item.title || 'Untitled'],
                dcCreator: Array.isArray(item.dcCreator) ? item.dcCreator : [item.dcCreator || 'Unknown Artist'],
                dcDate: Array.isArray(item.dcDate) ? item.dcDate : [item.dcDate || ''],
                dcType: Array.isArray(item.dcType) ? item.dcType : [item.dcType || ''],
                dcFormat: Array.isArray(item.dcFormat) ? item.dcFormat : [item.dcFormat || ''],
                dcDescription: Array.isArray(item.dcDescription) ? item.dcDescription : [item.dcDescription || ''],
                edmPreview: Array.isArray(item.edmPreview) ? item.edmPreview : [item.edmPreview || item.edmIsShownBy],
                dataProvider: Array.isArray(item.dataProvider) ? item.dataProvider : [item.dataProvider || 'Europeana'],
                provider: Array.isArray(item.provider) ? item.provider : [item.provider || 'Europeana'],
                country: Array.isArray(item.country) ? item.country : [item.country || ''],
                language: Array.isArray(item.language) ? item.language : [item.language || 'en'],
                rights: Array.isArray(item.rights) ? item.rights : [item.rights || ''],
                edmIsShownAt: Array.isArray(item.edmIsShownAt) ? item.edmIsShownAt : [item.edmIsShownAt || '']
            }));
    }

    /**
     * Mock 아이템 생성 (API 키 없을 때 fallback용)
     */
    private generateMockItems(count: number, category: string = 'general'): EuropeanaItem[] {
        const mockData = [
            {
                title: 'The Birth of Venus',
                creator: 'Sandro Botticelli',
                date: '1484-1486',
                type: 'Painting',
                description: 'Renaissance masterpiece depicting the goddess Venus',
                provider: 'Uffizi Gallery',
                country: 'Italy'
            },
            {
                title: 'The Thinker',
                creator: 'Auguste Rodin',
                date: '1904',
                type: 'Sculpture',
                description: 'Bronze sculpture depicting a man in contemplation',
                provider: 'Musée Rodin',
                country: 'France'
            },
            {
                title: 'Liberty Leading the People',
                creator: 'Eugène Delacroix',
                date: '1830',
                type: 'Painting',
                description: 'Romantic painting commemorating the July Revolution',
                provider: 'Louvre',
                country: 'France'
            },
            {
                title: 'The Garden of Earthly Delights',
                creator: 'Hieronymus Bosch',
                date: '1503-1515',
                type: 'Painting',
                description: 'Triptych painted in oil on oak panels',
                provider: 'Museo del Prado',
                country: 'Spain'
            },
            {
                title: 'The Kiss',
                creator: 'Gustav Klimt',
                date: '1907-1908',
                type: 'Painting',
                description: 'Golden Phase painting symbolizing love',
                provider: 'Österreichische Galerie Belvedere',
                country: 'Austria'
            }
        ];

        return Array.from({ length: Math.min(count, 8) }, (_, i) => {
            const item = mockData[i % mockData.length];
            return {
                id: `europeana_${category}_${Date.now()}_${i}`,
                title: [item.title + (i >= mockData.length ? ` (Variation ${i - mockData.length + 1})` : '')],
                dcCreator: [item.creator],
                dcDate: [item.date],
                dcType: [item.type],
                dcFormat: ['Digital Image'],
                dcDescription: [item.description],
                edmPreview: [`https://via.placeholder.com/480x360/f59e0b/ffffff?text=Europeana+${encodeURIComponent(item.title.split(' ')[0])}`],
                dataProvider: [item.provider],
                provider: ['Europeana'],
                country: [item.country],
                language: ['en'],
                rights: ['http://creativecommons.org/licenses/by-sa/3.0/'],
                edmIsShownAt: [`https://europeana.eu/item/${category}_${i}`]
            };
        });
    }

    /**
     * Europeana 검색 쿼리 생성
     */
    private buildSearchQuery(keywords: string[], type?: string, country?: string): string {
        let query = keywords.slice(0, 3).join(' AND ');
        
        if (type) {
            query += ` AND TYPE:${type}`;
        }
        
        if (country) {
            query += ` AND COUNTRY:${country}`;
        }
        
        // 이미지가 있는 결과만
        query += ' AND provider_aggregation_edm_isShownBy:*';
        
        return encodeURIComponent(query);
    }

    /**
     * 상세 아이템 정보 가져오기
     */
    async getItemDetails(itemId: string): Promise<EuropeanaItem | null> {
        try {
            const cacheKey = `item:${itemId}`;
            
            // 캐시 확인
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            // Mock implementation
            const mockItem = this.generateMockItems(1, 'detail')[0];
            mockItem.id = itemId;
            
            // 캐시 저장
            this.setCache(cacheKey, mockItem);
            
            return mockItem;
            
        } catch (error) {
            logger.error('❌ Europeana item details error:', error);
            return null;
        }
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
        if (this.cache.size > 75) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    /**
     * 서비스 상태 확인
     */
    getStatus(): { name: string; status: string; cached_items: number } {
        return {
            name: 'Europeana',
            status: 'active',
            cached_items: this.cache.size
        };
    }
}