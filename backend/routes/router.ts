// 통합 라우터 시스템
import { authRoutes } from './auth';
import { coreRoutes, handleStaticFiles } from './core';

export interface RouteHandler {
  (req: Request): Promise<Response>;
}

export class Router {
  private routes = new Map<string, RouteHandler>();
  
  constructor() {
    this.initializeRoutes();
  }
  
  private initializeRoutes() {
    // 핵심 라우트 등록
    for (const [route, handler] of coreRoutes) {
      this.routes.set(route, handler);
    }
    
    // 인증 라우트 등록
    for (const [route, handler] of authRoutes) {
      this.routes.set(route, handler);
    }
    
    console.log(`📋 Total routes registered: ${this.routes.size}`);
  }
  
  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;
    const routeKey = `${method}:${pathname}`;
    
    // 정확한 라우트 매칭 시도
    const handler = this.routes.get(routeKey);
    if (handler) {
      return await handler(req);
    }
    
    // 정적 파일 처리
    const staticResponse = handleStaticFiles(pathname);
    if (staticResponse) {
      return await staticResponse;
    }
    
    // 패턴 매칭 (startsWith 등)
    for (const [route, handler] of this.routes) {
      const [routeMethod, routePath] = route.split(':');
      
      if (method === routeMethod) {
        // 동적 라우트 매칭 (예: /api/admin/artworks/:id)
        if (routePath.includes(':')) {
          const routePattern = routePath.replace(/:[^/]+/g, '[^/]+');
          const regex = new RegExp(`^${routePattern}$`);
          
          if (regex.test(pathname)) {
            return await handler(req);
          }
        }
        
        // startsWith 매칭
        if (routePath.endsWith('*') && pathname.startsWith(routePath.slice(0, -1))) {
          return await handler(req);
        }
      }
    }
    
    // 404 응답
    return new Response(JSON.stringify({
      error: "Not Found",
      path: pathname,
      method: method
    }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  // 라우트 등록 헬퍼 메서드
  get(path: string, handler: RouteHandler) {
    this.routes.set(`GET:${path}`, handler);
  }
  
  post(path: string, handler: RouteHandler) {
    this.routes.set(`POST:${path}`, handler);
  }
  
  put(path: string, handler: RouteHandler) {
    this.routes.set(`PUT:${path}`, handler);
  }
  
  delete(path: string, handler: RouteHandler) {
    this.routes.set(`DELETE:${path}`, handler);
  }
  
  // 현재 등록된 라우트 목록 반환
  getRegisteredRoutes(): string[] {
    return Array.from(this.routes.keys()).sort();
  }
}

// 전역 라우터 인스턴스
export const router = new Router();