/**
 * Shared TypeScript type definitions for Art Recommendation SaaS
 * Replaces 'any' types with proper type definitions
 */

// Base types
export type UserRole = 'user' | 'artist' | 'admin';
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ArtworkStatus = 'pending' | 'approved' | 'rejected';

// User related types
export interface User {
  id: string;
  email: string;
  display_name?: string;
  role: UserRole;
  created_at: string;
  updated_at?: string;
  subscription_tier?: 'free' | 'premium' | 'professional';
}

export interface UserProfile extends User {
  artist_name?: string;
  artist_bio?: string;
  artist_portfolio_url?: string;
  artist_instagram?: string;
  avatar_url?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  notifications?: boolean;
  language?: 'ko' | 'en';
  defaultAnalysisType?: 'basic' | 'advanced';
}

// Artist related types
export interface ArtistInfo {
  artist_name: string;
  bio?: string;
  statement?: string;
  portfolio_url?: string;
  instagram_url?: string;
  experience?: string;
  specialties?: string[];
  certification_documents?: FileUpload[];
}

export interface FileUpload {
  name: string;
  type: string;
  size: number;
  data: string; // base64 or URL
}

// Authentication types
export interface AuthResponse {
  success: boolean;
  error?: string;
  data?: User;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName?: string;
  role?: UserRole;
  artistInfo?: ArtistInfo;
}

// Artwork types
export interface Artwork {
  id: string;
  title: string;
  artist: string;
  artist_bio?: string;
  description?: string;
  year?: number;
  medium?: string;
  style?: string;
  image_url: string;
  price?: number;
  available?: boolean;
  tags?: string[];
  created_at: string;
  updated_at?: string;
  status?: ArtworkStatus;
}

export interface ArtworkRecommendation extends Artwork {
  relevance_score?: number;
  match_keywords?: string[];
  source?: string;
  similarity_score?: number;
}

// AI Analysis types
export interface AnalysisResult {
  id?: string;
  keywords: string[];
  style?: string;
  period?: string;
  description?: string;
  confidence?: number;
  analysis_type: 'single' | 'multi';
  created_at?: string;
  status?: AnalysisStatus;
  error_message?: string;
}

export interface MultiImageAnalysisResult extends AnalysisResult {
  analyses: SingleImageAnalysis[];
  commonKeywords: string[];
  recommendations: ArtworkRecommendation[];
}

export interface SingleImageAnalysis {
  filename: string;
  analysis: AnalysisResult;
}

export interface AIServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// Dashboard types
export interface DashboardStats {
  users: {
    total: number;
    activeToday: number;
    growthRate: number;
  };
  analyses: {
    today: number;
    total: number;
    averagePerUser: number;
  };
  revenue: {
    totalRevenue: number;
    monthlyRecurring: number;
    conversionRate: number;
  };
  system: {
    uptime: number;
    status: 'healthy' | 'warning' | 'error';
    avgResponseTime: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    activeConnections: number;
    apiCalls: {
      today: number;
      thisHour: number;
    };
  };
}

export interface UserListItem extends User {
  last_login?: string;
  total_analyses?: number;
  subscription_status?: 'active' | 'inactive' | 'canceled';
}

// Component Props types
export interface ComponentWithUser {
  user: UserProfile;
}

export interface ComponentWithAuth {
  user?: UserProfile;
  onAuthRequired?: () => void;
}

// Form data types
export interface EditFormData {
  display_name: string;
  email?: string;
  role: UserRole;
  artist_name?: string;
  artist_bio?: string;
  subscription_tier?: string;
  total_analyses?: number;
  lifetimeValue?: number;
  specialties?: string[];
  portfolioUrl?: string;
  website?: string;
  socialMedia?: {
    instagram?: string;
    twitter?: string;
    [key: string]: string | undefined;
  };
  experience?: string;
  [key: string]: string | number | string[] | object | undefined;
}

// Chat/AI Curator types
export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  metadata?: {
    artworks?: ArtworkRecommendation[];
    recommendations?: ArtworkRecommendation[];
    analysis?: AnalysisResult;
  };
}

// Business metrics types
export interface PaymentRecord {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  subscription_tier?: string;
}

export interface ActivityRecord {
  id: string;
  user_id: string;
  action: string;
  details?: Record<string, unknown>;
  created_at: string;
}

// Search and filtering types
export interface SearchFilters {
  medium?: string;
  style?: string;
  period?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  sortBy?: 'relevance' | 'price' | 'date' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  artworks: ArtworkRecommendation[];
  total: number;
  page: number;
  hasMore: boolean;
  filters?: SearchFilters;
}

// Performance and monitoring types
export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  errorRate: number;
  requestsPerSecond: number;
}

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  userId?: string;
  endpoint?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Cache types
export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  ttl: number;
  created_at: number;
}

// Event types for analytics
export interface AnalyticsEvent {
  eventType: string;
  properties: Record<string, string | number | boolean>;
  userId?: string;
  sessionId?: string;
  timestamp: string;
}