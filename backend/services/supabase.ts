import { createClient } from '@supabase/supabase-js';
import type { Database } from '../db/types';

// Environment variables with fallbacks for development
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key-here';
const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT || '1800'); // 30분 기본값

// Check if we have valid configuration
const hasValidConfig = supabaseUrl !== 'http://localhost:54321' || 
                      supabaseKey !== 'your-anon-key-here';

// Regular client for public operations
export const supabase = hasValidConfig ? 
  createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // 개발 환경에서 이메일 확인 없이 로그인 허용
      confirmEmailBeforeSignin: false,
      // 환경변수에서 가져온 세션 타임아웃 설정 (30분)
      expiresIn: sessionTimeout,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
      headers: {
        'Cache-Control': 'no-cache',
      },
    },
  }) : null as any;

// Admin client for server-side operations
export const supabaseAdmin = hasValidConfig ?
  createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) : null as any;

// Test connection function
export async function testSupabaseConnection(): Promise<boolean> {
  if (!hasValidConfig || !supabase) {
    logger.warn('⚠️ Supabase not configured');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('artworks')
      .select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found" which is expected initially
      logger.error('Supabase connection failed:', error);
      return false;
    }
    
    logger.info('✅ Supabase connection successful');
    return true;
  } catch (error) {
    logger.error('❌ Supabase connection failed:', error);
    return false;
  }
}

// Auth helper functions
export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },
};

// Storage helper functions
export const storage = {
  uploadImage: async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from('artwork-images')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
    return { data, error };
  },

  getImageUrl: (path: string) => {
    const { data } = supabase.storage
      .from('artwork-images')
      .getPublicUrl(path);
    return data.publicUrl;
  },

  deleteImage: async (path: string) => {
    const { data, error } = await supabase.storage
      .from('artwork-images')
      .remove([path]);
    return { data, error };
  },
};

// SupabaseService 클래스 추가
export class SupabaseService {
  private client: any;

  constructor() {
    this.client = supabase;
  }

  getClient() {
    return this.client;
  }

  isConfigured(): boolean {
    return hasValidConfig && !!this.client;
  }
}