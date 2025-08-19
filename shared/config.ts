/**
 * Centralized Configuration Management
 * 중앙화된 설정 관리
 */

export const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    hostname: process.env.HOSTNAME || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  },

  // API Keys and External Services
  services: {
    supabase: {
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
    },
    googleVision: {
      apiKey: process.env.GOOGLE_VISION_API_KEY || '',
      projectId: process.env.GOOGLE_CLOUD_PROJECT || '',
    },
    clarifai: {
      apiKey: process.env.CLARIFAI_API_KEY || '',
    },
    replicate: {
      apiToken: process.env.REPLICATE_API_TOKEN || '',
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    smithsonian: {
      apiKey: process.env.SMITHSONIAN_API_KEY || 'DEMO_KEY',
    },
    harvardMuseums: {
      apiKey: process.env.HARVARD_API_KEY || '',
    },
    rijksmuseum: {
      apiKey: process.env.RIJKSMUSEUM_API_KEY || '',
    },
    metMuseum: {
      // No API key required for Met Museum
      baseUrl: 'https://collectionapi.metmuseum.org/public/collection/v1',
    },
    artsy: {
      clientId: process.env.ARTSY_CLIENT_ID || '',
      clientSecret: process.env.ARTSY_CLIENT_SECRET || '',
    },
  },

  // Feature Flags
  features: {
    enableMockData: process.env.ENABLE_MOCK_DATA === 'true',
    enableAIAnalysis: process.env.DISABLE_AI === 'true' ? false : true,
    enablePayments: !!process.env.STRIPE_SECRET_KEY,
    enableSocialIntegration: process.env.ENABLE_SOCIAL === 'true',
  },

  // Performance Settings
  performance: {
    maxConcurrentRequests: 5,
    cacheTimeout: 24 * 60 * 60 * 1000, // 24 hours in ms
    imageOptimization: true,
    csvMaxRows: 1000, // Max rows to process from CSV files
  },

  // Security Settings
  security: {
    adminAuthCode: process.env.ADMIN_AUTH_CODE || 'admin123',
    jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
  },

  // URLs
  urls: {
    production: 'https://art-recommendation-saas.onrender.com',
    local: 'http://localhost:3000',
  },
} as const;

// Type for config
export type Config = typeof config;

// Validation function
export function validateConfig(): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check critical services
  if (!config.services.supabase.url || !config.services.supabase.anonKey) {
    warnings.push('Supabase not configured - using mock data');
  }

  if (!config.services.googleVision.apiKey) {
    warnings.push('Google Vision API not configured');
  }

  if (!config.services.replicate.apiToken) {
    warnings.push('Replicate API not configured');
  }

  if (config.security.jwtSecret === 'default-jwt-secret' && config.server.isProduction) {
    warnings.push('Using default JWT secret in production!');
  }

  return {
    valid: warnings.length === 0 || !config.server.isProduction,
    warnings,
  };
}

// Export helper functions
export const isProduction = () => config.server.isProduction;
export const isDevelopment = () => config.server.isDevelopment;
export const getServerUrl = () => 
  config.server.isProduction ? config.urls.production : config.urls.local;