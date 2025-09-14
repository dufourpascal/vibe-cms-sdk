/**
 * Types for the browser caching system.
 */

/**
 * Cache entry structure stored in browser storage.
 */
export interface CacheEntry<T = any> {
  /** Cached data */
  data: T
  /** Timestamp when the data was cached */
  timestamp: number
  /** Optional TTL override for this specific entry */
  ttl?: number
}

/**
 * Cache key components for generating cache keys.
 */
export interface CacheKeyComponents {
  /** Project ID */
  projectId: string
  /** Collection slug (not used for asset operations) */
  collectionSlug?: string
  /** Optional item ID for single item queries */
  itemId?: string
  /** Asset ID for asset operations */
  assetId?: string
  /** Query type (first, many, all, asset operations) */
  queryType: 'first' | 'many' | 'all' | 'item' | 'asset-url' | 'asset-download'
  /** Optional query parameters that affect caching */
  params?: Record<string, any>
  /** Locale for locale-aware caching */
  locale?: string
}

/**
 * Cache operations interface.
 */
export interface CacheOperations {
  /** Get cached data for a key */
  get<T>(key: string): Promise<T | null>
  
  /** Set cached data for a key */
  set<T>(key: string, data: T, ttl?: number): Promise<void>
  
  /** Remove cached data for a key */
  remove(key: string): Promise<void>
  
  /** Clear all cached data */
  clear(): Promise<void>
  
  /** Check if a key exists in cache and is not expired */
  has(key: string): Promise<boolean>
  
  /** Generate a cache key from components */
  generateKey(components: CacheKeyComponents): string
}

/**
 * Storage adapter interface for different storage types.
 */
export interface StorageAdapter {
  /** Get item from storage */
  getItem(key: string): string | null
  
  /** Set item in storage */
  setItem(key: string, value: string): void
  
  /** Remove item from storage */
  removeItem(key: string): void
  
  /** Clear all items from storage */
  clear(): void
  
  /** Get all keys from storage */
  keys(): string[]
}