// 고급 성능 최적화 시스템

import { RequestContext, CacheEntry } from './types';

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private requestPool: Map<string, RequestContext> = new Map();
  private performanceCache: Map<string, any> = new Map();
  private batchProcessor: BatchProcessor;
  
  private constructor() {
    this.batchProcessor = new BatchProcessor();
  }
  
  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }
  
  // 병렬 처리 최적화
  async optimizeParallelExecution<T>(
    tasks: Array<() => Promise<T>>,
    options: {
      maxConcurrency?: number;
      timeout?: number;
      failFast?: boolean;
    } = {}
  ): Promise<T[]> {
    const {
      maxConcurrency = 10,
      timeout = 30000,
      failFast = false
    } = options;
    
    // 세마포어 패턴으로 동시 실행 제한
    const semaphore = new Semaphore(maxConcurrency);
    
    const wrappedTasks = tasks.map(async (task) => {
      await semaphore.acquire();
      try {
        return await Promise.race([
          task(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Task timeout')), timeout)
          )
        ]);
      } finally {
        semaphore.release();
      }
    });
    
    if (failFast) {
      return await Promise.all(wrappedTasks);
    } else {
      const results = await Promise.allSettled(wrappedTasks);
      return results
        .filter((result): result is PromiseFulfilledResult<T> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);
    }
  }
  
  // 요청 컨텍스트 풀링
  acquireRequestContext(requestId: string): RequestContext {
    let context = this.requestPool.get(requestId);
    
    if (!context) {
      context = {
        requestId,
        startTime: Date.now(),
        metadata: {}
      };
      this.requestPool.set(requestId, context);
    }
    
    return context;
  }
  
  releaseRequestContext(requestId: string): void {
    this.requestPool.delete(requestId);
  }
  
  // 지능형 캐싱
  async getCached<T>(
    key: string, 
    generator: () => Promise<T>,
    ttl: number = 300000 // 5분 기본
  ): Promise<T> {
    const cached = this.performanceCache.get(key);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.value;
    }
    
    // 캐시 미스 시 생성
    const value = await generator();
    this.performanceCache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
    
    return value;
  }
  
  // 배치 처리 최적화
  addToBatch<T>(
    batchKey: string,
    item: T,
    processor: (items: T[]) => Promise<any[]>,
    options: BatchOptions = {}
  ): Promise<any> {
    return this.batchProcessor.add(batchKey, item, processor, options);
  }
  
  // 메모리 최적화
  optimizeMemory(): void {
    // 만료된 캐시 정리
    const now = Date.now();
    for (const [key, entry] of this.performanceCache.entries()) {
      if (entry.expiry && now > entry.expiry) {
        this.performanceCache.delete(key);
      }
    }
    
    // 오래된 요청 컨텍스트 정리 (10분 초과)
    for (const [requestId, context] of this.requestPool.entries()) {
      if (now - context.startTime > 600000) {
        this.requestPool.delete(requestId);
      }
    }
    
    // 가비지 컬렉션 힌트
    if (global.gc) {
      global.gc();
    }
  }
  
  // 성능 메트릭 수집
  getMetrics() {
    return {
      activeRequests: this.requestPool.size,
      cachedItems: this.performanceCache.size,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime()
    };
  }
}

// 세마포어 구현
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];
  
  constructor(permits: number) {
    this.permits = permits;
  }
  
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    
    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }
  
  release(): void {
    this.permits++;
    
    const next = this.waitQueue.shift();
    if (next) {
      this.permits--;
      next();
    }
  }
}

// 배치 처리 시스템
interface BatchOptions {
  maxSize?: number;
  maxWait?: number;
}

class BatchProcessor {
  private batches: Map<string, {
    items: any[];
    promises: Array<{ resolve: Function; reject: Function }>;
    processor: Function;
    options: BatchOptions;
    timer?: NodeJS.Timeout;
  }> = new Map();
  
  add<T, R>(
    batchKey: string,
    item: T,
    processor: (items: T[]) => Promise<R[]>,
    options: BatchOptions = {}
  ): Promise<R> {
    const {
      maxSize = 10,
      maxWait = 100 // 100ms
    } = options;
    
    return new Promise<R>((resolve, reject) => {
      let batch = this.batches.get(batchKey);
      
      if (!batch) {
        batch = {
          items: [],
          promises: [],
          processor,
          options
        };
        this.batches.set(batchKey, batch);
      }
      
      batch.items.push(item);
      batch.promises.push({ resolve, reject });
      
      // 최대 크기 도달 시 즉시 처리
      if (batch.items.length >= maxSize) {
        this.processBatch(batchKey);
        return;
      }
      
      // 타이머 설정 (최대 대기 시간)
      if (!batch.timer) {
        batch.timer = setTimeout(() => {
          this.processBatch(batchKey);
        }, maxWait);
      }
    });
  }
  
  private async processBatch(batchKey: string): Promise<void> {
    const batch = this.batches.get(batchKey);
    if (!batch) return;
    
    this.batches.delete(batchKey);
    
    if (batch.timer) {
      clearTimeout(batch.timer);
    }
    
    try {
      const results = await batch.processor(batch.items);
      
      // 결과를 각 프로미스에 전달
      batch.promises.forEach((promise, index) => {
        if (results[index] !== undefined) {
          promise.resolve(results[index]);
        } else {
          promise.reject(new Error('Batch processing failed'));
        }
      });
    } catch (error) {
      // 에러 시 모든 프로미스 거부
      batch.promises.forEach(promise => {
        promise.reject(error);
      });
    }
  }
}

// 고급 캐싱 시스템
export class AdvancedCache {
  private static instance: AdvancedCache;
  private caches: Map<string, Map<string, CacheEntry>> = new Map();
  private policies: Map<string, CachePolicy> = new Map();
  
  private constructor() {
    this.setupCleanupSchedule();
  }
  
  static getInstance(): AdvancedCache {
    if (!AdvancedCache.instance) {
      AdvancedCache.instance = new AdvancedCache();
    }
    return AdvancedCache.instance;
  }
  
  createCache(name: string, policy: CachePolicy): void {
    this.caches.set(name, new Map());
    this.policies.set(name, policy);
  }
  
  async get<T>(cacheName: string, key: string): Promise<T | null> {
    const cache = this.caches.get(cacheName);
    const policy = this.policies.get(cacheName);
    
    if (!cache || !policy) return null;
    
    const entry = cache.get(key);
    if (!entry) return null;
    
    // TTL 확인
    if (Date.now() > entry.expiry) {
      cache.delete(key);
      return null;
    }
    
    // LRU 업데이트
    if (policy.type === 'lru') {
      cache.delete(key);
      cache.set(key, entry);
    }
    
    return entry.response as T;
  }
  
  set<T>(cacheName: string, key: string, value: T, ttl?: number): void {
    const cache = this.caches.get(cacheName);
    const policy = this.policies.get(cacheName);
    
    if (!cache || !policy) return;
    
    const expiry = Date.now() + (ttl || policy.defaultTTL);
    
    // 크기 제한 확인
    if (cache.size >= policy.maxSize) {
      if (policy.type === 'lru') {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      } else {
        // FIFO
        cache.clear();
      }
    }
    
    cache.set(key, {
      response: value as Response,
      expiry,
      key
    });
  }
  
  private setupCleanupSchedule(): void {
    setInterval(() => {
      this.cleanup();
    }, 300000); // 5분마다 정리
  }
  
  private cleanup(): void {
    const now = Date.now();
    
    for (const cache of this.caches.values()) {
      for (const [key, entry] of cache.entries()) {
        if (now > entry.expiry) {
          cache.delete(key);
        }
      }
    }
  }
}

interface CachePolicy {
  type: 'lru' | 'fifo';
  maxSize: number;
  defaultTTL: number;
}

// 성능 최적화 미들웨어
export function createPerformanceMiddleware() {
  const optimizer = PerformanceOptimizer.getInstance();
  
  return async (req: Request, params: any, requestId: string) => {
    const context = optimizer.acquireRequestContext(requestId);
    
    // 요청 컨텍스트를 req에 첨부
    (req as any).performanceContext = context;
    
    // 요청 완료 후 정리를 위한 핸들러 등록
    const originalJson = Response.prototype.json;
    Response.prototype.json = function() {
      optimizer.releaseRequestContext(requestId);
      return originalJson.call(this);
    };
  };
}

// 전역 인스턴스 생성
export const performanceOptimizer = PerformanceOptimizer.getInstance();
export const advancedCache = AdvancedCache.getInstance();

// 캐시 설정 초기화
advancedCache.createCache('api-responses', {
  type: 'lru',
  maxSize: 1000,
  defaultTTL: 300000 // 5분
});

advancedCache.createCache('static-files', {
  type: 'fifo',
  maxSize: 500,
  defaultTTL: 3600000 // 1시간
});