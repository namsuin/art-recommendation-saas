import { useEffect, useRef, useCallback } from 'react';

interface SessionManagerOptions {
  timeoutMinutes?: number;
  onSessionExpired?: () => void;
  onSessionRefreshed?: () => void;
}

export const useSessionManager = ({
  timeoutMinutes = 60, // 기본 60분
  onSessionExpired,
  onSessionRefreshed
}: SessionManagerOptions = {}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // 세션 만료 처리
  const handleSessionExpiry = useCallback(() => {
    if (onSessionExpired) {
      onSessionExpired();
    }
  }, [onSessionExpired]);

  // 활동 감지 및 세션 갱신
  const refreshSession = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // 기존 타이머 제거
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 새로운 타이머 설정
    timeoutRef.current = setTimeout(() => {
      handleSessionExpiry();
    }, timeoutMinutes * 60 * 1000);

    if (onSessionRefreshed) {
      onSessionRefreshed();
    }
  }, [timeoutMinutes, handleSessionExpiry, onSessionRefreshed]);

  // 사용자 활동 감지 이벤트들
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

  useEffect(() => {
    // 초기 세션 설정
    refreshSession();

    // 활동 감지 리스너 추가
    const handleActivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      // 1분 이내의 활동은 무시 (너무 자주 갱신되는 것 방지)
      if (timeSinceLastActivity > 60000) {
        refreshSession();
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // 정리 함수
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [refreshSession]);

  // 세션 상태 확인
  const isSessionActive = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    return timeSinceLastActivity < (timeoutMinutes * 60 * 1000);
  }, [timeoutMinutes]);

  // 수동 세션 갱신
  const extendSession = useCallback(() => {
    refreshSession();
  }, [refreshSession]);

  return {
    isSessionActive,
    extendSession,
    lastActivity: lastActivityRef.current
  };
};