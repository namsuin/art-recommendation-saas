// 통합된 고성능 라우터 시스템

import { RouteHandler, RouteParams, MiddlewareFunction, RouteDefinition, RequestContext } from './types';
import { generateRequestId, createErrorHandler } from '../utils/api-error';
import { authRoutes } from '../routes/auth';
import { coreRoutes, handleStaticFiles } from '../routes/core';

export class UnifiedRouter {
  private routes = new Map<string, RouteDefinition[]>();
  private errorHandler = createErrorHandler();
  private routeCache = new Map<string, RouteDefinition>();
  
  constructor() {
    this.initializeRoutes();
  }
  
  private initializeRoutes() {
    // 기존 라우트들을 새로운 통합 형식으로 변환
    this.migrateFromLegacyRouters();
    this.optimizeRouteLookup();
    
    console.log(`⚡ Unified Router initialized with ${this.getTotalRoutes()} optimized routes`);
  }
  
  private migrateFromLegacyRouters() {
    // 핵심 라우트 마이그레이션
    for (const [route, handler] of coreRoutes) {
      const [method, path] = route.split(':');
      this.addRoute(method, path, this.adaptLegacyHandler(handler));
    }
    
    // 인증 라우트 마이그레이션
    for (const [route, handler] of authRoutes) {
      const [method, path] = route.split(':');
      this.addRoute(method, path, this.adaptLegacyHandler(handler));
    }
    
    // Instagram 통합 라우트 추가
    this.addInstagramRoutes();
  }
  
  private addInstagramRoutes() {
    const { instagramService } = require('../services/instagram-integration');
    
    // Instagram 프로필 가져오기
    this.get('/api/instagram/profile/:username', async (req, params) => {
      try {
        const result = await instagramService.importAsArtworks(params.username);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch Instagram profile' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    });
    
    // Instagram 작품 가져오기
    this.post('/api/instagram/import', async (req) => {
      try {
        const body = await req.json();
        const { username } = body;
        
        if (!username) {
          return new Response(JSON.stringify({ error: 'Username is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const result = await instagramService.importAsArtworks(username);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to import Instagram posts' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    });
  }
  
  private adaptLegacyHandler(legacyHandler: (req: Request) => Promise<Response>): RouteHandler {
    return async (req: Request, params: RouteParams, requestId: string) => {
      // 호환성을 위한 확장
      (req as any).params = params;
      (req as any).requestId = requestId;
      return await legacyHandler(req);
    };
  }
  
  private optimizeRouteLookup() {
    // 정적 라우트는 빠른 맵 조회용 캐시 생성
    for (const [method, routeList] of this.routes.entries()) {
      for (const route of routeList) {
        // 동적 파라미터가 없는 정적 라우트만 캐시
        if (!route.path.includes(':') && !route.path.includes('*')) {
          const cacheKey = `${method}:${route.path}`;
          this.routeCache.set(cacheKey, route);
        }
      }
    }
  }
  
  // 라우트 등록 (모든 이전 메서드들 통합)
  addRoute(method: string, path: string, handler: RouteHandler, middleware: MiddlewareFunction[] = []) {
    const { pattern, paramNames } = this.createRoutePattern(path);
    const routeDefinition: RouteDefinition = {
      pattern,
      handler,
      paramNames,
      middleware,
      method: method.toUpperCase(),
      path
    };
    
    const key = method.toUpperCase();
    if (!this.routes.has(key)) {
      this.routes.set(key, []);
    }
    this.routes.get(key)!.push(routeDefinition);
    
    // 정적 라우트는 캐시에 추가
    if (!path.includes(':') && !path.includes('*')) {
      this.routeCache.set(`${key}:${path}`, routeDefinition);
    }
  }
  
  // 편의 메서드들
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
  
  // 고성능 라우트 패턴 생성
  private createRoutePattern(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    
    // 매개변수 및 와일드카드 처리를 최적화
    const regexPattern = path
      .replace(/\//g, '\\/') 
      .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, paramName) => {
        paramNames.push(paramName);
        return '([^/]+)';
      })
      .replace(/\*/g, '(.*)'); // 개선된 와일드카드
    
    return {
      pattern: new RegExp(`^${regexPattern}$`),
      paramNames
    };
  }
  
  // 고성능 파라미터 추출
  private extractParams(path: string, pattern: RegExp, paramNames: string[]): RouteParams {
    const match = path.match(pattern);
    if (!match) return {};
    
    const params: RouteParams = {};
    for (let i = 0; i < paramNames.length; i++) {
      params[paramNames[i]] = decodeURIComponent(match[i + 1]);
    }
    return params;
  }
  
  // 최적화된 메인 요청 처리
  async handleRequest(req: Request): Promise<Response> {
    const requestId = generateRequestId();
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method.toUpperCase();
    
    try {
      // 정적 파일 최우선 처리
      const staticResponse = handleStaticFiles(pathname);
      if (staticResponse) {
        return await staticResponse;
      }
      
      // 캐시된 정적 라우트 빠른 조회
      const cacheKey = `${method}:${pathname}`;
      const cachedRoute = this.routeCache.get(cacheKey);
      
      if (cachedRoute) {
        return await this.executeRoute(cachedRoute, req, {}, requestId);
      }
      
      // 동적 라우트 매칭
      const routes = this.routes.get(method) || [];
      
      for (const route of routes) {
        if (route.pattern.test(pathname)) {
          const params = this.extractParams(pathname, route.pattern, route.paramNames);
          return await this.executeRoute(route, req, params, requestId);
        }
      }
      
      // 404 처리 (최적화된 응답)
      return this.create404Response(pathname, method, requestId);
      
    } catch (error) {
      return await this.errorHandler(error, requestId);
    }
  }
  
  // 라우트 실행 최적화
  private async executeRoute(
    route: RouteDefinition, 
    req: Request, 
    params: RouteParams, 
    requestId: string
  ): Promise<Response> {
    // 미들웨어 병렬 실행 (가능한 경우)
    const independentMiddleware = route.middleware.filter(mw => 
      !this.hasAsyncDependency(mw)
    );
    const dependentMiddleware = route.middleware.filter(mw => 
      this.hasAsyncDependency(mw)
    );
    
    // 독립적인 미들웨어는 병렬 실행
    if (independentMiddleware.length > 0) {
      await Promise.all(
        independentMiddleware.map(mw => mw(req, params, requestId))
      );
    }
    
    // 의존성이 있는 미들웨어는 순차 실행
    for (const middleware of dependentMiddleware) {
      await middleware(req, params, requestId);
    }
    
    return await route.handler(req, params, requestId);
  }
  
  private hasAsyncDependency(middleware: MiddlewareFunction): boolean {
    // 미들웨어 함수명으로 의존성 판단 (향후 메타데이터로 개선 가능)
    const fnString = middleware.toString();
    return fnString.includes('req.user') || fnString.includes('Auth');
  }
  
  private create404Response(pathname: string, method: string, requestId: string): Response {
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route not found',
        details: [{
          path: pathname,
          method: method,
          suggestion: this.suggestRoute(pathname)
        }]
      },
      meta: {
        requestId,
        timestamp: Date.now(),
        version: '2.0'
      }
    }), {
      status: 404,
      headers: { 
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      }
    });
  }
  
  private suggestRoute(pathname: string): string | null {
    // 비슷한 라우트 제안 (레벤슈타인 거리 기반)
    const allPaths = Array.from(this.routeCache.keys()).map(key => key.split(':')[1]);
    
    let bestMatch = '';
    let bestScore = Infinity;
    
    for (const path of allPaths) {
      const score = this.levenshteinDistance(pathname, path);
      if (score < bestScore && score <= 3) {
        bestScore = score;
        bestMatch = path;
      }
    }
    
    return bestMatch || null;
  }
  
  private levenshteinDistance(a: string, b: string): number {
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }
  
  // 라우트 그룹 및 프리픽스 지원
  group(prefix: string, routes: (router: UnifiedRouter) => void, middleware: MiddlewareFunction[] = []) {
    const groupRouter = new UnifiedRouter();
    routes(groupRouter);
    
    for (const [method, routeList] of groupRouter.routes.entries()) {
      for (const route of routeList) {
        const fullPath = `${prefix}${route.path}`;
        this.addRoute(
          method, 
          fullPath, 
          route.handler, 
          [...middleware, ...route.middleware]
        );
      }
    }
  }
  
  // 성능 메트릭
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
        routes.push(`${method} ${route.path}`);
      }
    }
    
    return routes.sort();
  }
  
  // 라우터 통계
  getStats() {
    return {
      totalRoutes: this.getTotalRoutes(),
      cachedRoutes: this.routeCache.size,
      methods: Array.from(this.routes.keys()),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
  
  // 라우터 상태 진단
  diagnose() {
    console.log('\n🔍 Unified Router Diagnostics:');
    console.log(`   📊 Total routes: ${this.getTotalRoutes()}`);
    console.log(`   ⚡ Cached routes: ${this.routeCache.size}`);
    console.log(`   🎯 Cache hit ratio: ${((this.routeCache.size / this.getTotalRoutes()) * 100).toFixed(1)}%`);
    console.log(`   🚀 Methods supported: ${Array.from(this.routes.keys()).join(', ')}`);
    console.log(`   💾 Memory efficient: ${this.routeCache.size < 100 ? '✅' : '⚠️'}`);
  }
}

// 전역 통합 라우터 인스턴스
export const unifiedRouter = new UnifiedRouter();

// 고급 라우트 설정 함수들
export function setupOptimizedRoutes() {
  // 동적 라우트 예시들 (최적화됨)
  unifiedRouter.get('/api/users/:id', async (req, params, requestId) => {
    return new Response(JSON.stringify({
      success: true,
      data: {
        userId: params.id,
        timestamp: Date.now()
      },
      meta: { requestId, version: '2.0' }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });
  
  unifiedRouter.get('/api/users/:userId/posts/:postId', async (req, params, requestId) => {
    return new Response(JSON.stringify({
      success: true,
      data: {
        userId: params.userId,
        postId: params.postId
      },
      meta: { requestId, version: '2.0' }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  });
}

export function setupRouteGroups() {
  // API v2 그룹 (향후 확장)
  unifiedRouter.group('/api/v2', (router) => {
    router.get('/status', async (req, params, requestId) => {
      return new Response(JSON.stringify({
        success: true,
        data: { version: '2.0', status: 'active' },
        meta: { requestId }
      }));
    });
  });
}