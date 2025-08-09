/**
 * 공통 타입 정의
 */

// API 응답 공통 인터페이스
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

// 페이지네이션 인터페이스
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 이미지 분석 관련 타입
export interface ImageAnalysisResult {
  keywords: string[];
  colors: string[];
  style: string | string[];
  mood: string | string[];
  confidence: number;
  embeddings?: number[];
  ai_sources?: {
    [key: string]: any;
  };
}

// 작품 정보 인터페이스
export interface Artwork {
  id: string;
  title: string;
  artist: string;
  image_url: string;
  thumbnail_url?: string;
  keywords: string[];
  description?: string;
  price?: number;
  currency?: string;
  available: boolean;
  source: string;
  source_url?: string;
  platform?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

// 추천 작품 인터페이스
export interface RecommendationItem {
  artwork: Artwork;
  similarity: number;
  similarity_score?: {
    total: number;
    keywordMatch: number;
    matchedKeywords: string[];
    confidence: number;
  };
  reasons: string[];
  matchingKeywords?: string[];
}

// 유사도 분석 결과
export interface SimilarityAnalysis {
  total: number;
  keywordMatch: number;
  matchedKeywords: string[];
  confidence: number;
}

// 공통 키워드 분석 결과
export interface CommonKeywords {
  keywords: string[];
  confidence: number;
  frequency: Record<string, number>;
  totalSimilarityScore?: number;
}

// 결제 티어 정보
export interface PaymentTier {
  name: string;
  maxImages: number;
  price: number; // USD cents
  description: string;
}

// 사용자 정보
export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  upload_count?: number;
  last_upload_date?: string;
  subscription_tier?: string;
}

// 다중 이미지 분석 옵션
export interface MultiImageAnalysisOptions {
  userId: string | null;
  analysisType: 'batch' | 'progressive';
  findCommonKeywords: boolean;
}

// 다중 이미지 분석 결과
export interface MultiImageAnalysisResult {
  success: boolean;
  imageCount: number;
  tier: string;
  results: ImageAnalysisResult[];
  commonKeywords: CommonKeywords;
  recommendations: {
    internal: RecommendationItem[];
    external: RecommendationItem[];
  };
  processingTime: number;
  similarityAnalysis: {
    averageSimilarity: number;
    topMatches: Array<{
      title: string;
      similarity: number;
      matchedKeywords: string[];
    }>;
  };
}

// 검색 옵션
export interface SearchOptions {
  sources?: string[];
  limit?: number;
  includeKorean?: boolean;
  includeStudentArt?: boolean;
  includeInternational?: boolean;
  sortBySimilarity?: boolean;
}

// 에러 타입
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

// 설정 타입
export interface ServiceConfig {
  timeout?: number;
  retries?: number;
  cacheTimeout?: number;
  batchSize?: number;
}

// 유효성 검증 결과
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}