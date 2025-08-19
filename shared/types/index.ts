// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  status?: 'success' | 'error';
  data?: T;
  error?: string | {
    code: string;
    message: string;
    details?: any[];
  };
  message?: string;
  timestamp?: string;
  meta?: {
    requestId?: string;
    timestamp?: number;
    version?: string;
    pagination?: PaginationMeta;
  };
  metadata?: {
    timestamp?: string;
    requestId?: string;
    statusCode?: number;
    [key: string]: any;
  };
  warnings?: string[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

// Artwork Types
export interface Artwork {
  id: string;
  title: string;
  artist: string;
  image_url: string;
  thumbnail_url?: string;
  description?: string;
  keywords: string[];
  embeddings?: number[];
  created_at: string;
  updated_at: string;
  price?: number;
  available: boolean;
}

// User Types
export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  subscription_tier: 'free' | 'premium';
  taste_groups: TasteGroup[];
}

export interface TasteGroup {
  id: string;
  user_id: string;
  name: string;
  keywords: string[];
  embeddings?: number[];
  created_at: string;
  is_default: boolean;
}

// Image Analysis Types
export interface ImageAnalysis {
  keywords: string[];
  colors: string[];
  style: string;
  mood?: string;
  technique?: string;
  confidence: number;
  embeddings: number[];
  ai_sources: {
    google_vision?: GoogleVisionResult;
    clarifai?: ClarifaiResult;
    replicate_clip?: ReplicateResult;
    local_clip?: LocalClipResult;
  };
}

export interface GoogleVisionResult {
  labels: Array<{
    description: string;
    score: number;
  }>;
  colors: Array<{
    color: { red: number; green: number; blue: number };
    score: number;
  }>;
  objects: Array<{
    name: string;
    score: number;
  }>;
}

export interface ClarifaiResult {
  concepts: Array<{
    name: string;
    value: number;
  }>;
  colors: Array<{
    hex: string;
    value: number;
  }>;
}

export interface ReplicateResult {
  embeddings: number[];
  text_description: string;
  style_tags: string[];
  confidence: number;
}

export interface LocalClipResult {
  embeddings: number[];
  artistic_style: string;
  period: string;
  technique: string;
  confidence: number;
}

// Recommendation Types
export interface Recommendation {
  artwork: Artwork;
  similarity: number;
  reasons: string[];
  confidence: number;
}

export interface RecommendationRequest {
  image?: File;
  taste_group_id?: string;
  limit?: number;
  min_similarity?: number;
}

export interface RecommendationResponse {
  recommendations: Recommendation[];
  analysis: ImageAnalysis;
  total_processing_time: number;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'connection' | 'analysis_update' | 'recommendation_ready' | 'error' | 'echo';
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

// AI Service Types  
export interface AIServiceInterface {
  analyzeImage(imageBuffer: Buffer): Promise<AIAnalysisResult | null>;
  isServiceEnabled(): boolean;
}

export interface AIAnalysisResult {
  keywords: string[];
  style: string;
  confidence: number;
  embeddings?: number[];
}

export interface AIServiceConfig {
  google_vision?: boolean | {
    enabled: boolean;
    weight: number;
    features: string[];
  };
  clarifai?: boolean | {
    enabled: boolean;
    weight: number;
    model_id: string;
  };
  replicate_clip?: boolean | {
    enabled: boolean;
    weight: number;
    model_version: string;
  };
  local_clip?: boolean | {
    enabled: boolean;
    weight: number;
    model_path: string;
  };
  style_transfer?: boolean;
}

// Database Types
export interface DatabaseArtwork {
  id: string;
  title: string;
  artist: string;
  image_url: string;
  thumbnail_url: string | null;
  description: string | null;
  keywords: string[];
  embeddings: string; // JSON string of number array
  created_at: string;
  updated_at: string;
  price: number | null;
  available: boolean;
}

export interface DatabaseUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  subscription_tier: string;
}

export interface DatabaseTasteGroup {
  id: string;
  user_id: string;
  name: string;
  keywords: string[];
  embeddings: string | null; // JSON string of number array
  created_at: string;
  is_default: boolean;
}


// Error Types
export interface AIServiceError {
  service: 'google_vision' | 'clarifai' | 'replicate' | 'local_clip';
  error: string;
  timestamp: number;
  retry_count: number;
}

// Subscription Types
export interface Subscription {
  id: string;
  user_id: string;
  tier: 'free' | 'premium';
  status: 'active' | 'cancelled' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  stripe_subscription_id?: string;
}

// Analytics Types
export interface UsageAnalytics {
  user_id: string;
  date: string;
  images_analyzed: number;
  api_calls: number;
  storage_used: number;
  recommendations_generated: number;
}

// Artist Application Types  
export interface ArtistApplication {
  id: string;
  user_id: string;
  user_email: string;
  artist_name: string;
  portfolio_url?: string;
  artist_statement: string;
  art_type: string[];
  experience_years: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
  reviewed_by?: string;
  review_notes?: string;
}

// Common Types
export interface SearchQuery {
  query?: string;
  keywords?: string[];
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
}

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
}

// Session Types
export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

// Artwork Platform Types
export interface PlatformArtwork extends Artwork {
  platform?: string;
  source?: string;
  search_source?: string;
  source_url?: string;
  project_type?: string;
  university?: string;
  category?: string;
  student_work?: boolean;
}

// Formatted Artwork for Display
export interface FormattedArtwork {
  id: string;
  title: string;
  artist: string;
  image_url: string;
  thumbnail_url: string;
  source: string;
  source_url: string;
  description: string;
  additional_info?: string;
  keywords: string[];
  similarity?: number;
  metadata?: Record<string, any>;
}