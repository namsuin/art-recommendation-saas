// Supabase 관리자 클라이언트 (RLS 우회용)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // RLS 우회 가능

if (!supabaseUrl || !supabaseServiceKey) {
  logger.warn('⚠️ Supabase admin client not configured - service key missing');
}

// 관리자 권한 클라이언트 (RLS 우회 가능)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

logger.info('🔑 Supabase admin client:', supabaseAdmin ? 'initialized' : 'not available');