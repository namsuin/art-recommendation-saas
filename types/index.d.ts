// Type definitions for Art Recommendation SaaS

export interface User {
  id: string;
  email: string;
  role: 'user' | 'artist' | 'admin';
  display_name?: string;
  subscription_tier: 'free' | 'standard' | 'premium' | 'admin';
  upload_count: number;
  last_upload_date?: string;
  created_at: string;
  updated_at?: string;
  artist_name?: string;
  artist_bio?: string;
  artist_portfolio_url?: string;
  artist_instagram?: string;
}

export interface Artwork {
  id: string;
  title: string;
  artist: string;
  artist_name?: string;
  artist_bio?: string;
  description?: string;
  image_url: string;
  thumbnail_url?: string;
  category?: string;
  medium?: string;
  style?: string;
  year?: number;
  price?: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  keywords: string[];
  colors: string[];
  tags?: string;
  analysis?: any;
  created_at: string;
  created_by?: string;
  available?: boolean;
  view_count?: number;
  like_count?: number;
  is_for_sale?: boolean;
  price_krw?: number;
}

export interface ArtistApplication {
  id: string;
  user_id: string;
  email: string;
  artist_name: string;
  bio: string;
  statement: string;
  experience: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  specialties: string[];
  portfolio_url?: string;
  instagram_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  reviewed_at?: string;
  review_notes?: string;
  approved_by?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AnalysisResult {
  keywords: string[];
  colors: string[];
  style: string;
  mood: string;
  confidence: number;
  embeddings: number[];
  ai_sources?: any;
  recommendations?: any[];
  processingTime?: number;
}

export interface DashboardStats {
  users: {
    total: number;
    activeToday: number;
    newThisWeek: number;
    growthRate: number;
  };
  analyses: {
    total: number;
    today: number;
    averagePerUser: number;
  };
  revenue: {
    totalRevenue: number;
    monthlyRevenue: number;
    activeSubscriptions: number;
  };
  system: {
    uptime: number;
    avgResponseTime: number;
    errorRate: number;
    services: {
      googleVision: boolean;
      clarifai: boolean;
      metMuseum: boolean;
    };
  };
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
  exp?: number;
}