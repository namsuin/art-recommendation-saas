import { useState, useEffect, useCallback } from 'react';

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
  role?: 'user' | 'artist' | 'admin';
}

export const useSupabaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);

  // 세션 만료 핸들러
  const handleSessionExpired = useCallback(() => {
    // 세션 만료으로 로그아웃
    setSessionExpired(true);
    signOut();
  }, []);

  // 세션 갱신 핸들러
  const handleSessionRefreshed = useCallback(() => {
    if (user) {
      // 세션 갱신 완료
      // 세션 갱신 시에는 강제 체크하지 않음 (중복 방지)
    }
  }, [user]);

  // 세션 관리 비활성화 - API 호출 최소화
  const extendSession = () => {}; // 빈 함수로 대체

  // 사용자 상태 확인 (중복 호출 방지)
  const checkUserStatus = useCallback(async (force: boolean = false) => {
    // 30초 이내에 이미 체크했다면 스킵 (5초에서 30초로 증가)
    const now = Date.now();
    if (!force && lastCheckTime && now - lastCheckTime < 30000) {
      return;
    }
    
    setLastCheckTime(now);
    
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      // 401 에러는 정상적인 응답 (로그인하지 않은 상태)
      if (response.status === 401) {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }
      
      const result = await response.json();
      
      if (result.success && result.user) {
        setUser(result.user);
        setUserProfile(result.profile);
        setSessionExpired(false);
      } else {
        setUser(null);
        setUserProfile(null);
      }
    } catch (error) {
      // 네트워크 오류만 로그에 기록
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('Network error while checking auth status');
      }
      setUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, [lastCheckTime]);

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
        
        // 로그인 시간 기록 (30분 세션 관리용)
        localStorage.setItem('lastLoginTime', Date.now().toString());
        
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
  const signUp = useCallback(async (email: string, password: string, displayName?: string, role?: string, artistInfo?: any) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          email, 
          password, 
          displayName,
          role: role || 'user',
          ...(artistInfo || {})
        }),
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.user);
        setUserProfile(result.profile);
        setSessionExpired(false);
        
        // 회원가입 성공 시에도 로그인 시간 기록
        localStorage.setItem('lastLoginTime', Date.now().toString());
        
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
      
      // 로그인 시간 기록 제거
      localStorage.removeItem('lastLoginTime');
    }
  }, []);

  // 프로필 새로고침
  const refreshProfile = useCallback(async () => {
    if (user) {
      await checkUserStatus(true); // 강제 새로고침
    }
  }, [user, checkUserStatus]);

  // 30분 세션 타임아웃 관리
  useEffect(() => {
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30분
    
    // 로컬 스토리지에서 마지막 로그인 시간 확인
    const lastLoginTime = localStorage.getItem('lastLoginTime');
    const now = Date.now();
    
    if (lastLoginTime) {
      const timeSinceLogin = now - parseInt(lastLoginTime);
      
      if (timeSinceLogin > SESSION_TIMEOUT) {
        // 30분 경과시 세션 만료
        // 30분 만료으로 세션 종료
        setSessionExpired(true);
        localStorage.removeItem('lastLoginTime');
        signOut();
        return;
      }
      
      // 세션이 유효하면 사용자 상태 확인
      checkUserStatus(true);
    } else {
      // 로그인 시간이 없으면 로딩 해제
      setLoading(false);
    }
  }, []);

  // 페이지 포커스 이벤트 제거 - 불필요한 API 호출 방지
  // 사용자가 명시적으로 새로고침하거나 로그인/로그아웃할 때만 체크

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