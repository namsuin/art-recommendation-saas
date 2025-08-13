import { logger } from '../../shared/logger';
import { supabase } from './supabase';

export type UserRole = 'user' | 'artist' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  artist_verified?: boolean;
  artist_bio?: string;
  artist_portfolio_url?: string;
  display_name?: string;
  created_at?: string;
}

export class RoleAuthService {
  /**
   * 사용자 역할 확인
   */
  static async getUserRole(userId: string): Promise<UserRole | null> {
    try {
      if (!supabase) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error || !data) return null;
      return data.role as UserRole;
    } catch (error) {
      logger.error('Error fetching user role:', error);
      return null;
    }
  }

  /**
   * 사용자가 특정 역할인지 확인
   */
  static async hasRole(userId: string, requiredRoles: UserRole[]): Promise<boolean> {
    const userRole = await this.getUserRole(userId);
    if (!userRole) return false;
    return requiredRoles.includes(userRole);
  }

  /**
   * 관리자 권한 확인
   */
  static async isAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, ['admin']);
  }

  /**
   * 예술가 권한 확인 (인증된 예술가 또는 관리자)
   */
  static async isArtist(userId: string): Promise<boolean> {
    return this.hasRole(userId, ['artist', 'admin']);
  }

  /**
   * 인증된 예술가인지 확인
   */
  static async isVerifiedArtist(userId: string): Promise<boolean> {
    try {
      if (!supabase) return false;
      
      const { data, error } = await supabase
        .from('users')
        .select('role, artist_verified')
        .eq('id', userId)
        .single();
      
      if (error || !data) return false;
      
      return data.role === 'artist' && data.artist_verified === true;
    } catch (error) {
      logger.error('Error checking artist verification:', error);
      return false;
    }
  }

  /**
   * 사용자 역할 업데이트 (관리자만 가능)
   */
  static async updateUserRole(
    adminId: string, 
    targetUserId: string, 
    newRole: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 관리자 권한 확인
      const isAdmin = await this.isAdmin(adminId);
      if (!isAdmin) {
        return { success: false, error: '관리자 권한이 필요합니다.' };
      }

      if (!supabase) {
        return { success: false, error: 'Database connection error' };
      }

      const { error } = await supabase
        .from('users')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUserId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error updating user role:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '역할 업데이트 실패'
      };
    }
  }

  /**
   * 예술가 인증 요청 생성
   */
  static async requestArtistVerification(
    userId: string,
    verificationData: {
      real_name: string;
      phone_number?: string;
      portfolio_url?: string;
      instagram_url?: string;
      website_url?: string;
      artist_statement?: string;
      certification_documents?: any;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        return { success: false, error: 'Database connection error' };
      }

      // 기존 요청 확인
      const { data: existingRequest } = await supabase
        .from('artist_verification_requests')
        .select('id, status')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        return { success: false, error: '이미 진행 중인 인증 요청이 있습니다.' };
      }

      // 새 인증 요청 생성
      const { error } = await supabase
        .from('artist_verification_requests')
        .insert({
          user_id: userId,
          ...verificationData,
          email: (await supabase.from('users').select('email').eq('id', userId).single()).data?.email
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // 사용자 역할을 artist로 변경 (미인증 상태)
      await supabase
        .from('users')
        .update({ 
          role: 'artist',
          artist_verified: false
        })
        .eq('id', userId);

      return { success: true };
    } catch (error) {
      logger.error('Error requesting artist verification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '인증 요청 실패'
      };
    }
  }

  /**
   * 예술가 인증 승인 (관리자만)
   */
  static async approveArtistVerification(
    adminId: string,
    requestId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 관리자 권한 확인
      const isAdmin = await this.isAdmin(adminId);
      if (!isAdmin) {
        return { success: false, error: '관리자 권한이 필요합니다.' };
      }

      if (!supabase) {
        return { success: false, error: 'Database connection error' };
      }

      // 인증 요청 정보 가져오기
      const { data: request, error: fetchError } = await supabase
        .from('artist_verification_requests')
        .select('user_id')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        return { success: false, error: '인증 요청을 찾을 수 없습니다.' };
      }

      // 인증 요청 승인
      const { error: updateError } = await supabase
        .from('artist_verification_requests')
        .update({
          status: 'approved',
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // 사용자를 인증된 예술가로 업데이트
      await supabase
        .from('users')
        .update({
          role: 'artist',
          artist_verified: true
        })
        .eq('id', request.user_id);

      return { success: true };
    } catch (error) {
      logger.error('Error approving artist verification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '인증 승인 실패'
      };
    }
  }

  /**
   * 예술가 인증 거부 (관리자만)
   */
  static async rejectArtistVerification(
    adminId: string,
    requestId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 관리자 권한 확인
      const isAdmin = await this.isAdmin(adminId);
      if (!isAdmin) {
        return { success: false, error: '관리자 권한이 필요합니다.' };
      }

      if (!supabase) {
        return { success: false, error: 'Database connection error' };
      }

      // 인증 요청 거부
      const { error } = await supabase
        .from('artist_verification_requests')
        .update({
          status: 'rejected',
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', requestId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error rejecting artist verification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '인증 거부 실패'
      };
    }
  }

  /**
   * 사용자 프로필 가져오기
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      if (!supabase) return null;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      return data as UserProfile;
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * 회원가입 시 역할 설정
   */
  static async setInitialRole(
    userId: string,
    role: UserRole,
    additionalInfo?: {
      display_name?: string;
      artist_bio?: string;
      artist_portfolio_url?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        return { success: false, error: 'Database connection error' };
      }

      const updateData: any = {
        role,
        ...additionalInfo
      };

      // 예술가로 가입하는 경우 인증 필요 표시
      if (role === 'artist') {
        updateData.artist_verified = false;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error setting initial role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '역할 설정 실패'
      };
    }
  }
}