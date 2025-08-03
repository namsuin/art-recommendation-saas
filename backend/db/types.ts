export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
          subscription_tier: 'free' | 'premium'
          upload_count_today: number
          last_upload_reset: string
        }
        Insert: {
          id?: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          subscription_tier?: 'free' | 'premium'
          upload_count_today?: number
          last_upload_reset?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          subscription_tier?: 'free' | 'premium'
          upload_count_today?: number
          last_upload_reset?: string
        }
      }
      artworks: {
        Row: {
          id: string
          title: string
          artist: string
          image_url: string
          thumbnail_url: string | null
          description: string | null
          keywords: string[]
          embeddings: number[] | null
          created_at: string
          updated_at: string
          price: number | null
          available: boolean
          admin_user_id: string | null
        }
        Insert: {
          id?: string
          title: string
          artist: string
          image_url: string
          thumbnail_url?: string | null
          description?: string | null
          keywords: string[]
          embeddings?: number[] | null
          created_at?: string
          updated_at?: string
          price?: number | null
          available?: boolean
          admin_user_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          artist?: string
          image_url?: string
          thumbnail_url?: string | null
          description?: string | null
          keywords?: string[]
          embeddings?: number[] | null
          created_at?: string
          updated_at?: string
          price?: number | null
          available?: boolean
          admin_user_id?: string | null
        }
      }
      taste_groups: {
        Row: {
          id: string
          user_id: string
          name: string
          keywords: string[]
          embeddings: number[] | null
          created_at: string
          updated_at: string
          is_default: boolean
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          keywords: string[]
          embeddings?: number[] | null
          created_at?: string
          updated_at?: string
          is_default?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          keywords?: string[]
          embeddings?: number[] | null
          created_at?: string
          updated_at?: string
          is_default?: boolean
        }
      }
      user_uploads: {
        Row: {
          id: string
          user_id: string
          image_url: string
          analysis_keywords: string[]
          analysis_embeddings: number[] | null
          created_at: string
          taste_group_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          analysis_keywords: string[]
          analysis_embeddings?: number[] | null
          created_at?: string
          taste_group_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          image_url?: string
          analysis_keywords?: string[]
          analysis_embeddings?: number[] | null
          created_at?: string
          taste_group_id?: string | null
        }
      }
      recommendations: {
        Row: {
          id: string
          user_id: string
          upload_id: string
          artwork_id: string
          similarity_score: number
          reasoning: string[]
          created_at: string
          clicked: boolean
          clicked_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          upload_id: string
          artwork_id: string
          similarity_score: number
          reasoning: string[]
          created_at?: string
          clicked?: boolean
          clicked_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          upload_id?: string
          artwork_id?: string
          similarity_score?: number
          reasoning?: string[]
          created_at?: string
          clicked?: boolean
          clicked_at?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string | null
          status: 'active' | 'cancelled' | 'past_due' | 'incomplete'
          tier: 'free' | 'premium'
          current_period_start: string
          current_period_end: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id?: string | null
          status: 'active' | 'cancelled' | 'past_due' | 'incomplete'
          tier: 'free' | 'premium'
          current_period_start: string
          current_period_end: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string | null
          status?: 'active' | 'cancelled' | 'past_due' | 'incomplete'
          tier?: 'free' | 'premium'
          current_period_start?: string
          current_period_end?: string
          created_at?: string
          updated_at?: string
        }
      }
      usage_analytics: {
        Row: {
          id: string
          user_id: string
          date: string
          images_analyzed: number
          api_calls: number
          storage_used: number
          recommendations_generated: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          images_analyzed?: number
          api_calls?: number
          storage_used?: number
          recommendations_generated?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          images_analyzed?: number
          api_calls?: number
          storage_used?: number
          recommendations_generated?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      vector_similarity_search: {
        Args: {
          query_embedding: number[]
          similarity_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          similarity: number
        }[]
      }
    }
    Enums: {
      subscription_status: 'active' | 'cancelled' | 'past_due' | 'incomplete'
      subscription_tier: 'free' | 'premium'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}