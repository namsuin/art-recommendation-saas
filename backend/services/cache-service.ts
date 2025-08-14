/**
 * Advanced Caching Service for Art Recommendation SaaS
 * Provides multi-tier caching with Redis-like interface using in-memory storage
 */

import { serverLogger } from '../../shared/logger';
import { CacheEntry } from '../../shared/types';

export interface CacheConfig {
  maxMemoryItems: number;
  defaultTTL: number; // milliseconds
  cleanupInterval: number; // milliseconds
  compressionThreshold: number; // bytes
}

export interface CacheStats {
  hits: number;
  misses: number;
  totalEntries: number;
  memoryUsage: number;
  hitRate: number;
  oldestEntry: number;
  newestEntry: number;
}

class CacheService {
  private memoryCache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalEntries: 0,
    memoryUsage: 0,
    hitRate: 0,
    oldestEntry: 0,
    newestEntry: 0,
  };

  private config: CacheConfig = {
    maxMemoryItems: 1000,
    defaultTTL: 60 * 60 * 1000, // 1 hour
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    compressionThreshold: 1024, // 1KB
  };

  private cleanupTimer?: NodeJS.Timeout;

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.startCleanupTimer();
    serverLogger.info('🗄️ Cache service initialized', {
      maxItems: this.config.maxMemoryItems,
      defaultTTL: `${this.config.defaultTTL}ms`,
    });
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const effectiveTTL = ttl || this.config.defaultTTL;
    const now = Date.now();

    try {
      // Compress large objects
      let processedValue = value;
      const serialized = JSON.stringify(value);
      const size = Buffer.byteLength(serialized, 'utf8');

      if (size > this.config.compressionThreshold) {
        processedValue = this.compressValue(value);
      }

      const entry: CacheEntry<T> = {
        key,
        value: processedValue,
        ttl: effectiveTTL,
        created_at: now,
      };

      // Check memory limit
      if (this.memoryCache.size >= this.config.maxMemoryItems) {
        await this.evictLRU();
      }

      this.memoryCache.set(key, entry as CacheEntry);
      this.updateStats();
      
      serverLogger.debug('Cache SET', { 
        key: key.substring(0, 50), 
        size: `${size} bytes`,
        ttl: `${effectiveTTL}ms`,
      });

    } catch (error) {
      serverLogger.error('Cache SET failed', error as Error, { key });
      throw error;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.memoryCache.get(key);
      
      if (!entry) {
        this.stats.misses++;
        this.updateHitRate();
        serverLogger.debug('Cache MISS', { key: key.substring(0, 50) });
        return null;
      }

      // Check if expired
      const now = Date.now();
      if (now - entry.created_at > entry.ttl) {
        this.memoryCache.delete(key);
        this.stats.misses++;
        this.updateHitRate();
        serverLogger.debug('Cache EXPIRED', { key: key.substring(0, 50) });
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      
      // Decompress if needed
      let value = entry.value;
      if (this.isCompressed(entry.value)) {
        value = this.decompressValue(entry.value);
      }

      serverLogger.debug('Cache HIT', { key: key.substring(0, 50) });
      return value as T;

    } catch (error) {
      serverLogger.error('Cache GET failed', error as Error, { key });
      return null;
    }
  }

  /**
   * Delete a specific key
   */
  async delete(key: string): Promise<boolean> {
    const existed = this.memoryCache.has(key);
    this.memoryCache.delete(key);
    this.updateStats();
    
    if (existed) {
      serverLogger.debug('Cache DELETE', { key: key.substring(0, 50) });
    }
    
    return existed;
  }

  /**
   * Check if key exists and is not expired
   */
  async exists(key: string): Promise<boolean> {
    const entry = this.memoryCache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.created_at > entry.ttl) {
      this.memoryCache.delete(key);
      this.updateStats();
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const size = this.memoryCache.size;
    this.memoryCache.clear();
    this.stats.totalEntries = 0;
    this.stats.memoryUsage = 0;
    this.updateStats();
    
    serverLogger.info('Cache CLEARED', { entriesRemoved: size });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Generate cache key for AI analysis
   */
  generateAnalysisKey(imageHash: string, analysisType: string): string {
    return `ai_analysis:${analysisType}:${imageHash}`;
  }

  /**
   * Generate cache key for artwork recommendations
   */
  generateRecommendationKey(keywords: string[], limit: number): string {
    const keywordHash = this.hashKeywords(keywords);
    return `recommendations:${keywordHash}:${limit}`;
  }

  /**
   * Generate cache key for user profile
   */
  generateUserKey(userId: string): string {
    return `user:${userId}`;
  }

  /**
   * Batch get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results = await Promise.all(
      keys.map(key => this.get<T>(key))
    );
    return results;
  }

  /**
   * Batch set multiple key-value pairs
   */
  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    await Promise.all(
      entries.map(entry => this.set(entry.key, entry.value, entry.ttl))
    );
  }

  /**
   * Get cache keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const matchingKeys: string[] = [];
    
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        matchingKeys.push(key);
      }
    }
    
    return matchingKeys;
  }

  /**
   * Set expiration time for existing key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const entry = this.memoryCache.get(key);
    if (!entry) return false;

    entry.ttl = ttl;
    entry.created_at = Date.now();
    this.memoryCache.set(key, entry);
    
    return true;
  }

  // Private methods

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.config.cleanupInterval);
  }

  private cleanupExpired(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.created_at > entry.ttl) {
        this.memoryCache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.updateStats();
      serverLogger.debug('Cache cleanup completed', { removedEntries: removedCount });
    }
  }

  private async evictLRU(): Promise<void> {
    let oldestTime = Date.now();
    let oldestKey = '';

    // Find the oldest entry
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.created_at < oldestTime) {
        oldestTime = entry.created_at;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      serverLogger.debug('Cache LRU eviction', { 
        evictedKey: oldestKey.substring(0, 50),
        age: `${Date.now() - oldestTime}ms`
      });
    }
  }

  private updateStats(): void {
    this.stats.totalEntries = this.memoryCache.size;
    
    // Calculate memory usage (rough estimate)
    let totalSize = 0;
    let oldestTime = Date.now();
    let newestTime = 0;

    for (const entry of this.memoryCache.values()) {
      totalSize += this.estimateEntrySize(entry);
      if (entry.created_at < oldestTime) oldestTime = entry.created_at;
      if (entry.created_at > newestTime) newestTime = entry.created_at;
    }

    this.stats.memoryUsage = totalSize;
    this.stats.oldestEntry = oldestTime;
    this.stats.newestEntry = newestTime;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private estimateEntrySize(entry: CacheEntry): number {
    try {
      return Buffer.byteLength(JSON.stringify(entry), 'utf8');
    } catch {
      return 100; // Fallback estimate
    }
  }

  private compressValue<T>(value: T): T {
    // Simple compression simulation - in production, use actual compression
    return value;
  }

  private decompressValue<T>(value: T): T {
    // Simple decompression simulation
    return value;
  }

  private isCompressed<T>(value: T): boolean {
    // Check if value is compressed (simplified)
    return false;
  }

  private hashKeywords(keywords: string[]): string {
    return keywords.sort().join('|').toLowerCase();
  }

  /**
   * Shutdown cache service
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.memoryCache.clear();
    serverLogger.info('Cache service shutdown');
  }
}

// Singleton instance
export const cacheService = new CacheService({
  maxMemoryItems: 2000,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 10 * 60 * 1000, // 10 minutes
});

// Export for testing and custom instances
export { CacheService };