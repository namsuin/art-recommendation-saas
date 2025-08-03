import { supabase, supabaseAdmin, auth } from '../services/supabase';
import { mockDB } from '../services/mock-database';
import { EmailService } from '../services/email';

export class AuthAPI {
  // 회원가입
  static async signUp(email: string, password: string, displayName?: string) {
    try {
      // Use mock database if Supabase is not configured
      if (!supabase) {
        return await mockDB.signUp(email, password, displayName);
      }

      // 먼저 기존 사용자가 있는지 확인
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!listError) {
        const existingUser = existingUsers.users.find(u => u.email === email);
        if (existingUser) {
          // 기존 사용자가 있으면 삭제하고 새로 생성
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
          
          if (!deleteError) {
            // 사용자 테이블에서도 삭제
            await supabase?.from('users').delete().eq('id', existingUser.id);
          }
          // 삭제 후 새로 생성하도록 아래 로직으로 진행
        }
      }

      // 새 사용자 생성 (관리자 권한으로 이메일 확인됨)
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // 이메일 확인을 강제로 true로 설정
        user_metadata: {
          display_name: displayName || email.split('@')[0]
        }
      });
      
      if (error) {
        return { success: false, error: error.message };
      }

      // 사용자 프로필 생성
      if (data.user && supabase) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            display_name: displayName || email.split('@')[0],
            subscription_tier: 'free'
          });

        if (profileError) {
          console.error('Profile creation failed:', profileError);
        }

        // 기본 취향 그룹 생성
        const { error: groupError } = await supabase
          .from('taste_groups')
          .insert({
            user_id: data.user.id,
            name: '기본 취향',
            keywords: ['art', 'painting', 'aesthetic'],
            is_default: true
          });

        if (groupError) {
          console.error('Default taste group creation failed:', groupError);
        }
      }

      // 환영 이메일 전송
      if (data.user?.email) {
        await EmailService.sendWelcomeEmail(
          data.user.email, 
          displayName || data.user.email.split('@')[0]
        );
      }

      return { 
        success: true, 
        user: data.user,
        message: '회원가입이 완료되었습니다. 이메일 인증을 확인해주세요.'
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '회원가입 실패' 
      };
    }
  }

  // 로그인
  static async signIn(email: string, password: string) {
    try {
      // Use mock database if Supabase is not configured
      if (!supabase) {
        return await mockDB.signIn(email, password);
      }

      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        return { success: false, error: error.message };
      }

      // 사용자 프로필 조회
      let userProfile = null;
      if (data.user && supabase) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        userProfile = profile;
      }

      return { 
        success: true, 
        user: data.user,
        profile: userProfile,
        session: data.session
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '로그인 실패' 
      };
    }
  }

  // 로그아웃
  static async signOut() {
    try {
      // Use mock database if Supabase is not configured
      if (!supabase) {
        return await mockDB.signOut();
      }

      const { error } = await auth.signOut();
      
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, message: '로그아웃되었습니다.' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '로그아웃 실패' 
      };
    }
  }

  // 현재 사용자 정보 조회
  static async getCurrentUser() {
    try {
      // Use mock database if Supabase is not configured
      if (!supabase) {
        return await mockDB.getCurrentUser();
      }

      const { user, error } = await auth.getCurrentUser();
      
      if (error) {
        return { success: false, error: error.message };
      }

      if (!user) {
        return { success: false, error: '로그인이 필요합니다.' };
      }

      // Admin을 통해 최신 사용자 정보 조회 (프로필 업데이트 반영을 위해)
      let updatedUser = user;
      if (supabaseAdmin) {
        try {
          const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.getUserById(user.id);
          if (!adminError && adminUser.user) {
            updatedUser = adminUser.user;
          }
        } catch (adminError) {
          console.warn('Admin user fetch failed, using regular user data:', adminError);
        }
      }

      // 사용자 프로필 조회
      let userProfile = null;
      if (supabase) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        userProfile = profile;
      }

      return { 
        success: true, 
        user: updatedUser,
        profile: userProfile
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '사용자 정보 조회 실패' 
      };
    }
  }

  // 프로필 업데이트
  static async updateProfile(userId: string, updates: {
    display_name?: string;
    avatar_url?: string;
  }) {
    if (!supabase) {
      return await mockDB.updateProfile(userId, updates);
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, profile: data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '프로필 업데이트 실패' 
      };
    }
  }

  // 사용자 업로드 제한 체크
  static async checkUploadLimit(userId: string): Promise<{
    canUpload: boolean;
    remainingUploads: number;
    resetTime?: string;
  }> {
    if (!supabase) {
      return await mockDB.checkUploadLimit(userId);
    }

    try {
      const { data: user } = await supabase
        .from('users')
        .select('subscription_tier, upload_count_today, upload_count_reset_at')
        .eq('id', userId)
        .single();

      if (!user) {
        return { canUpload: false, remainingUploads: 0 };
      }

      const now = new Date();
      const resetTime = new Date(user.upload_count_reset_at);

      // 일일 제한 리셋 (리셋 시간이 지났으면)
      if (now > resetTime) {
        await supabase
          .from('users')
          .update({
            upload_count_today: 0, // 사용 카운트를 0으로 리셋
            upload_count_reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', userId);
        
        user.upload_count_today = 0;
      }

      const limits = {
        free: 9999,   // 개발 환경에서는 무제한
        premium: 9999
      };

      const dailyLimit = limits[user.subscription_tier as keyof typeof limits] || 50;
      const remainingUploads = Math.max(0, dailyLimit - user.upload_count_today);
      const canUpload = remainingUploads > 0;

      console.log('🔍 Upload limit calculation for user:', userId);
      console.log('  - subscription_tier:', user.subscription_tier);
      console.log('  - dailyLimit:', dailyLimit);
      console.log('  - upload_count_today:', user.upload_count_today);
      console.log('  - remainingUploads:', remainingUploads);
      console.log('  - canUpload:', canUpload);
      console.log('  - resetTime:', resetTime.toISOString());
      console.log('  - now:', now.toISOString());
      console.log('  - should reset:', now > resetTime);

      return {
        canUpload,
        remainingUploads,
        resetTime: canUpload ? undefined : new Date(resetTime.getTime() + 24 * 60 * 60 * 1000).toISOString()
      };
    } catch (error) {
      console.error('Upload limit check failed:', error);
      return { canUpload: true, remainingUploads: 50 }; // 에러 시 50개 허용
    }
  }

  // 업로드 카운트 증가 (사용할 때마다 사용한 수에 1 더하기)
  static async incrementUploadCount(userId: string) {
    if (!supabase) {
      return await mockDB.incrementUploadCount(userId);
    }

    try {
      // upload_count_today에 1을 더하기 (사용한 업로드 수 증가)
      await supabase
        .from('users')
        .update({
          upload_count_today: supabase.raw('upload_count_today + 1')
        })
        .eq('id', userId);
    } catch (error) {
      console.error('Upload count increment failed:', error);
    }
  }

  // 기존 사용자 이메일 확인 처리
  static async confirmExistingUser(email: string) {
    if (!supabaseAdmin) {
      return { success: false, error: 'Admin access not available' };
    }

    try {
      // 먼저 사용자 조회
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        return { success: false, error: listError.message };
      }

      const user = users.users.find(u => u.email === email);
      if (!user) {
        return { success: false, error: '사용자를 찾을 수 없습니다.' };
      }

      // 사용자 이메일 확인 상태 업데이트
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email_confirm: true
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        message: '이메일이 확인되었습니다. 이제 로그인할 수 있습니다.',
        user: data.user
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '이메일 확인 실패' 
      };
    }
  }
}