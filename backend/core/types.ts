// 중앙화된 타입 정의

export interface RouteHandler {
  (req: Request, params: RouteParams, requestId: string): Promise<Response>;
}

export interface RouteParams {
  [key: string]: string;
}

export interface MiddlewareFunction {
  (req: Request, params: RouteParams, requestId: string): Promise<void>;
}

export interface RouteDefinition {
  pattern: RegExp;
  handler: RouteHandler;
  paramNames: string[];
  middleware: MiddlewareFunction[];
  method: string;
  path: string;
}

export interface PerformanceMetrics {
  count: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  errorRate: number;
}

export interface RequestContext {
  requestId: string;
  startTime: number;
  user?: any;
  token?: string;
  metadata?: Record<string, any>;
}

export interface CacheEntry {
  response: Response;
  expiry: number;
  key: string;
}