/**
 * 작품 관련 유틸리티 함수들
 */

export interface Artwork {
  id?: string;
  title?: string;
  artist?: string;
  image_url?: string;
  thumbnail_url?: string;
  primaryImage?: string;
  primaryImageSmall?: string;
  source_url?: string;
  objectURL?: string;
  eventSite?: string;
  platform?: string;
  student_work?: boolean;
  category?: string;
}

export interface AnalysisResults {
  success: boolean;
  total_images: number;
  analyzed_images: number;
  total_processing_time: number;
  processingTime: number;
  user_type: string;
  individual_analyses: Array<{
    image_name: string;
    image_size: string;
    processing_time: number;
    keywords: string[];
    colors: string[];
    style: string;
    mood: string;
  }>;
  combined_analysis: {
    common_keywords: string[];
    common_colors: string[];
    dominant_style: string;
    dominant_mood: string;
    average_confidence: number;
    pattern_description: string;
  };
  commonKeywords: {
    keywords: string[];
    trulyCommon: string[];
    frequent: string[];
    confidence: number;
    totalSimilarityScore: number;
    totalImages: number;
  };
  commonColors: {
    colors: string[];
    trulyCommon: string[];
    frequent: string[];
    confidence: number;
    totalColorScore: number;
    totalImages: number;
  };
  similarityAnalysis?: {
    topMatches: Array<{
      title: string;
      similarity: string;
      matchedKeywords?: string[];
    }>;
    averageSimilarity: number;
  };
  recommendations: Artwork[] | {
    internal?: Artwork[];
    external?: Artwork[];
  };
}

/**
 * 색상 매핑
 */
export const COLOR_MAP: { [key: string]: string } = {
  'red': '#ef4444',
  'orange': '#f97316', 
  'yellow': '#eab308',
  'green': '#22c55e',
  'blue': '#3b82f6',
  'purple': '#a855f7',
  'pink': '#ec4899',
  'black': '#1f2937',
  'white': '#f9fafb',
  'gray': '#6b7280',
  'grey': '#6b7280',
  'brown': '#a3a3a3',
  'sunset': '#ff6b6b',
  'dawn': '#ffd93d'
};

/**
 * 작품의 이미지 URL 추출
 */
export function getArtworkImageUrl(artwork: Artwork): string | null {
  return artwork.image_url || artwork.thumbnail_url || artwork.primaryImage || null;
}

/**
 * 작품의 소스 URL 추출
 */
export function getArtworkSourceUrl(artwork: Artwork): string {
  return artwork.source_url || artwork.objectURL || artwork.eventSite || '#';
}

/**
 * 색상의 CSS 색상값 반환
 */
export function getColorStyle(color: string): { backgroundColor: string; textColor: string; borderColor: string } {
  const backgroundColor = COLOR_MAP[color.toLowerCase()] || '#94a3b8';
  const textColor = ['black', 'purple', 'blue', 'red', 'brown'].includes(color.toLowerCase()) ? 'white' : 'black';
  const borderColor = backgroundColor === '#f9fafb' ? '#d1d5db' : backgroundColor;
  
  return { backgroundColor, textColor, borderColor };
}

/**
 * 작품이 유효한 이미지를 가지고 있는지 확인
 */
export function hasValidImage(artwork: Artwork): boolean {
  const imageUrl = getArtworkImageUrl(artwork);
  return imageUrl !== null && imageUrl.trim() !== '';
}

/**
 * 학생 작품인지 확인
 */
export function isStudentWork(artwork: Artwork): boolean {
  return artwork.student_work === true ||
         artwork.platform === 'academy_art_university' ||
         artwork.platform === 'sva_bfa' ||
         artwork.platform === 'artsonia' ||
         artwork.category === 'professional_student_work';
}

/**
 * 텀블벅, 그라폴리오, 대학 졸업작품 필터링
 */
export function isProfessionalArtwork(artwork: Artwork): boolean {
  const isTumblbug = artwork.platform === 'tumblbug' || 
                     artwork.source_url?.includes('tumblbug.com');
  const isGrafolio = artwork.platform === 'grafolio' || 
                     artwork.source_url?.includes('grafolio.com');
  const isKoreanUniversity = artwork.platform === 'korean_university' ||
                            artwork.category === 'graduation_work' ||
                            artwork.source_url?.includes('university.ac.kr');
  const isStudentWorkPlatform = isStudentWork(artwork);
  
  return !isTumblbug && !isGrafolio && !isKoreanUniversity && !isStudentWorkPlatform;
}