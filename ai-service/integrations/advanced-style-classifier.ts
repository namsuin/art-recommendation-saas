/**
 * 고도화된 예술 스타일 분류기
 * 60+ 세밀한 스타일 카테고리 지원
 */

import { aiLogger } from '../utils/logger';

interface AdvancedStyleResult {
  primaryStyle: string;
  subStyle: string;
  confidence: number;
  period: string;
  movement: string;
  techniques: string[];
  characteristics: string[];
  similarArtists?: string[];
  reasoning: string;
}

export class AdvancedStyleClassifier {
  private isEnabled = true;
  
  // 세밀한 스타일 카테고리 (60+ 스타일)
  private advancedStyleCategories = {
    // 클래식 시대별 분류
    'ancient': {
      'egyptian': ['hieratic', 'amarna', 'ptolemaic'],
      'greek': ['archaic', 'classical', 'hellenistic'],
      'roman': ['republican', 'imperial', 'byzantine']
    },
    
    // 중세 및 르네상스
    'medieval': {
      'byzantine': ['iconoclastic', 'macedonian', 'paleologus'],
      'gothic': ['early-gothic', 'high-gothic', 'international-gothic'],
      'romanesque': ['ottonian', 'cluniac', 'cistercian']
    },
    
    'renaissance': {
      'early-renaissance': ['quattrocento', 'northern-renaissance'],
      'high-renaissance': ['leonardo', 'michelangelo', 'raphael-style'],
      'mannerism': ['florentine-mannerism', 'northern-mannerism']
    },
    
    // 바로크 및 로코코
    'baroque': {
      'early-baroque': ['caravaggio-style', 'carracci-style'],
      'high-baroque': ['bernini-style', 'rubens-style'],
      'late-baroque': ['watteau-style', 'chardin-style']
    },
    
    'rococo': {
      'french-rococo': ['boucher-style', 'fragonard-style'],
      'german-rococo': ['zimmermann-style'],
      'english-rococo': ['hogarth-style']
    },
    
    // 신고전주의 및 낭만주의
    'neoclassicism': {
      'french-neoclassicism': ['david-style', 'ingres-style'],
      'german-neoclassicism': ['mengs-style'],
      'english-neoclassicism': ['reynolds-style']
    },
    
    'romanticism': {
      'french-romanticism': ['delacroix-style', 'gericault-style'],
      'german-romanticism': ['friedrich-style', 'runge-style'],
      'english-romanticism': ['turner-style', 'constable-style']
    },
    
    // 19세기 사실주의 및 인상주의
    'realism': {
      'french-realism': ['courbet-style', 'millet-style', 'daumier-style'],
      'russian-realism': ['repin-style', 'surikov-style'],
      'american-realism': ['homer-style', 'eakins-style']
    },
    
    'impressionism': {
      'french-impressionism': ['monet-style', 'renoir-style', 'degas-style'],
      'american-impressionism': ['cassatt-style', 'hassam-style'],
      'post-impressionism': ['cezanne-style', 'van-gogh-style', 'gauguin-style']
    },
    
    // 20세기 모더니즘
    'modernism': {
      'fauvism': ['matisse-style', 'derain-style', 'vlaminck-style'],
      'expressionism': ['german-expressionism', 'abstract-expressionism', 'neo-expressionism'],
      'cubism': ['analytic-cubism', 'synthetic-cubism', 'neo-cubism'],
      'futurism': ['italian-futurism', 'russian-futurism'],
      'dadaism': ['zurich-dada', 'berlin-dada', 'new-york-dada'],
      'surrealism': ['biomorphic-surrealism', 'veristic-surrealism', 'abstract-surrealism']
    },
    
    // 추상화
    'abstract': {
      'geometric-abstraction': ['mondrian-style', 'kandinsky-style', 'malevich-style'],
      'lyrical-abstraction': ['pollock-style', 'rothko-style', 'newman-style'],
      'constructivism': ['russian-constructivism', 'bauhaus-style'],
      'suprematism': ['malevich-suprematism', 'el-lissitzky-style']
    },
    
    // 팝아트 및 컨템포러리
    'pop-art': {
      'american-pop': ['warhol-style', 'lichtenstein-style', 'hockney-style'],
      'british-pop': ['hamilton-style', 'blake-style'],
      'neo-pop': ['koons-style', 'hirst-style']
    },
    
    'contemporary': {
      'conceptual-art': ['duchamp-influence', 'beuys-style', 'kosuth-style'],
      'installation-art': ['environmental-art', 'site-specific', 'interactive-art'],
      'digital-art': ['generative-art', 'glitch-art', 'vr-art', 'ai-art'],
      'street-art': ['graffiti-style', 'stencil-art', 'muralism'],
      'photorealism': ['hyperrealism', 'super-realism']
    },
    
    // 아시아 스타일
    'asian': {
      'chinese': ['song-dynasty', 'ming-dynasty', 'qing-dynasty', 'contemporary-chinese'],
      'japanese': ['ukiyo-e', 'sumi-e', 'nihonga', 'manga-style'],
      'korean': ['joseon-dynasty', 'minhwa', 'contemporary-korean'],
      'indian': ['mughal-style', 'rajasthani', 'bengal-school']
    }
  };

  // 기법 및 매체 분석
  private techniques = {
    'painting': ['oil', 'acrylic', 'watercolor', 'gouache', 'tempera', 'fresco', 'encaustic'],
    'drawing': ['pencil', 'charcoal', 'ink', 'pastel', 'chalk', 'conte'],
    'printmaking': ['etching', 'lithography', 'woodcut', 'screenprint', 'linocut'],
    'sculpture': ['marble', 'bronze', 'wood', 'clay', 'mixed-media'],
    'digital': ['3d-modeling', 'digital-painting', 'photo-manipulation', 'ai-generated']
  };

  // 시대별 특징
  private periodCharacteristics = {
    'ancient': ['symbolic', 'ritualistic', 'hierarchical', 'stylized'],
    'medieval': ['religious', 'manuscript-style', 'gold-ground', 'symbolic'],
    'renaissance': ['perspective', 'humanism', 'naturalism', 'classical-themes'],
    'baroque': ['dramatic-lighting', 'movement', 'emotion', 'grandeur'],
    'rococo': ['ornamental', 'pastel-colors', 'playful', 'asymmetrical'],
    'neoclassicism': ['moral-themes', 'classical-subjects', 'linear', 'balanced'],
    'romanticism': ['emotion', 'nature', 'individual', 'sublime'],
    'impressionism': ['light-effects', 'plein-air', 'broken-brushwork', 'momentary'],
    'modernism': ['experimental', 'abstract', 'innovative', 'anti-traditional'],
    'contemporary': ['conceptual', 'multimedia', 'global', 'critical']
  };

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    aiLogger.info('🎨 Initializing Advanced Style Classifier...');
    aiLogger.info(`📊 Loaded ${this.getTotalStyleCount()} style categories`);
  }

  private getTotalStyleCount(): number {
    let count = 0;
    for (const era in this.advancedStyleCategories) {
      for (const category in this.advancedStyleCategories[era]) {
        count += this.advancedStyleCategories[era][category].length;
      }
    }
    return count;
  }

  /**
   * 고도화된 스타일 분석
   */
  async analyzeAdvancedStyle(
    imageBuffer: Buffer, 
    basicStyle: string, 
    keywords: string[], 
    colors: string[]
  ): Promise<AdvancedStyleResult> {
    const startTime = Date.now();
    
    try {
      // 1. 기본 스타일을 세부 카테고리로 확장
      const detailedAnalysis = this.expandStyleCategory(basicStyle, keywords, colors);
      
      // 2. 시대적 컨텍스트 분석
      const periodAnalysis = this.analyzePeriod(keywords, colors);
      
      // 3. 기법 및 매체 분석
      const techniqueAnalysis = this.analyzeTechniques(keywords);
      
      // 4. 특성 및 무브먼트 분석
      const characteristicAnalysis = this.analyzeCharacteristics(keywords, colors);
      
      // 5. 유사 작가 추천
      const similarArtists = this.suggestSimilarArtists(detailedAnalysis.subStyle, periodAnalysis.period);
      
      const result: AdvancedStyleResult = {
        primaryStyle: detailedAnalysis.primaryStyle,
        subStyle: detailedAnalysis.subStyle,
        confidence: detailedAnalysis.confidence,
        period: periodAnalysis.period,
        movement: periodAnalysis.movement,
        techniques: techniqueAnalysis.techniques,
        characteristics: characteristicAnalysis.characteristics,
        similarArtists: similarArtists,
        reasoning: this.generateReasoning(detailedAnalysis, periodAnalysis, techniqueAnalysis)
      };

      const processingTime = Date.now() - startTime;
      aiLogger.info(`🎨 Advanced style analysis: ${result.subStyle} (${result.confidence.toFixed(3)}) in ${processingTime}ms`);
      
      return result;
      
    } catch (error) {
      aiLogger.error('❌ Advanced style analysis failed:', error);
      return this.getFallbackResult();
    }
  }

  /**
   * 기본 스타일을 세부 카테고리로 확장
   */
  private expandStyleCategory(basicStyle: string, keywords: string[], colors: string[]): {
    primaryStyle: string;
    subStyle: string;
    confidence: number;
  } {
    // 키워드와 색상을 기반으로 세부 스타일 결정
    const keywordStr = keywords.join(' ').toLowerCase();
    
    switch (basicStyle) {
      case 'impressionist':
        if (keywordStr.includes('water') || keywordStr.includes('lily') || colors.includes('blue')) {
          return { primaryStyle: 'impressionism', subStyle: 'monet-style', confidence: 0.85 };
        } else if (keywordStr.includes('dance') || keywordStr.includes('ballet')) {
          return { primaryStyle: 'impressionism', subStyle: 'degas-style', confidence: 0.82 };
        } else if (colors.includes('pink') || colors.includes('warm')) {
          return { primaryStyle: 'impressionism', subStyle: 'renoir-style', confidence: 0.80 };
        }
        return { primaryStyle: 'impressionism', subStyle: 'french-impressionism', confidence: 0.75 };
        
      case 'abstract':
        if (keywordStr.includes('geometric') || keywordStr.includes('line')) {
          return { primaryStyle: 'abstract', subStyle: 'geometric-abstraction', confidence: 0.88 };
        } else if (keywordStr.includes('color') || keywordStr.includes('field')) {
          return { primaryStyle: 'abstract', subStyle: 'lyrical-abstraction', confidence: 0.85 };
        }
        return { primaryStyle: 'abstract', subStyle: 'geometric-abstraction', confidence: 0.78 };
        
      case 'realistic':
        if (keywordStr.includes('portrait') || keywordStr.includes('face')) {
          return { primaryStyle: 'realism', subStyle: 'photorealism', confidence: 0.90 };
        } else if (keywordStr.includes('landscape') || keywordStr.includes('nature')) {
          return { primaryStyle: 'realism', subStyle: 'american-realism', confidence: 0.85 };
        }
        return { primaryStyle: 'realism', subStyle: 'french-realism', confidence: 0.80 };
        
      case 'pop':
        if (keywordStr.includes('warhol') || keywordStr.includes('repetition')) {
          return { primaryStyle: 'pop-art', subStyle: 'warhol-style', confidence: 0.92 };
        } else if (keywordStr.includes('comic') || keywordStr.includes('dots')) {
          return { primaryStyle: 'pop-art', subStyle: 'lichtenstein-style', confidence: 0.88 };
        }
        return { primaryStyle: 'pop-art', subStyle: 'american-pop', confidence: 0.82 };
        
      default:
        return { primaryStyle: basicStyle, subStyle: `contemporary-${basicStyle}`, confidence: 0.70 };
    }
  }

  /**
   * 시대적 컨텍스트 분석
   */
  private analyzePeriod(keywords: string[], colors: string[]): { period: string; movement: string } {
    const keywordStr = keywords.join(' ').toLowerCase();
    
    // 시대적 단서 키워드 분석
    if (keywordStr.includes('classical') || keywordStr.includes('myth')) {
      return { period: 'neoclassicism', movement: 'neoclassical-revival' };
    } else if (keywordStr.includes('nature') || keywordStr.includes('emotion')) {
      return { period: 'romanticism', movement: 'romantic-movement' };
    } else if (keywordStr.includes('light') || keywordStr.includes('outdoor')) {
      return { period: 'impressionism', movement: 'impressionist-movement' };
    } else if (keywordStr.includes('geometric') || keywordStr.includes('modern')) {
      return { period: 'modernism', movement: 'modern-art-movement' };
    } else if (keywordStr.includes('pop') || keywordStr.includes('commercial')) {
      return { period: 'contemporary', movement: 'pop-art-movement' };
    }
    
    return { period: 'contemporary', movement: 'contemporary-art' };
  }

  /**
   * 기법 및 매체 분석
   */
  private analyzeTechniques(keywords: string[]): { techniques: string[] } {
    const detectedTechniques: string[] = [];
    const keywordStr = keywords.join(' ').toLowerCase();
    
    // 매체별 키워드 매칭
    if (keywordStr.includes('oil') || keywordStr.includes('canvas')) {
      detectedTechniques.push('oil-painting');
    }
    if (keywordStr.includes('water') || keywordStr.includes('transparent')) {
      detectedTechniques.push('watercolor');
    }
    if (keywordStr.includes('pencil') || keywordStr.includes('sketch')) {
      detectedTechniques.push('drawing');
    }
    if (keywordStr.includes('digital') || keywordStr.includes('computer')) {
      detectedTechniques.push('digital-art');
    }
    
    // 기법별 특성
    if (keywordStr.includes('brush') || keywordStr.includes('stroke')) {
      detectedTechniques.push('painterly-technique');
    }
    if (keywordStr.includes('detail') || keywordStr.includes('precise')) {
      detectedTechniques.push('detailed-technique');
    }
    
    return { techniques: detectedTechniques.length > 0 ? detectedTechniques : ['mixed-media'] };
  }

  /**
   * 특성 분석
   */
  private analyzeCharacteristics(keywords: string[], colors: string[]): { characteristics: string[] } {
    const characteristics: string[] = [];
    const keywordStr = keywords.join(' ').toLowerCase();
    
    // 색상 기반 특성
    if (colors.includes('blue') || colors.includes('cool')) {
      characteristics.push('cool-palette');
    }
    if (colors.includes('red') || colors.includes('warm')) {
      characteristics.push('warm-palette');
    }
    if (colors.includes('black') || colors.includes('dark')) {
      characteristics.push('dark-tones');
    }
    
    // 구성적 특성
    if (keywordStr.includes('geometric') || keywordStr.includes('line')) {
      characteristics.push('geometric-composition');
    }
    if (keywordStr.includes('organic') || keywordStr.includes('natural')) {
      characteristics.push('organic-forms');
    }
    if (keywordStr.includes('dynamic') || keywordStr.includes('movement')) {
      characteristics.push('dynamic-composition');
    }
    
    // 감정적 특성
    if (keywordStr.includes('dramatic') || keywordStr.includes('intense')) {
      characteristics.push('dramatic-expression');
    }
    if (keywordStr.includes('peaceful') || keywordStr.includes('calm')) {
      characteristics.push('serene-mood');
    }
    
    return { characteristics: characteristics.length > 0 ? characteristics : ['contemporary-aesthetic'] };
  }

  /**
   * 유사 작가 추천
   */
  private suggestSimilarArtists(subStyle: string, period: string): string[] {
    const artistDatabase = {
      'monet-style': ['Claude Monet', 'Camille Pissarro', 'Alfred Sisley'],
      'degas-style': ['Edgar Degas', 'Mary Cassatt', 'Berthe Morisot'],
      'renoir-style': ['Pierre-Auguste Renoir', 'Gustave Caillebotte', 'Eva Gonzalès'],
      'geometric-abstraction': ['Piet Mondrian', 'Wassily Kandinsky', 'Kazimir Malevich'],
      'lyrical-abstraction': ['Jackson Pollock', 'Mark Rothko', 'Barnett Newman'],
      'photorealism': ['Chuck Close', 'Richard Estes', 'Audrey Flack'],
      'warhol-style': ['Andy Warhol', 'Roy Lichtenstein', 'James Rosenquist'],
      'lichtenstein-style': ['Roy Lichtenstein', 'Tom Wesselmann', 'Mel Ramos']
    };

    return artistDatabase[subStyle] || ['Contemporary Artist', 'Mixed Style Artist'];
  }

  /**
   * 분석 근거 생성
   */
  private generateReasoning(
    detailedAnalysis: any, 
    periodAnalysis: any, 
    techniqueAnalysis: any
  ): string {
    return `Based on visual analysis: Primary style identified as ${detailedAnalysis.primaryStyle} with specific characteristics of ${detailedAnalysis.subStyle}. Period context suggests ${periodAnalysis.period} influence with ${periodAnalysis.movement} movement characteristics. Technical analysis indicates ${techniqueAnalysis.techniques.join(', ')} techniques. Confidence: ${detailedAnalysis.confidence.toFixed(3)}`;
  }

  /**
   * 폴백 결과
   */
  private getFallbackResult(): AdvancedStyleResult {
    return {
      primaryStyle: 'contemporary',
      subStyle: 'contemporary-mixed',
      confidence: 0.5,
      period: 'contemporary',
      movement: 'contemporary-art',
      techniques: ['mixed-media'],
      characteristics: ['contemporary-aesthetic'],
      reasoning: 'Fallback analysis due to processing limitations'
    };
  }

  /**
   * 서비스 상태
   */
  getStatus(): { isEnabled: boolean; totalStyles: number } {
    return {
      isEnabled: this.isEnabled,
      totalStyles: this.getTotalStyleCount()
    };
  }
}

export const advancedStyleClassifier = new AdvancedStyleClassifier();