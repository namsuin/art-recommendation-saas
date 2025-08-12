// 요청 로깅 및 모니터링 미들웨어

import { MiddlewareFunction, RouteParams } from '../routes/advanced-router';
import { logger } from '../../shared/logger';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  requestId: string;
  method: string;
  path: string;
  userAgent?: string;
  userId?: string;
  ip?: string;
  duration?: number;
  statusCode?: number;
  error?: any;
  metadata?: Record<string, any>;
}

export class Logger {
  private static entries: LogEntry[] = [];
  private static maxEntries = 10000;
  private static currentLevel = LogLevel.INFO;
  
  static setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }
  
  static log(entry: LogEntry): void {
    if (entry.level < this.currentLevel) return;
    
    // 콘솔 출력
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelName = LogLevel[entry.level];
    const message = `[${timestamp}] [${levelName}] [${entry.requestId}] ${entry.method} ${entry.path}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        logger.debug(message, entry.metadata);
        break;
      case LogLevel.INFO:
        logger.info(message, entry.duration ? `${entry.duration}ms` : '');
        break;
      case LogLevel.WARN:
        logger.warn(message, entry.error || entry.metadata);
        break;
      case LogLevel.ERROR:
        logger.error(message, entry.error || entry.metadata);
        break;
    }
    
    // 메모리에 저장
    this.entries.push(entry);
    
    // 최대 항목 수 초과 시 오래된 것부터 제거
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  }
  
  static debug(requestId: string, method: string, path: string, metadata?: Record<string, any>): void {
    this.log({
      timestamp: Date.now(),
      level: LogLevel.DEBUG,
      requestId,
      method,
      path,
      metadata
    });
  }
  
  static info(requestId: string, method: string, path: string, duration?: number): void {
    this.log({
      timestamp: Date.now(),
      level: LogLevel.INFO,
      requestId,
      method,
      path,
      duration
    });
  }
  
  static warn(requestId: string, method: string, path: string, error?: any, metadata?: Record<string, any>): void {
    this.log({
      timestamp: Date.now(),
      level: LogLevel.WARN,
      requestId,
      method,
      path,
      error,
      metadata
    });
  }
  
  static error(requestId: string, method: string, path: string, error: any, metadata?: Record<string, any>): void {
    this.log({
      timestamp: Date.now(),
      level: LogLevel.ERROR,
      requestId,
      method,
      path,
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      },
      metadata
    });
  }
  
  // 로그 조회
  static getEntries(
    level?: LogLevel, 
    limit: number = 100, 
    requestId?: string
  ): LogEntry[] {
    let filtered = this.entries;
    
    if (level !== undefined) {
      filtered = filtered.filter(entry => entry.level >= level);
    }
    
    if (requestId) {
      filtered = filtered.filter(entry => entry.requestId === requestId);
    }
    
    return filtered
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  // 통계 조회
  static getStats(): {
    totalRequests: number;
    errorRate: number;
    avgResponseTime: number;
    requestsByMethod: Record<string, number>;
    errorsByType: Record<string, number>;
  } {
    const total = this.entries.length;
    const errors = this.entries.filter(e => e.level === LogLevel.ERROR).length;
    const withDuration = this.entries.filter(e => e.duration !== undefined);
    const avgDuration = withDuration.length > 0 
      ? withDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / withDuration.length
      : 0;
    
    const methodCounts: Record<string, number> = {};
    const errorTypes: Record<string, number> = {};
    
    for (const entry of this.entries) {
      methodCounts[entry.method] = (methodCounts[entry.method] || 0) + 1;
      
      if (entry.level === LogLevel.ERROR && entry.error?.name) {
        errorTypes[entry.error.name] = (errorTypes[entry.error.name] || 0) + 1;
      }
    }
    
    return {
      totalRequests: total,
      errorRate: total > 0 ? (errors / total) * 100 : 0,
      avgResponseTime: Math.round(avgDuration),
      requestsByMethod: methodCounts,
      errorsByType: errorTypes
    };
  }
  
  static clear(): void {
    this.entries = [];
  }
}

// 요청 로깅 미들웨어
export class RequestLoggingMiddleware {
  
  static create(): MiddlewareFunction {
    return async (req: Request, params: RouteParams, requestId: string): Promise<void> => {
      const startTime = Date.now();
      const url = new URL(req.url);
      const path = url.pathname;
      const method = req.method;
      
      // IP 주소 추출 (프록시 고려)
      const ip = req.headers.get('x-forwarded-for') || 
                 req.headers.get('x-real-ip') || 
                 'unknown';
      
      const userAgent = req.headers.get('user-agent');
      const userId = (req as any).user?.id;
      
      // 요청 시작 로그
      Logger.debug(requestId, method, path, {
        ip,
        userAgent,
        userId,
        params: Object.keys(params).length > 0 ? params : undefined,
        queryParams: url.search ? Object.fromEntries(url.searchParams) : undefined
      });
      
      // 응답 완료 후 로깅을 위해 request에 정보 저장
      (req as any).startTime = startTime;
      (req as any).logMetadata = { ip, userAgent, userId };
    };
  }
  
  // 응답 완료 후 호출되는 로깅
  static logResponse(req: Request, response: Response, requestId: string): void {
    const startTime = (req as any).startTime;
    const metadata = (req as any).logMetadata || {};
    
    if (startTime) {
      const duration = Date.now() - startTime;
      const url = new URL(req.url);
      
      const logEntry: LogEntry = {
        timestamp: Date.now(),
        level: response.status >= 400 ? LogLevel.WARN : LogLevel.INFO,
        requestId,
        method: req.method,
        path: url.pathname,
        duration,
        statusCode: response.status,
        userAgent: metadata.userAgent,
        userId: metadata.userId,
        ip: metadata.ip
      };
      
      Logger.log(logEntry);
    }
  }
}

// 성능 모니터링
export class PerformanceMonitor {
  private static metrics = new Map<string, {
    count: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    errors: number;
  }>();
  
  static recordRequest(path: string, duration: number, isError: boolean = false): void {
    const key = path;
    const current = this.metrics.get(key) || {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0
    };
    
    current.count++;
    current.totalTime += duration;
    current.minTime = Math.min(current.minTime, duration);
    current.maxTime = Math.max(current.maxTime, duration);
    
    if (isError) {
      current.errors++;
    }
    
    this.metrics.set(key, current);
  }
  
  static getMetrics(): Record<string, {
    count: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    errorRate: number;
  }> {
    const result: Record<string, any> = {};
    
    for (const [path, metrics] of this.metrics.entries()) {
      result[path] = {
        count: metrics.count,
        avgTime: Math.round(metrics.totalTime / metrics.count),
        minTime: metrics.minTime === Infinity ? 0 : metrics.minTime,
        maxTime: metrics.maxTime,
        errorRate: (metrics.errors / metrics.count) * 100
      };
    }
    
    return result;
  }
  
  static getSlowRoutes(threshold: number = 1000): Array<{
    path: string;
    avgTime: number;
    count: number;
  }> {
    const metrics = this.getMetrics();
    
    return Object.entries(metrics)
      .filter(([_, data]) => data.avgTime > threshold)
      .map(([path, data]) => ({
        path,
        avgTime: data.avgTime,
        count: data.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime);
  }
  
  static clear(): void {
    this.metrics.clear();
  }
}

// 알림 시스템 (간단한 구현)
export class AlertSystem {
  private static alerts: Array<{
    timestamp: number;
    level: 'warning' | 'critical';
    message: string;
    metadata?: any;
  }> = [];
  
  static checkThresholds(): void {
    const stats = Logger.getStats();
    const now = Date.now();
    
    // 에러율 체크 (5분간 5% 이상)
    if (stats.errorRate > 5 && stats.totalRequests > 10) {
      this.alert('critical', `High error rate: ${stats.errorRate.toFixed(2)}%`, {
        errorRate: stats.errorRate,
        totalRequests: stats.totalRequests,
        errorsByType: stats.errorsByType
      });
    }
    
    // 느린 응답 시간 체크 (평균 2초 이상)
    if (stats.avgResponseTime > 2000) {
      this.alert('warning', `Slow response time: ${stats.avgResponseTime}ms`, {
        avgResponseTime: stats.avgResponseTime
      });
    }
    
    // 느린 라우트 체크
    const slowRoutes = PerformanceMonitor.getSlowRoutes(3000);
    if (slowRoutes.length > 0) {
      this.alert('warning', `${slowRoutes.length} slow routes detected`, {
        slowRoutes: slowRoutes.slice(0, 3) // 상위 3개만
      });
    }
  }
  
  private static alert(level: 'warning' | 'critical', message: string, metadata?: any): void {
    // 중복 알림 방지 (10분간)
    const recentAlerts = this.alerts.filter(a => Date.now() - a.timestamp < 600000);
    const duplicate = recentAlerts.find(a => a.message === message);
    
    if (duplicate) return;
    
    const alert = {
      timestamp: Date.now(),
      level,
      message,
      metadata
    };
    
    this.alerts.push(alert);
    logger.warn(`[ALERT:${level.toUpperCase()}] ${message}`, metadata);
    
    // 실제 환경에서는 여기서 이메일, 슬랙 등으로 알림 발송
  }
  
  static getAlerts(limit: number = 50): typeof AlertSystem.alerts {
    return this.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

// 모니터링 자동 시작
export function startMonitoring(): void {
  // 5분마다 임계값 체크
  setInterval(() => {
    AlertSystem.checkThresholds();
  }, 300000);
  
  logger.info('🔍 Monitoring system started');
}