// 고급 라우팅 시스템 - 동적 라우트 완벽 지원

import { generateRequestId, createErrorHandler } from '../utils/api-error';
import { authRoutes } from './auth';
import { coreRoutes, handleStaticFiles } from './core';

export interface RouteHandler {
  (req: Request, params: RouteParams, requestId: string): Promise<Response>;
}

export interface RouteParams {
  [key: string]: string;
}

export interface MiddlewareFunction {
  (req: Request, params: RouteParams, requestId: string): Promise<void>;
}

interface RouteDefinition {
  pattern: RegExp;
  handler: RouteHandler;
  paramNames: string[];
  middleware: MiddlewareFunction[];
}

export class AdvancedRouter {
  private routes = new Map<string, RouteDefinition[]>();
  private errorHandler = createErrorHandler();
  
  constructor() {
    this.initializeRoutes();
  }
  
  private initializeRoutes() {
    // 기존 라우트들을 새로운 형식으로 변환
    this.convertLegacyRoutes();
    logger.info(`🚀 Advanced Router initialized with ${this.getTotalRoutes()} routes`);
  }
  
  private convertLegacyRoutes() {
    // 핵심 라우트 변환
    for (const [route, handler] of coreRoutes) {
      const [method, path] = route.split(':');
      this.addRoute(method, path, this.adaptLegacyHandler(handler));
    }
    
    // 인증 라우트 변환
    for (const [route, handler] of authRoutes) {
      const [method, path] = route.split(':');
      this.addRoute(method, path, this.adaptLegacyHandler(handler));
    }
  }
  
  private adaptLegacyHandler(legacyHandler: (req: Request) => Promise<Response>): RouteHandler {
    return async (req: Request, params: RouteParams, requestId: string) => {
      // params를 req 객체에 추가 (호환성을 위해)
      (req as any).params = params;
      (req as any).requestId = requestId;
      return await legacyHandler(req);
    };
  }
  
  // 라우트 등록 메서드들
  addRoute(method: string, path: string, handler: RouteHandler, middleware: MiddlewareFunction[] = []) {
    const { pattern, paramNames } = this.createRoutePattern(path);
    const routeDefinition: RouteDefinition = {
      pattern,
      handler,
      paramNames,
      middleware
    };
    
    const key = method.toUpperCase();
    if (!this.routes.has(key)) {
      this.routes.set(key, []);
    }
    this.routes.get(key)!.push(routeDefinition);
  }
  
  get(path: string, handler: RouteHandler, middleware: MiddlewareFunction[] = []) {
    this.addRoute('GET', path, handler, middleware);
  }
  
  post(path: string, handler: RouteHandler, middleware: MiddlewareFunction[] = []) {
    this.addRoute('POST', path, handler, middleware);
  }
  
  put(path: string, handler: RouteHandler, middleware: MiddlewareFunction[] = []) {
    this.addRoute('PUT', path, handler, middleware);
  }
  
  delete(path: string, handler: RouteHandler, middleware: MiddlewareFunction[] = []) {
    this.addRoute('DELETE', path, handler, middleware);
  }
  
  patch(path: string, handler: RouteHandler, middleware: MiddlewareFunction[] = []) {
    this.addRoute('PATCH', path, handler, middleware);
  }
  
  // 라우트 패턴 생성
  private createRoutePattern(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    
    // :id, :slug 등의 파라미터를 정규표현식으로 변환
    const regexPattern = path
      .replace(/\//g, '\\/') // 슬래시 이스케이프
      .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, paramName) => {
        paramNames.push(paramName);
        return '([^/]+)'; // 슬래시가 아닌 모든 문자
      })
      .replace(/\*/g, '.*'); // 와일드카드 지원
    
    return {
      pattern: new RegExp(`^${regexPattern}$`),
      paramNames
    };
  }
  
  // 파라미터 추출
  private extractParams(path: string, pattern: RegExp, paramNames: string[]): RouteParams {
    const match = path.match(pattern);
    if (!match) return {};
    
    const params: RouteParams = {};
    for (let i = 0; i < paramNames.length; i++) {
      params[paramNames[i]] = decodeURIComponent(match[i + 1]);
    }
    return params;
  }
  
  // 메인 요청 처리
  async handleRequest(req: Request): Promise<Response> {
    const requestId = generateRequestId();
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method.toUpperCase();
    
    try {
      // 정적 파일 처리 (최우선)
      const staticResponse = handleStaticFiles(pathname);
      if (staticResponse) {
        return await staticResponse;
      }
      
      // 동적 라우트 매칭
      const routes = this.routes.get(method) || [];
      
      for (const route of routes) {
        if (route.pattern.test(pathname)) {
          const params = this.extractParams(pathname, route.pattern, route.paramNames);
          
          // 미들웨어 실행
          for (const middleware of route.middleware) {
            await middleware(req, params, requestId);
          }
          
          // 핸들러 실행
          return await route.handler(req, params, requestId);
        }
      }
      
      // 404 처리
      return new Response(JSON.stringify({
        error: "Not Found",
        path: pathname,
        method: method,
        requestId: requestId,
        availableRoutes: this.getRouteList()
      }), {
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        }
      });
      
    } catch (error) {
      // 통합 에러 처리
      return await this.errorHandler(error, requestId);
    }
  }
  
  // 유틸리티 메서드들
  getTotalRoutes(): number {
    let total = 0;
    for (const routes of this.routes.values()) {
      total += routes.length;
    }
    return total;
  }
  
  getRouteList(): string[] {
    const routes: string[] = [];
    
    for (const [method, routeList] of this.routes.entries()) {
      for (const route of routeList) {
        // 정규표현식을 다시 경로 형태로 변환 (표시용)
        const pathPattern = route.pattern.toString()
          .replace(/^\^/, '')
          .replace(/\$$/, '')
          .replace(/\\\//g, '/')
          .replace(/\(\[^\/\]\+\)/g, ':param');
        
        routes.push(`${method} ${pathPattern}`);
      }
    }
    
    return routes.sort();
  }
  
  // 라우트 그룹 지원
  group(prefix: string, routes: (router: AdvancedRouter) => void, middleware: MiddlewareFunction[] = []) {
    const groupRouter = new AdvancedRouter();
    routes(groupRouter);
    
    // 그룹 라우트들을 현재 라우터에 추가 (prefix 적용)
    for (const [method, routeList] of groupRouter.routes.entries()) {
      for (const route of routeList) {
        const newPath = `${prefix}${this.patternToPath(route.pattern)}`;
        this.addRoute(
          method, 
          newPath, 
          route.handler, 
          [...middleware, ...route.middleware]
        );
      }
    }
  }
  
  private patternToPath(pattern: RegExp): string {
    // 간단한 변환 (실제로는 더 정교한 로직 필요)
    return pattern.toString()
      .replace(/^\^/, '')
      .replace(/\$$/, '')
      .replace(/\\\//g, '/')
      .replace(/\(\[^\/\]\+\)/g, '/:param');
  }
}

// 전역 고급 라우터 인스턴스
export const advancedRouter = new AdvancedRouter();

// 라우트 예시들
export function setupAdvancedRoutes() {
  // 동적 라우트 예시
  advancedRouter.get('/api/users/:id', async (req, params, requestId) => {
    return new Response(JSON.stringify({
      message: `User ID: ${params.id}`,
      requestId
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });
  
  // 복잡한 동적 라우트
  advancedRouter.get('/api/users/:userId/posts/:postId', async (req, params, requestId) => {
    return new Response(JSON.stringify({
      userId: params.userId,
      postId: params.postId,
      requestId
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });
  
  // 와일드카드 라우트
  advancedRouter.get('/api/files/*', async (req, params, requestId) => {
    const url = new URL(req.url);
    const filepath = url.pathname.replace('/api/files/', '');
    
    return new Response(JSON.stringify({
      message: `File path: ${filepath}`,
      requestId
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });
}

// 라우트 그룹 예시
export function setupRouteGroups() {
  // API v1 그룹
  advancedRouter.group('/api/v1', (router) => {
    router.get('/users', async (req, params, requestId) => {
      return new Response(JSON.stringify({ version: 'v1', endpoint: 'users' }));
    });
  });
  
  // Admin 그룹 (인증 미들웨어 적용 예정)
  advancedRouter.group('/api/admin', (router) => {
    router.get('/stats', async (req, params, requestId) => {
      return new Response(JSON.stringify({ admin: true, endpoint: 'stats' }));
    });
  }, []); // 여기에 인증 미들웨어 추가 예정
}