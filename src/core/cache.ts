/**
 * Browser caching implementation with TTL support for VMS SDK.
 * Supports both localStorage and sessionStorage with graceful fallback.
 */

import type { 
  CacheEntry, 
  CacheKeyComponents, 
  CacheOperations, 
  StorageAdapter 
} from '../types/cache.js'
import type { CacheConfig } from '../types/config.js'

/**
 * Default cache TTL in milliseconds (5 minutes).
 */
const DEFAULT_TTL = 300000

/**
 * Cache key prefix to avoid conflicts with other applications.
 */
const CACHE_KEY_PREFIX = 'vms'

/**
 * Storage adapter for localStorage.
 */
class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      // Handle quota exceeded or other storage errors gracefully
      console.warn('VMS SDK: LocalStorage operation failed, continuing without cache', error)
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore removal errors
    }
  }

  clear(): void {
    try {
      // Only clear VMS-related keys to avoid affecting other applications
      const keysToRemove = this.keys().filter(key => key.startsWith(`${CACHE_KEY_PREFIX}:`))
      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch {
      // Ignore clear errors
    }
  }

  keys(): string[] {
    try {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key !== null) {
          keys.push(key)
        }
      }
      return keys
    } catch {
      return []
    }
  }
}

/**
 * Storage adapter for sessionStorage.
 */
class SessionStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key)
    } catch {
      return null
    }
  }

  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value)
    } catch (error) {
      // Handle quota exceeded or other storage errors gracefully
      console.warn('VMS SDK: SessionStorage operation failed, continuing without cache', error)
    }
  }

  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key)
    } catch {
      // Ignore removal errors
    }
  }

  clear(): void {
    try {
      // Only clear VMS-related keys to avoid affecting other applications
      const keysToRemove = this.keys().filter(key => key.startsWith(`${CACHE_KEY_PREFIX}:`))
      keysToRemove.forEach(key => sessionStorage.removeItem(key))
    } catch {
      // Ignore clear errors
    }
  }

  keys(): string[] {
    try {
      const keys: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key !== null) {
          keys.push(key)
        }
      }
      return keys
    } catch {
      return []
    }
  }
}

/**
 * In-memory storage adapter fallback when browser storage is not available.
 */
class MemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, string>()

  getItem(key: string): string | null {
    return this.storage.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    // Implement basic memory limit to prevent unbounded growth
    if (this.storage.size >= 1000) {
      // Remove oldest entries (simple LRU-like behavior)
      const keysToRemove = Array.from(this.storage.keys()).slice(0, 100)
      keysToRemove.forEach(k => this.storage.delete(k))
    }
    this.storage.set(key, value)
  }

  removeItem(key: string): void {
    this.storage.delete(key)
  }

  clear(): void {
    // Only clear VMS-related keys
    const keysToRemove = Array.from(this.storage.keys()).filter(key => 
      key.startsWith(`${CACHE_KEY_PREFIX}:`)
    )
    keysToRemove.forEach(key => this.storage.delete(key))
  }

  keys(): string[] {
    return Array.from(this.storage.keys())
  }
}

/**
 * Browser cache implementation with TTL support.
 */
export class BrowserCache implements CacheOperations {
  private readonly storage: StorageAdapter
  private readonly ttl: number
  private readonly enabled: boolean

  constructor(config: Required<CacheConfig>) {
    this.ttl = config.ttl || DEFAULT_TTL
    this.enabled = config.enabled

    if (!this.enabled) {
      // Use memory storage when caching is disabled
      this.storage = new MemoryStorageAdapter()
      return
    }

    // Try to use the requested storage type with fallback
    try {
      if (config.storage === 'sessionStorage' && typeof sessionStorage !== 'undefined') {
        // Test if sessionStorage is accessible (some browsers disable it in private mode)
        sessionStorage.setItem('__vms_test__', 'test')
        sessionStorage.removeItem('__vms_test__')
        this.storage = new SessionStorageAdapter()
      } else if (typeof localStorage !== 'undefined') {
        // Test if localStorage is accessible
        localStorage.setItem('__vms_test__', 'test')
        localStorage.removeItem('__vms_test__')
        this.storage = new LocalStorageAdapter()
      } else {
        throw new Error('No browser storage available')
      }
    } catch {
      // Fallback to memory storage if browser storage is not available
      console.warn('VMS SDK: Browser storage not available, using in-memory cache')
      this.storage = new MemoryStorageAdapter()
    }
  }

  /**
   * Get cached data for a key.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) {
      return null
    }

    try {
      const item = this.storage.getItem(key)
      if (!item) {
        return null
      }

      const entry: CacheEntry<T> = JSON.parse(item)
      const now = Date.now()
      const entryTtl = entry.ttl ?? this.ttl

      // Check if entry has expired
      if (now - entry.timestamp > entryTtl) {
        this.storage.removeItem(key)
        return null
      }

      return entry.data
    } catch (error) {
      // If parsing fails or other error, remove the corrupted entry
      this.storage.removeItem(key)
      return null
    }
  }

  /**
   * Set cached data for a key.
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.enabled) {
      return
    }

    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl ?? this.ttl,
      }

      this.storage.setItem(key, JSON.stringify(entry))
    } catch (error) {
      // Storage operation failed, continue without caching
      console.warn('VMS SDK: Cache storage failed, continuing without cache', error)
    }
  }

  /**
   * Remove cached data for a key.
   */
  async remove(key: string): Promise<void> {
    this.storage.removeItem(key)
  }

  /**
   * Clear all cached data.
   */
  async clear(): Promise<void> {
    this.storage.clear()
  }

  /**
   * Check if a key exists in cache and is not expired.
   */
  async has(key: string): Promise<boolean> {
    const data = await this.get(key)
    return data !== null
  }

  /**
   * Generate a cache key from components.
   * Collection cache key format: vms:{projectId}:{locale}:{collectionSlug}:{queryType}[:{itemId}][:{paramHash}]
   * Asset cache key format: vms:{projectId}:{locale}:asset:{queryType}:{assetId}[:{paramHash}]
   */
  generateKey(components: CacheKeyComponents): string {
    const { projectId, collectionSlug, assetId, queryType, itemId, params, locale = 'en-US' } = components

    let keyParts: string[]

    // Handle asset operations differently from collection operations
    if (queryType === 'asset-url' || queryType === 'asset-download') {
      if (!assetId) {
        throw new Error('Asset ID is required for asset operations')
      }
      keyParts = [CACHE_KEY_PREFIX, projectId, locale, 'asset', queryType, assetId]
    } else {
      // Collection operations
      if (!collectionSlug) {
        throw new Error('Collection slug is required for collection operations')
      }
      keyParts = [CACHE_KEY_PREFIX, projectId, locale, collectionSlug, queryType]

      if (itemId) {
        keyParts.push(itemId)
      }
    }

    if (params && Object.keys(params).length > 0) {
      // Create a deterministic hash of the parameters
      const paramString = JSON.stringify(params, Object.keys(params).sort())
      const paramHash = this.simpleHash(paramString)
      keyParts.push(paramHash)
    }

    return keyParts.join(':')
  }

  /**
   * Clean up expired cache entries.
   * This method can be called periodically to remove stale data.
   */
  async cleanup(): Promise<void> {
    if (!this.enabled) {
      return
    }

    try {
      const keys = this.storage.keys()
      const vmsKeys = keys.filter(key => key.startsWith(`${CACHE_KEY_PREFIX}:`))

      for (const key of vmsKeys) {
        // Trigger get() which will automatically remove expired entries
        await this.get(key)
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Clear all cache entries for a specific project and locale.
   * Useful for invalidating cache when locale-specific content changes.
   */
  async clearLocaleCache(projectId: string, locale: string): Promise<void> {
    if (!this.enabled) {
      return
    }

    try {
      const keys = this.storage.keys()
      const localePrefix = `${CACHE_KEY_PREFIX}:${projectId}:${locale}:`
      const localeKeys = keys.filter(key => key.startsWith(localePrefix))

      for (const key of localeKeys) {
        this.storage.removeItem(key)
      }
    } catch {
      // Ignore clear errors
    }
  }

  /**
   * Simple hash function for cache keys.
   */
  private simpleHash(str: string): string {
    let hash = 0
    if (str.length === 0) return hash.toString(36)
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(36)
  }
}