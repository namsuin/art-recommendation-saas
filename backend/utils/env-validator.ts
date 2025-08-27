// Environment variable validation utility
import { logger } from '../../shared/logger';

interface EnvConfig {
  // Required
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  
  // Optional AI Services
  GOOGLE_CLOUD_PROJECT_ID?: string;
  GOOGLE_CLOUD_KEY_FILE?: string;
  CLARIFAI_API_KEY?: string;
  PORT?: string;
  NODE_ENV?: string;
}

export function validateEnvironment(): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check Supabase configuration (allow empty for Mock mode)
  const hasSupabaseUrl = process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim() !== '';
  const hasSupabaseKey = process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY.trim() !== '';
  
  if (!hasSupabaseUrl && !hasSupabaseKey) {
    warnings.push('Supabase not configured - using Mock database for development');
  } else if (!hasSupabaseUrl) {
    errors.push('SUPABASE_URL is required when using Supabase');
  } else if (!hasSupabaseKey) {
    errors.push('SUPABASE_ANON_KEY is required when using Supabase');
  }
  
  // Check AI service variables (warnings only)
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID && !process.env.GOOGLE_CLOUD_KEY_FILE) {
    warnings.push('Google Vision AI not configured (GOOGLE_CLOUD_PROJECT_ID or GOOGLE_CLOUD_KEY_FILE missing)');
  }
  
  
  if (!process.env.CLARIFAI_API_KEY) {
    warnings.push('Clarifai API not configured (CLARIFAI_API_KEY missing)');
  }
  
  // Check if at least one AI service is configured
  const hasAnyAI = !!(
    process.env.GOOGLE_CLOUD_PROJECT_ID || 
    process.env.GOOGLE_CLOUD_KEY_FILE ||
    process.env.CLARIFAI_API_KEY
  );
  
  if (!hasAnyAI) {
    warnings.push('No AI services configured - the system will use fallback recommendations only');
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

export function printEnvironmentStatus(): void {
  const { isValid, warnings, errors } = validateEnvironment();
  
  logger.info('\n🔧 Environment Configuration:');
  
  if (errors.length > 0) {
    logger.info('\n❌ ERRORS:');
    errors.forEach(error => logger.info(`  - ${error}`));
  }
  
  if (warnings.length > 0) {
    logger.info('\n⚠️  WARNINGS:');
    warnings.forEach(warning => logger.info(`  - ${warning}`));
  }
  
  if (isValid) {
    logger.info('\n✅ Basic configuration is valid');
  } else {
    logger.info('\n❌ Configuration has errors - server may not work properly');
  }
  
  logger.info('\n📋 Configured Services:');
  logger.info(`  - Supabase: ${process.env.SUPABASE_URL ? '✅' : '❌'}`);
  logger.info(`  - Google Vision: ${(process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_KEY_FILE) ? '✅' : '⚠️'}`);
  logger.info(`  - Clarifai: ${process.env.CLARIFAI_API_KEY ? '✅' : '⚠️'}`);
  logger.info('');
}