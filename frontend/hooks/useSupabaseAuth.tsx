import { useState, useEffect, useCallback } from 'react';
import { useSessionManager } from './useSessionManager';

interface User {
  id: string;
  email: string;
}

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  subscription_tier: 'free' | 'premium';
  upload_count_today: number;
}

export const useSupabaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // 세션 만료 핸들러
  const handleSessionExpired = useCallback(() => {
    console.log('🔒 세션이 만료되었습니다. 로그아웃합니다.');
    setSessionExpired(true);
    signOut();
  }, []);

  // 세션 갱신 핸들러
  const handleSessionRefreshed = useCallback(() => {
    if (user) {
      console.log('🔄 세션이 갱신되었습니다.');
      // 필요시 서버에 세션 갱신 요청
      checkUserStatus();
    }
  }, [user]);

  // 세션 관리 훅 사용 (60분 타임아웃)
  const { extendSession } = useSessionManager({
    timeoutMinutes: 60,
    onSessionExpired: handleSessionExpired,
    onSessionRefreshed: handleSessionRefreshed
  });

  // 사용자 상태 확인
  const checkUserStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const result = await response.json();
      
      if (result.success && result.user) {
        setUser(result.user);
        setUserProfile(result.profile);
        setSessionExpired(false);
        
        // 활동이 있을 때 세션 연장
        extendSession();
      } else {
        setUser(null);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Failed to check user status:', error);
      setUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, [extendSession]);

  // 로그인
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.user);
        setUserProfile(result.profile);
        setSessionExpired(false);
        
        // 로그인 시 세션 시작
        extendSession();
        
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '로그인 실패' 
      };
    }
  }, [extendSession]);

  // 회원가입
  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, displayName }),
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.user);
        setUserProfile(result.profile);
        setSessionExpired(false);
        
        // 회원가입 시 세션 시작
        extendSession();
        
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '회원가입 실패' 
      };
    }
  }, [extendSession]);

  // 로그아웃
  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('로그아웃 요청 실패:', error);
    } finally {
      setUser(null);
      setUserProfile(null);
      setSessionExpired(false);
    }
  }, []);

  // 프로필 새로고침
  const refreshProfile = useCallback(async () => {
    if (user) {
      await checkUserStatus();
    }
  }, [user, checkUserStatus]);

  // 컴포넌트 마운트 시 사용자 상태 확인
  useEffect(() => {
    checkUserStatus();
  }, []);

  // 페이지 포커스 시 세션 확인
  useEffect(() => {
    const handleFocus = () => {
      if (user && !sessionExpired) {
        checkUserStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, sessionExpired, checkUserStatus]);

  return {
    user,
    userProfile,
    loading,
    sessionExpired,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    extendSession
  };
};