import axios from 'axios';

// DegreeArt 영국 온라인 아트 플랫폼 API 서비스
export class DegreeArtAPI {
  private baseURL = 'https://www.degreeart.com';
  
  // DegreeArt의 주요 미디엄들
  private readonly mediums = [
    'Painting',
    'Sculpture', 
    'Drawing',
    'Photography',
    'Limited Prints'
  ];

  // 주요 테마/주제들
  private readonly themes = [
    'People & Figures',
    'Landscapes',
    'Animals',
    'Abstract',
    'Still Life'
  ];

  // 가격대별 카테고리 (GBP)
  private readonly priceRanges = [
    { name: 'Under £100', min: 0, max: 100 },
    { name: '£100-£500', min: 100, max: 500 },
    { name: '£500-£1500', min: 500, max: 1500 },
    { name: 'Over £1500', min: 1500, max: null }
  ];

  // 사이즈 카테고리
  private readonly sizes = [
    { name: 'Small', description: 'Under 50cm', maxDimension: 50 },
    { name: 'Medium', description: '50-100cm', maxDimension: 100 },
    { name: 'Large', description: 'Over 100cm', maxDimension: 200 }
  ];

  /**
   * 키워드로 DegreeArt 작품 검색
   */
  async searchByKeywords(keywords: string[], limit: number = 20): Promise<{
    success: boolean;
    artworks: any[];
    total: number;
    error?: string;
  }> {
    try {
      console.log(`🇬🇧 DegreeArt 검색: ${keywords.join(', ')}`);
      
      // 실제 API 연동이 불가능하므로 교육적 목적의 Mock 데이터 생성
      const mockArtworks = this.generateDegreeArtMockData(keywords, limit);
      
      return {
        success: true,
        artworks: mockArtworks,
        total: mockArtworks.length
      };

    } catch (error) {
      console.error('DegreeArt search error:', error);
      return {
        success: false,
        artworks: [],
        total: 0,
        error: error instanceof Error ? error.message : 'DegreeArt 검색 실패'
      };
    }
  }

  /**
   * 미디엄별 작품 검색
   */
  async searchByMedium(
    medium: string, 
    keywords: string[] = [], 
    limit: number = 20
  ): Promise<{
    success: boolean;
    artworks: any[];
    total: number;
    medium: string;
    error?: string;
  }> {
    try {
      if (!this.mediums.includes(medium)) {
        throw new Error(`지원하지 않는 미디엄입니다: ${medium}`);
      }

      const mockArtworks = this.generateMediumSpecificMockData(medium, keywords, limit);
      
      return {
        success: true,
        artworks: mockArtworks,
        total: mockArtworks.length,
        medium: medium
      };

    } catch (error) {
      console.error('DegreeArt medium search error:', error);
      return {
        success: false,
        artworks: [],
        total: 0,
        medium: medium,
        error: error instanceof Error ? error.message : '미디엄별 검색 실패'
      };
    }
  }

  /**
   * 테마별 작품 검색
   */
  async searchByTheme(
    theme: string,
    keywords: string[] = [],
    limit: number = 20
  ): Promise<{
    success: boolean;
    artworks: any[];
    total: number;
    theme: string;
    error?: string;
  }> {
    try {
      if (!this.themes.includes(theme)) {
        throw new Error(`지원하지 않는 테마입니다: ${theme}`);
      }

      const mockArtworks = this.generateThemeSpecificMockData(theme, keywords, limit);
      
      return {
        success: true,
        artworks: mockArtworks,
        total: mockArtworks.length,
        theme: theme
      };

    } catch (error) {
      console.error('DegreeArt theme search error:', error);
      return {
        success: false,
        artworks: [],
        total: 0,
        theme: theme,
        error: error instanceof Error ? error.message : '테마별 검색 실패'
      };
    }
  }

  /**
   * 가격대별 작품 검색
   */
  async searchByPriceRange(
    priceRange: string,
    keywords: string[] = [],
    limit: number = 20
  ): Promise<{
    success: boolean;
    artworks: any[];
    total: number;
    priceRange: string;
    error?: string;
  }> {
    try {
      const range = this.priceRanges.find(r => r.name === priceRange);
      if (!range) {
        throw new Error(`지원하지 않는 가격대입니다: ${priceRange}`);
      }

      const mockArtworks = this.generatePriceSpecificMockData(range, keywords, limit);
      
      return {
        success: true,
        artworks: mockArtworks,
        total: mockArtworks.length,
        priceRange: priceRange
      };

    } catch (error) {
      console.error('DegreeArt price search error:', error);
      return {
        success: false,
        artworks: [],
        total: 0,
        priceRange: priceRange,
        error: error instanceof Error ? error.message : '가격대별 검색 실패'
      };
    }
  }

  /**
   * 신진 작가 작품 검색 (DegreeArt 특화)
   */
  async searchEmergingArtists(keywords: string[] = [], limit: number = 20): Promise<{
    success: boolean;
    artworks: any[];
    total: number;
    specialty: string;
    program_info: string;
    error?: string;
  }> {
    try {
      const mockArtworks = this.generateEmergingArtistMockData(keywords, limit);
      
      return {
        success: true,
        artworks: mockArtworks,
        total: mockArtworks.length,
        specialty: 'Emerging Artists',
        program_info: '🎨 DegreeArt는 신진 작가들을 발굴하고 지원하는 플랫폼입니다.'
      };

    } catch (error) {
      console.error('DegreeArt emerging artists search error:', error);
      return {
        success: false,
        artworks: [],
        total: 0,
        specialty: 'Emerging Artists',
        program_info: 'DegreeArt 신진 작가 프로그램 정보',
        error: error instanceof Error ? error.message : '신진 작가 검색 실패'
      };
    }
  }

  /**
   * DegreeArt Mock 데이터 생성
   */
  private generateDegreeArtMockData(keywords: string[], limit: number): any[] {
    const ukCities = ['London', 'Manchester', 'Edinburgh', 'Birmingham', 'Bristol', 'Liverpool'];
    const artStyles = ['Contemporary', 'Modern', 'Classical', 'Experimental', 'Conceptual'];
    const exhibitions = ['Royal Academy Summer Exhibition', 'Tate Modern', 'Saatchi Gallery', 'White Cube'];
    
    return Array.from({ length: limit }, (_, i) => {
      const medium = this.mediums[i % this.mediums.length];
      const theme = this.themes[i % this.themes.length];
      const city = ukCities[i % ukCities.length];
      const style = artStyles[i % artStyles.length];
      const exhibition = exhibitions[i % exhibitions.length];
      const priceRange = this.priceRanges[i % this.priceRanges.length];
      const price = this.generatePrice(priceRange.min, priceRange.max);
      const artistNumber = String(i + 1).padStart(3, '0');
      
      return {
        id: `degreeart_${Date.now()}_${i}`,
        title: `${keywords[0] || 'Contemporary Work'} - ${theme} ${style}`,
        artist: `UK Artist ${artistNumber}`,
        location: `${city}, UK`,
        medium: medium,
        theme: theme,
        style: style,
        price_gbp: price,
        price_usd: Math.round(price * 1.27), // GBP to USD conversion
        size: this.generateSize(),
        year: 2024 - Math.floor(Math.random() * 3),
        exhibition_history: exhibition,
        image_url: `https://via.placeholder.com/600x400/2E4057/FFFFFF?text=${encodeURIComponent(medium)}`,
        thumbnail_url: `https://via.placeholder.com/300x200/2E4057/FFFFFF?text=${encodeURIComponent(medium)}`,
        source: 'DegreeArt',
        source_url: `${this.baseURL}/artwork/${artistNumber}`,
        keywords: [medium.toLowerCase(), theme.toLowerCase(), style.toLowerCase(), 'uk art', 'contemporary', ...keywords],
        description: `${style} ${medium.toLowerCase()} artwork exploring ${theme.toLowerCase()} themes by emerging UK artist`,
        available: true,
        certification: 'Certificate of Authenticity included',
        platform: 'degreeart',
        marketplace: 'DegreeArt UK',
        artist_emerging: true,
        handpicked: Math.random() > 0.5,
        created_date: new Date().toISOString(),
        search_source: 'DegreeArt'
      };
    });
  }

  /**
   * 미디엄별 특화 Mock 데이터 생성
   */
  private generateMediumSpecificMockData(medium: string, keywords: string[], limit: number): any[] {
    const mediumSpecificData = {
      'Painting': {
        techniques: ['Oil on Canvas', 'Acrylic on Canvas', 'Watercolor on Paper', 'Mixed Media'],
        subjects: ['Portrait', 'Landscape', 'Abstract', 'Still Life']
      },
      'Sculpture': {
        techniques: ['Bronze Casting', 'Marble Carving', 'Steel Welding', 'Clay Modeling'],
        subjects: ['Figure', 'Abstract Form', 'Installation', 'Bust']
      },
      'Photography': {
        techniques: ['Digital Photography', 'Film Photography', 'Darkroom Print', 'Digital Manipulation'],
        subjects: ['Street Photography', 'Portrait', 'Landscape', 'Conceptual']
      },
      'Drawing': {
        techniques: ['Charcoal on Paper', 'Ink Drawing', 'Pencil Sketch', 'Pastel'],
        subjects: ['Life Drawing', 'Portrait Study', 'Landscape', 'Abstract']
      }
    };

    const data = mediumSpecificData[medium as keyof typeof mediumSpecificData] || {
      techniques: ['Traditional Technique', 'Modern Approach', 'Mixed Media'],
      subjects: ['Contemporary Subject', 'Classical Theme', 'Modern Interpretation']
    };

    const baseData = this.generateDegreeArtMockData(keywords, limit);
    
    return baseData.map((artwork, i) => ({
      ...artwork,
      medium: medium,
      technique: data.techniques[i % data.techniques.length],
      subject: data.subjects[i % data.subjects.length],
      title: `${data.subjects[i % data.subjects.length]} - ${keywords[0] || medium}`
    }));
  }

  /**
   * 테마별 특화 Mock 데이터 생성
   */
  private generateThemeSpecificMockData(theme: string, keywords: string[], limit: number): any[] {
    const themeSpecificData = {
      'People & Figures': {
        approaches: ['Realistic', 'Abstract', 'Expressionist', 'Minimalist'],
        contexts: ['Individual Portrait', 'Group Dynamic', 'Human Emotion', 'Social Commentary']
      },
      'Landscapes': {
        approaches: ['Realistic', 'Impressionist', 'Abstract', 'Romantic'],
        contexts: ['Urban Scene', 'Natural Vista', 'Seasonal Study', 'Environmental Message']
      },
      'Abstract': {
        approaches: ['Geometric', 'Expressionist', 'Minimalist', 'Color Field'],
        contexts: ['Emotional Expression', 'Formal Study', 'Conceptual Exploration', 'Pure Aesthetics']
      }
    };

    const data = themeSpecificData[theme as keyof typeof themeSpecificData] || {
      approaches: ['Contemporary', 'Traditional', 'Experimental'],
      contexts: ['Modern Interpretation', 'Classical Approach', 'Innovative Expression']
    };

    const baseData = this.generateDegreeArtMockData(keywords, limit);
    
    return baseData.map((artwork, i) => ({
      ...artwork,
      theme: theme,
      approach: data.approaches[i % data.approaches.length],
      context: data.contexts[i % data.contexts.length],
      title: `${data.contexts[i % data.contexts.length]} - ${keywords[0] || theme}`
    }));
  }

  /**
   * 가격대별 특화 Mock 데이터 생성
   */
  private generatePriceSpecificMockData(priceRange: any, keywords: string[], limit: number): any[] {
    const baseData = this.generateDegreeArtMockData(keywords, limit);
    
    return baseData.map(artwork => ({
      ...artwork,
      price_gbp: this.generatePrice(priceRange.min, priceRange.max),
      price_range: priceRange.name,
      investment_level: priceRange.min < 500 ? 'Entry Level' : priceRange.min < 1500 ? 'Collector' : 'Investment'
    }));
  }

  /**
   * 신진 작가 특화 Mock 데이터 생성
   */
  private generateEmergingArtistMockData(keywords: string[], limit: number): any[] {
    const artSchools = ['Royal College of Art', 'Goldsmiths', 'Slade School', 'Central Saint Martins', 'Glasgow School of Art'];
    const programs = ['Artist Residency', 'Mentorship Program', 'Exhibition Opportunity', 'Collector Introduction'];
    const achievements = ['Graduate Award', 'Emerging Artist Prize', 'First Solo Show', 'Group Exhibition'];
    
    return Array.from({ length: limit }, (_, i) => {
      const school = artSchools[i % artSchools.length];
      const program = programs[i % programs.length];
      const achievement = achievements[i % achievements.length];
      const artistNumber = String(i + 1).padStart(3, '0');
      const medium = this.mediums[i % this.mediums.length];
      const theme = this.themes[i % this.themes.length];
      
      return {
        id: `degreeart_emerging_${Date.now()}_${i}`,
        title: `${keywords[0] || 'Emerging Work'} - ${theme} Study`,
        artist: `Emerging Artist ${artistNumber}`,
        education: school,
        program: program,
        achievement: achievement,
        career_stage: 'Early Career',
        medium: medium,
        theme: theme,
        price_gbp: this.generatePrice(150, 800), // Emerging artists typically lower priced
        price_usd: Math.round(this.generatePrice(150, 800) * 1.27),
        size: this.generateSize(),
        year: 2024,
        image_url: `https://via.placeholder.com/600x400/4A90E2/FFFFFF?text=${encodeURIComponent('Emerging Artist')}`,
        thumbnail_url: `https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=${encodeURIComponent('Emerging Artist')}`,
        source: 'DegreeArt',
        source_url: `${this.baseURL}/emerging-artist/${artistNumber}`,
        keywords: [medium.toLowerCase(), theme.toLowerCase(), 'emerging artist', school.toLowerCase(), ...keywords],
        description: `Promising work by ${school} graduate exploring ${theme.toLowerCase()} through ${medium.toLowerCase()}`,
        artist_support: `Supported through DegreeArt's ${program}`,
        investment_potential: 'High potential for value growth',
        available: true,
        platform: 'degreeart',
        category: 'Emerging Artists',
        handpicked: true,
        first_artwork: Math.random() > 0.7,
        created_date: new Date().toISOString(),
        search_source: 'DegreeArt'
      };
    });
  }

  /**
   * 가격 생성 헬퍼
   */
  private generatePrice(min: number, max: number | null): number {
    if (max === null) {
      return min + Math.floor(Math.random() * 5000); // For "Over £1500" category
    }
    return min + Math.floor(Math.random() * (max - min));
  }

  /**
   * 사이즈 생성 헬퍼
   */
  private generateSize(): string {
    const size = this.sizes[Math.floor(Math.random() * this.sizes.length)];
    return `${size.name} (${size.description})`;
  }

  /**
   * 지원되는 미디엄 목록 반환
   */
  getSupportedMediums(): string[] {
    return [...this.mediums];
  }

  /**
   * 지원되는 테마 목록 반환
   */
  getSupportedThemes(): string[] {
    return [...this.themes];
  }

  /**
   * 지원되는 가격대 목록 반환
   */
  getSupportedPriceRanges(): typeof this.priceRanges {
    return [...this.priceRanges];
  }

  /**
   * DegreeArt 플랫폼 정보 반환
   */
  getPlatformInfo(): {
    name: string;
    country: string;
    website: string;
    specialty: string;
    features: string[];
  } {
    return {
      name: 'DegreeArt',
      country: 'United Kingdom',
      website: this.baseURL,
      specialty: 'Emerging and Contemporary Artists',
      features: [
        'Handpicked artist collections',
        'Artist residency programs',
        'Art prize competitions',
        'Certificate of Authenticity',
        'Supporting emerging talent',
        'Curated contemporary art'
      ]
    };
  }
}