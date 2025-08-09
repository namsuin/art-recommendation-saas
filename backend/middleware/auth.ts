// 인증 및 권한 관리 미들웨어

import { ApiErrors } from '../utils/api-error';
import { RouteParams, MiddlewareFunction } from '../routes/advanced-router';
import { AuthAPI } from '../api/auth';
import { AdminAPI } from '../api/admin';

// 인증 토큰 추출기
export class AuthTokenExtractor {
  static extractFromHeader(req: Request): string | null {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return null;
    
    // Bearer 토큰 형식
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (bearerMatch) return bearerMatch[1];
    
    // 기본 토큰 형식
    return authHeader;
  }
  
  static extractFromQuery(req: Request): string | null {
    const url = new URL(req.url);
    return url.searchParams.get('token');
  }
  
  static extractFromCookie(req: Request): string | null {
    const cookieHeader = req.headers.get('Cookie');
    if (!cookieHeader) return null;
    
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    return tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
  }
  
  // 모든 방법으로 토큰 추출 시도
  static extract(req: Request): string | null {
    return (
      this.extractFromHeader(req) ||
      this.extractFromQuery(req) ||
      this.extractFromCookie(req)
    );
  }
}

// 사용자 정보 인터페이스
export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName?: string;
  role: 'user' | 'admin' | 'super_admin';
  isActive: boolean;
}

// 인증 미들웨어들
export class AuthMiddleware {
  
  // 기본 인증 확인
  static requireAuth(): MiddlewareFunction {
    return async (req: Request, params: RouteParams, requestId: string): Promise<void> => {
      const token = AuthTokenExtractor.extract(req);
      
      if (!token) {
        throw ApiErrors.unauthorized('인증 토큰이 필요합니다.', requestId);
      }
      
      try {
        // 토큰 검증 및 사용자 정보 조회
        const user = await this.validateToken(token);
        
        if (!user.isActive) {
          throw ApiErrors.forbidden('비활성화된 계정입니다.', requestId);
        }
        
        // Request 객체에 사용자 정보 추가
        (req as any).user = user;
        (req as any).token = token;
        
      } catch (error) {
        if (error instanceof Error) {
          throw ApiErrors.unauthorized('유효하지 않은 인증 토큰입니다.', requestId);
        }
        throw error;
      }
    };
  }
  
  // 관리자 권한 확인
  static requireAdmin(): MiddlewareFunction {
    return async (req: Request, params: RouteParams, requestId: string): Promise<void> => {
      // 먼저 기본 인증 확인
      await AuthMiddleware.requireAuth()(req, params, requestId);
      
      const user = (req as any).user as AuthenticatedUser;
      
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        throw ApiErrors.forbidden('관리자 권한이 필요합니다.', requestId);
      }
      
      // 추가 관리자 권한 검증
      const isAdmin = await AdminAPI.isAdmin(user.id);
      if (!isAdmin) {
        throw ApiErrors.forbidden('관리자 권한이 확인되지 않습니다.', requestId);
      }
    };
  }
  
  // 슈퍼 관리자 권한 확인
  static requireSuperAdmin(): MiddlewareFunction {
    return async (req: Request, params: RouteParams, requestId: string): Promise<void> => {
      await AuthMiddleware.requireAuth()(req, params, requestId);
      
      const user = (req as any).user as AuthenticatedUser;
      
      if (user.role !== 'super_admin') {
        throw ApiErrors.forbidden('슈퍼 관리자 권한이 필요합니다.', requestId);
      }
    };
  }
  
  // 선택적 인증 (토큰이 있으면 검증, 없어도 통과)
  static optionalAuth(): MiddlewareFunction {
    return async (req: Request, params: RouteParams, requestId: string): Promise<void> => {
      const token = AuthTokenExtractor.extract(req);
      
      if (token) {
        try {
          const user = await this.validateToken(token);
          (req as any).user = user;
          (req as any).token = token;
        } catch (error) {
          // 선택적 인증이므로 에러를 던지지 않음
          console.warn(`Optional auth failed: ${error}`);
        }
      }
    };
  }
  
  // 자원 소유자 확인 (자신의 자원만 접근)
  static requireResourceOwner(paramName: string = 'userId'): MiddlewareFunction {
    return async (req: Request, params: RouteParams, requestId: string): Promise<void> => {
      await AuthMiddleware.requireAuth()(req, params, requestId);
      
      const user = (req as any).user as AuthenticatedUser;
      const resourceUserId = params[paramName];
      
      if (!resourceUserId) {
        throw ApiErrors.validation(`${paramName} 파라미터가 필요합니다.`, [], requestId);
      }
      
      // 관리자는 모든 자원에 접근 가능
      if (user.role === 'admin' || user.role === 'super_admin') {
        return;
      }
      
      // 자신의 자원만 접근 가능
      if (user.id !== resourceUserId) {
        throw ApiErrors.forbidden('본인의 자원에만 접근할 수 있습니다.', requestId);
      }
    };
  }
  
  // 사용량 제한 확인
  static requireUsageLimit(limitType: 'upload' | 'analysis' | 'recommendation'): MiddlewareFunction {
    return async (req: Request, params: RouteParams, requestId: string): Promise<void> => {
      await AuthMiddleware.requireAuth()(req, params, requestId);
      
      const user = (req as any).user as AuthenticatedUser;
      
      // 관리자는 제한 없음
      if (user.role === 'admin' || user.role === 'super_admin') {
        return;
      }
      
      switch (limitType) {
        case 'upload':
          const uploadLimit = await AuthAPI.checkUploadLimit(user.id);
          if (!uploadLimit.canUpload) {
            throw ApiErrors.rateLimit(
              `일일 업로드 제한에 도달했습니다. ${uploadLimit.resetTime}에 재설정됩니다.`,
              requestId
            );
          }
          break;
          
        // 다른 제한 타입들도 추가 가능
        case 'analysis':
        case 'recommendation':
          // 향후 구현
          break;
      }
    };
  }
  
  // 토큰 검증 헬퍼 메서드
  private static async validateToken(token: string): Promise<AuthenticatedUser> {
    try {
      const { supabase } = await import('../services/supabase');
      
      // Supabase JWT 토큰 검증 (기술 부채 해결: 토큰 만료 처리 개선)
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error) {
        // 토큰 만료 시 상세 처리
        if (error.message.includes('expired') || error.message.includes('invalid claims')) {
          console.warn('🔄 JWT token expired, client should refresh');
          throw new Error('TOKEN_EXPIRED');
        }
        
        if (error.message.includes('invalid')) {
          throw new Error('TOKEN_INVALID');
        }
        
        throw new Error(`AUTH_ERROR: ${error.message}`);
      }
      
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }
      
      return {
        id: user.id,
        email: user.email || '',
        displayName: user.user_metadata?.display_name || user.user_metadata?.full_name || null,
        role: user.user_metadata?.role || 'user',
        isActive: user.user_metadata?.is_active !== false
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // 특정 에러는 그대로 전파 (클라이언트에서 처리)
      if (errorMessage.includes('TOKEN_') || errorMessage.includes('USER_')) {
        throw error;
      }
      
      throw new Error(`Token validation failed: ${errorMessage}`);
    }
  }
}

// 권한 체크 유틸리티
export class PermissionChecker {
  
  // 특정 권한 확인
  static async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      // 실제 구현에서는 권한 시스템과 연동
      const isAdmin = await AdminAPI.isAdmin(userId);
      
      // 관리자는 모든 권한 보유
      if (isAdmin) return true;
      
      // 일반 사용자 권한 체크 (향후 구현)
      switch (permission) {
        case 'read_own_data':
          return true;
        case 'write_own_data':
          return true;
        default:
          return false;
      }
      
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }
  
  // 역할 기반 권한 확인
  static async hasRole(userId: string, requiredRole: string): Promise<boolean> {
    try {
      // 실제 구현 필요
      return await AdminAPI.isAdmin(userId);
    } catch (error) {
      console.error('Role check failed:', error);
      return false;
    }
  }
}

// 미들웨어 조합 헬퍼
export class MiddlewareComposer {
  
  // 여러 미들웨어를 순차 실행
  static compose(...middlewares: MiddlewareFunction[]): MiddlewareFunction {
    return async (req: Request, params: RouteParams, requestId: string): Promise<void> => {
      for (const middleware of middlewares) {
        await middleware(req, params, requestId);
      }
    };
  }
  
  // 조건부 미들웨어 실행
  static conditional(
    condition: (req: Request, params: RouteParams) => boolean,
    middleware: MiddlewareFunction
  ): MiddlewareFunction {
    return async (req: Request, params: RouteParams, requestId: string): Promise<void> => {
      if (condition(req, params)) {
        await middleware(req, params, requestId);
      }
    };
  }
}