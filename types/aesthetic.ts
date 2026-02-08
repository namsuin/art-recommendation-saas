// types/aesthetic.ts

export interface AestheticAnalysisResult {
  aestheticScore: number;           // 0-100
  styleTags: string[];              // ['artistic', 'modern', 'symmetric']
  moodTags: string[];               // ['bright', 'vibrant', 'calm']
  complexity: 'low' | 'medium' | 'high';
  isArtLike: boolean;
  confidence: number;               // 0-100
  
  colorAnalysis?: {
    diversity: number;              // 0-100
    saturation: number;             // 0-100
    brightness: number;             // 0-100
    dominantPalette: 'warm' | 'cool' | 'vibrant' | 'neutral';
  };
  
  composition?: {
    hasSymmetry: boolean;
    centerFocus: boolean;
    objectDistribution: 'balanced' | 'scattered' | 'clustered';
    visualWeight: 'light' | 'medium' | 'heavy';
  };
  
  context?: {
    category: 'portrait' | 'landscape' | 'abstract' | 'architecture' | 'still-life' | 'general';
    hasHuman: boolean;
    isProfessionalPhoto: boolean;
    isArtwork: boolean;
  };
}

export interface ImageAnalysisResponse {
  success: boolean;
  aesthetic: AestheticAnalysisResult;
  labels?: Array<{ description: string; score: number }>;
  error?: string;
}
