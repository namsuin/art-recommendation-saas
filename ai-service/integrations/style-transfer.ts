import type { AIServiceInterface, AIAnalysisResult } from '../../shared/types/index';

interface StyleTransferResult {
  transferredImage: string; // Base64 encoded image
  styleStrength: number;
  originalStyle: string;
  targetStyle: string;
  processingTime: number;
}

interface ColorPalette {
  dominantColors: Array<{
    color: string;
    percentage: number;
    name: string;
  }>;
  colorHarmony: 'monochromatic' | 'analogous' | 'complementary' | 'triadic' | 'split-complementary' | 'tetradic';
  temperature: 'warm' | 'cool' | 'neutral';
  brightness: number; // 0-100
  saturation: number; // 0-100
  contrast: number; // 0-100
}

export class StyleTransferService implements AIServiceInterface {
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://api.runpod.ai/v2';

  constructor() {
    this.apiKey = process.env.RUNPOD_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async analyzeImage(imageBuffer: Buffer): Promise<AIAnalysisResult> {
    try {
      const colorAnalysis = await this.analyzeColors(imageBuffer);
      const styleAnalysis = await this.analyzeStyle(imageBuffer);

      return {
        keywords: [
          ...styleAnalysis.styleKeywords,
          ...colorAnalysis.colorKeywords,
        ],
        confidence: 0.85,
        processingTime: styleAnalysis.processingTime + colorAnalysis.processingTime,
        colors: colorAnalysis.palette.dominantColors.map(c => c.color),
        style: styleAnalysis.detectedStyle,
        mood: this.determineMood(colorAnalysis.palette, styleAnalysis),
        embeddings: await this.generateStyleEmbeddings(styleAnalysis, colorAnalysis),
        metadata: {
          colorHarmony: colorAnalysis.palette.colorHarmony,
          temperature: colorAnalysis.palette.temperature,
          brightness: colorAnalysis.palette.brightness,
          saturation: colorAnalysis.palette.saturation,
          contrast: colorAnalysis.palette.contrast,
          styleComplexity: styleAnalysis.complexity,
          brushwork: styleAnalysis.brushwork,
          composition: styleAnalysis.composition,
        }
      };
    } catch (error) {
      throw new Error(`Style transfer analysis failed: ${error}`);
    }
  }

  // 색상 분석 (고급 색상 이론 적용)
  async analyzeColors(imageBuffer: Buffer): Promise<{
    palette: ColorPalette;
    colorKeywords: string[];
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      // 이미지에서 색상 추출 (실제 구현에서는 Python 라이브러리 사용)
      const dominantColors = await this.extractDominantColors(imageBuffer);
      const colorHarmony = this.analyzeColorHarmony(dominantColors);
      const temperature = this.analyzeTemperature(dominantColors);
      
      const palette: ColorPalette = {
        dominantColors,
        colorHarmony,
        temperature,
        brightness: this.calculateBrightness(dominantColors),
        saturation: this.calculateSaturation(dominantColors),
        contrast: this.calculateContrast(dominantColors),
      };

      const colorKeywords = this.generateColorKeywords(palette);

      return {
        palette,
        colorKeywords,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Color analysis failed:', error);
      return {
        palette: this.getDefaultColorPalette(),
        colorKeywords: ['color-analysis-failed'],
        processingTime: Date.now() - startTime,
      };
    }
  }

  // 스타일 분석 (예술사적 접근)
  async analyzeStyle(imageBuffer: Buffer): Promise<{
    detectedStyle: string;
    styleKeywords: string[];
    complexity: number;
    brushwork: string;
    composition: string;
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      // 실제 구현에서는 CNN 모델 사용
      const features = await this.extractVisualFeatures(imageBuffer);
      
      const styleClassification = this.classifyArtStyle(features);
      const brushworkAnalysis = this.analyzeBrushwork(features);
      const compositionAnalysis = this.analyzeComposition(features);
      
      return {
        detectedStyle: styleClassification.style,
        styleKeywords: styleClassification.keywords,
        complexity: styleClassification.complexity,
        brushwork: brushworkAnalysis,
        composition: compositionAnalysis,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Style analysis failed:', error);
      return {
        detectedStyle: 'unknown',
        styleKeywords: ['style-analysis-failed'],
        complexity: 50,
        brushwork: 'unknown',
        composition: 'unknown',
        processingTime: Date.now() - startTime,
      };
    }
  }

  // 스타일 전이 수행
  async performStyleTransfer(
    contentImage: Buffer,
    styleImage: Buffer,
    strength: number = 0.7
  ): Promise<StyleTransferResult> {
    if (!this.isConfigured()) {
      throw new Error('Style transfer service not configured');
    }

    const startTime = Date.now();

    try {
      // RunPod API 또는 유사한 GPU 서비스 호출
      const payload = {
        input: {
          content_image: contentImage.toString('base64'),
          style_image: styleImage.toString('base64'),
          style_strength: strength,
          preserve_content: true,
          output_format: 'jpeg'
        }
      };

      const response = await fetch(`${this.baseUrl}/style-transfer/runsync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json() as any;
      
      return {
        transferredImage: result?.output?.image ?? '',
        styleStrength: strength,
        originalStyle: 'detected',
        targetStyle: 'transferred',
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      // 실제 API 사용 불가 시 Mock 응답
      console.warn('Style transfer API unavailable, using mock result');
      return {
        transferredImage: '/mock/style-transferred-image.jpg',
        styleStrength: strength,
        originalStyle: 'realistic',
        targetStyle: 'impressionist',
        processingTime: Date.now() - startTime,
      };
    }
  }

  // 색상 추출 (Mock 구현)
  private async extractDominantColors(imageBuffer: Buffer): Promise<ColorPalette['dominantColors']> {
    // 실제 구현에서는 Python의 scikit-image, PIL 등 사용
    return [
      { color: '#2c5aa0', percentage: 35, name: 'Deep Blue' },
      { color: '#f4e4bc', percentage: 28, name: 'Cream' },
      { color: '#8b4513', percentage: 20, name: 'Saddle Brown' },
      { color: '#228b22', percentage: 12, name: 'Forest Green' },
      { color: '#dc143c', percentage: 5, name: 'Crimson' },
    ];
  }

  private analyzeColorHarmony(colors: ColorPalette['dominantColors']): ColorPalette['colorHarmony'] {
    // 색상환 기반 하모니 분석
    const hues = colors.map(c => this.getHue(c.color));
    const hueDifferences = this.calculateHueDifferences(hues);
    
    if (hueDifferences.every(diff => diff < 30)) return 'monochromatic';
    if (hueDifferences.some(diff => diff > 150 && diff < 210)) return 'complementary';
    if (hueDifferences.some(diff => diff > 90 && diff < 150)) return 'triadic';
    if (hueDifferences.every(diff => diff < 60)) return 'analogous';
    
    return 'split-complementary';
  }

  private analyzeTemperature(colors: ColorPalette['dominantColors']): ColorPalette['temperature'] {
    const warmColors = colors.filter(c => this.isWarmColor(c.color));
    const coolColors = colors.filter(c => this.isCoolColor(c.color));
    
    const warmPercentage = warmColors.reduce((sum, c) => sum + c.percentage, 0);
    const coolPercentage = coolColors.reduce((sum, c) => sum + c.percentage, 0);
    
    if (warmPercentage > coolPercentage + 20) return 'warm';
    if (coolPercentage > warmPercentage + 20) return 'cool';
    return 'neutral';
  }

  private calculateBrightness(colors: ColorPalette['dominantColors']): number {
    const totalBrightness = colors.reduce((sum, c) => {
      const brightness = this.getColorBrightness(c.color);
      return sum + (brightness * c.percentage / 100);
    }, 0);
    return Math.round(totalBrightness);
  }

  private calculateSaturation(colors: ColorPalette['dominantColors']): number {
    const totalSaturation = colors.reduce((sum, c) => {
      const saturation = this.getColorSaturation(c.color);
      return sum + (saturation * c.percentage / 100);
    }, 0);
    return Math.round(totalSaturation);
  }

  private calculateContrast(colors: ColorPalette['dominantColors']): number {
    if (colors.length < 2) return 50;
    
    let maxContrast = 0;
    for (let i = 0; i < colors.length - 1; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const contrast = this.getColorContrast(colors[i]?.color, colors[j]?.color);
        maxContrast = Math.max(maxContrast, contrast);
      }
    }
    return Math.round(maxContrast);
  }

  private generateColorKeywords(palette: ColorPalette): string[] {
    const keywords: string[] = [];
    
    // 주요 색상 기반 키워드
    palette.dominantColors.forEach(color => {
      keywords.push(color.name.toLowerCase().replace(' ', '-'));
    });
    
    // 색상 하모니 키워드
    keywords.push(`${palette.colorHarmony}-harmony`);
    
    // 온도 키워드
    keywords.push(`${palette.temperature}-tones`);
    
    // 밝기/채도 키워드
    if (palette.brightness > 70) keywords.push('bright', 'luminous');
    else if (palette.brightness < 30) keywords.push('dark', 'moody');
    
    if (palette.saturation > 70) keywords.push('vibrant', 'saturated');
    else if (palette.saturation < 30) keywords.push('muted', 'desaturated');
    
    if (palette.contrast > 70) keywords.push('high-contrast', 'dramatic');
    else if (palette.contrast < 30) keywords.push('subtle', 'gentle');
    
    return keywords;
  }

  private classifyArtStyle(features: any): {
    style: string;
    keywords: string[];
    complexity: number;
  } {
    // Mock 스타일 분류 (실제로는 CNN 모델 사용)
    const styles = [
      'impressionist', 'abstract', 'realistic', 'expressionist',
      'cubist', 'surrealist', 'pop-art', 'minimalist'
    ];
    
    const detectedStyle = styles[Math.floor(Math.random() * styles.length)];
    
    const styleKeywords = {
      impressionist: ['brushstrokes', 'light-effects', 'plein-air', 'color-mixing'],
      abstract: ['non-representational', 'geometric', 'expressive', 'conceptual'],
      realistic: ['detailed', 'naturalistic', 'precise', 'representational'],
      expressionist: ['emotional', 'distorted', 'intense', 'subjective'],
      cubist: ['fragmented', 'geometric', 'multiple-perspectives', 'analytical'],
      surrealist: ['dreamlike', 'unconscious', 'bizarre', 'symbolic'],
      'pop-art': ['commercial', 'bold', 'consumer-culture', 'graphic'],
      minimalist: ['simple', 'clean', 'essential', 'reduced'],
    };
    
    return {
      style: detectedStyle ?? 'unknown',
      keywords: styleKeywords[detectedStyle as keyof typeof styleKeywords] || [],
      complexity: Math.floor(Math.random() * 100),
    };
  }

  private analyzeBrushwork(features: any): string {
    const brushworks = [
      'smooth', 'textured', 'impasto', 'blended',
      'stippled', 'hatched', 'glazed', 'scumbled'
    ];
    return brushworks[Math.floor(Math.random() * brushworks.length)] ?? 'smooth';
  }

  private analyzeComposition(features: any): string {
    const compositions = [
      'rule-of-thirds', 'golden-ratio', 'symmetrical', 'asymmetrical',
      'radial', 'diagonal', 'triangular', 'leading-lines'
    ];
    return compositions[Math.floor(Math.random() * compositions.length)] ?? 'rule-of-thirds';
  }

  private determineMood(palette: ColorPalette, styleAnalysis: any): string {
    const { temperature, brightness, saturation } = palette;
    
    if (temperature === 'warm' && brightness > 60 && saturation > 60) {
      return 'energetic';
    } else if (temperature === 'cool' && brightness < 40) {
      return 'melancholic';
    } else if (saturation < 30 && brightness > 50) {
      return 'serene';
    } else if (palette.contrast > 70) {
      return 'dramatic';
    } else {
      return 'balanced';
    }
  }

  private async generateStyleEmbeddings(
    styleAnalysis: any,
    colorAnalysis: any
  ): Promise<number[]> {
    // 스타일과 색상 특성을 벡터로 변환
    const embedding = new Array(512).fill(0);
    
    // 색상 특성을 임베딩에 반영
    const colorFeatures = [
      colorAnalysis.palette.brightness / 100,
      colorAnalysis.palette.saturation / 100,
      colorAnalysis.palette.contrast / 100,
    ];
    
    // 스타일 특성을 임베딩에 반영
    const styleFeatures = [
      styleAnalysis.complexity / 100,
      Math.random(), // brushwork feature
      Math.random(), // composition feature
    ];
    
    // 간단한 특성 조합
    for (let i = 0; i < Math.min(embedding.length, 100); i++) {
      embedding[i] = (colorFeatures[i % colorFeatures.length] + 
                     styleFeatures[i % styleFeatures.length]) / 2;
    }
    
    return embedding;
  }

  // 유틸리티 메서드들
  private async extractVisualFeatures(imageBuffer: Buffer): Promise<any> {
    // Mock 특성 추출
    return {
      edges: Math.random(),
      texture: Math.random(),
      shapes: Math.random(),
      patterns: Math.random(),
    };
  }

  private getHue(color: string): number {
    // RGB에서 HSV로 변환하여 색조 계산
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    if (delta === 0) return 0;
    
    let hue = 0;
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    
    return Math.round(hue * 60);
  }

  private calculateHueDifferences(hues: number[]): number[] {
    const differences: number[] = [];
    for (let i = 0; i < hues.length - 1; i++) {
      for (let j = i + 1; j < hues.length; j++) {
        let diff = Math.abs(hues[i] - hues[j]);
        diff = Math.min(diff, 360 - diff);
        differences.push(diff);
      }
    }
    return differences;
  }

  private isWarmColor(color: string): boolean {
    const hue = this.getHue(color);
    return (hue >= 0 && hue <= 60) || (hue >= 300 && hue <= 360);
  }

  private isCoolColor(color: string): boolean {
    const hue = this.getHue(color);
    return hue >= 180 && hue <= 300;
  }

  private getColorBrightness(color: string): number {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return Math.round((r * 299 + g * 587 + b * 114) / 1000 / 255 * 100);
  }

  private getColorSaturation(color: string): number {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    if (max === 0) return 0;
    return Math.round((max - min) / max * 100);
  }

  private getColorContrast(color1: string, color2: string): number {
    const brightness1 = this.getColorBrightness(color1);
    const brightness2 = this.getColorBrightness(color2);
    return Math.abs(brightness1 - brightness2);
  }

  private getDefaultColorPalette(): ColorPalette {
    return {
      dominantColors: [
        { color: '#808080', percentage: 100, name: 'Gray' }
      ],
      colorHarmony: 'monochromatic',
      temperature: 'neutral',
      brightness: 50,
      saturation: 0,
      contrast: 0,
    };
  }
}