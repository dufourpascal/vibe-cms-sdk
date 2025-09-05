/**
 * Main VMS client class for interacting with published content.
 */

import type { 
  VibeCMSConfig, 
  ResolvedVibeCMSConfig,
  VibeCMSError
} from '../types/config.js'
import type { PublicContentItem } from '../types/api.js'
import { BrowserCache } from './cache.js'
import { Fetcher } from './fetcher.js'
import { CollectionQuery } from './collection.js'

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG = {
  baseUrl: 'https://api.vibe-cms.com',
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    storage: 'localStorage' as const,
  },
} as const

/**
 * Regex pattern for validating project IDs (from backend validation).
 * Must match: ^[a-zA-Z0-9_-]+$
 */
const PROJECT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

/**
 * Regex pattern for validating collection slugs (from backend validation).
 * Must match: ^[a-z0-9_-]+$ (lowercase only!)
 */
const COLLECTION_SLUG_PATTERN = /^[a-z0-9_-]+$/

/**
 * Main VibeCMS client class.
 * Provides access to collections and manages configuration, caching, and HTTP requests.
 */
export class VibeCMSClient {
  public readonly projectId: string
  public readonly baseUrl: string
  
  private readonly config: ResolvedVibeCMSConfig
  private readonly fetcher: Fetcher
  private readonly browserCache: BrowserCache

  constructor(config: VibeCMSConfig) {
    // Validate project ID format
    if (!config.projectId) {
      throw new Error('VMS SDK: projectId is required')
    }
    
    if (!PROJECT_ID_PATTERN.test(config.projectId)) {
      throw new Error(
        'VMS SDK: Invalid projectId format. Must contain only letters, numbers, underscores, and hyphens.'
      )
    }

    // Resolve configuration with defaults
    this.config = {
      projectId: config.projectId,
      baseUrl: config.baseUrl || DEFAULT_CONFIG.baseUrl,
      cache: {
        enabled: config.cache?.enabled ?? DEFAULT_CONFIG.cache.enabled,
        ttl: config.cache?.ttl ?? DEFAULT_CONFIG.cache.ttl,
        storage: config.cache?.storage ?? DEFAULT_CONFIG.cache.storage,
      },
    }

    // Store public properties
    this.projectId = this.config.projectId
    this.baseUrl = this.config.baseUrl

    // Initialize core components
    this.fetcher = new Fetcher(this.config.baseUrl)
    this.browserCache = new BrowserCache(this.config.cache)
  }

  /**
   * Create a collection query for the specified collection slug.
   * Returns a chainable CollectionQuery instance.
   */
  collection<T = PublicContentItem>(collectionSlug: string): CollectionQuery<T> {
    // Validate collection slug format
    if (!collectionSlug) {
      throw new Error('VMS SDK: Collection slug is required')
    }

    if (!COLLECTION_SLUG_PATTERN.test(collectionSlug)) {
      throw new Error(
        'VMS SDK: Invalid collection slug format. Must contain only lowercase letters, numbers, underscores, and hyphens.'
      )
    }

    return new CollectionQuery<T>(
      this.fetcher,
      this.browserCache,
      this.projectId,
      collectionSlug
    )
  }

  /**
   * Clear all cached data for this project.
   * Useful when you know content has been updated and want to force fresh requests.
   */
  async clearCache(): Promise<void> {
    await this.browserCache.clear()
  }

  /**
   * Clean up expired cache entries.
   * This method can be called periodically to remove stale data and free up storage space.
   */
  async cleanupCache(): Promise<void> {
    await this.browserCache.cleanup()
  }

  /**
   * Check if the client can connect to the API.
   * Makes a request to the health endpoint to verify connectivity.
   */
  async ping(): Promise<{ success: boolean; status: string; timestamp: string }> {
    try {
      // Try to fetch a simple endpoint to verify connectivity
      const response = await this.fetcher.get<any>('/health')
      
      return {
        success: true,
        status: 'connected',
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        status: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Get current configuration (read-only).
   */
  getConfig(): Readonly<ResolvedVibeCMSConfig> {
    return { ...this.config }
  }

  /**
   * Get cache statistics.
   * Returns information about cache usage and performance.
   */
  async getCacheStats(): Promise<{
    enabled: boolean
    storage: string
    ttl: number
    keys: number
  }> {
    const keys = this.config.cache.enabled ? 
      await this.getCacheKeys() : []

    return {
      enabled: this.config.cache.enabled,
      storage: this.config.cache.storage,
      ttl: this.config.cache.ttl,
      keys: keys.length,
    }
  }

  /**
   * Get all cache keys for this project.
   */
  private async getCacheKeys(): Promise<string[]> {
    try {
      const storage = this.config.cache.storage === 'sessionStorage' 
        ? sessionStorage 
        : localStorage
        
      const allKeys = Object.keys(storage)
      return allKeys.filter(key => key.startsWith(`vms:${this.projectId}:`))
    } catch {
      return []
    }
  }

  /**
   * Enable or disable caching at runtime.
   * Note: This creates a new cache instance, so existing cached data may be lost.
   */
  reconfigureCache(cacheConfig: Partial<typeof this.config.cache>): void {
    // Update cache configuration
    Object.assign(this.config.cache, cacheConfig)
    
    // Note: We don't recreate the BrowserCache instance here because it would
    // require updating all existing CollectionQuery instances. Instead, users
    // should create a new client instance if they need to change cache settings.
    console.warn(
      'VMS SDK: Cache reconfiguration requires creating a new client instance to take effect.'
    )
  }

  /**
   * Create a scoped client for a specific collection.
   * This is a convenience method that returns an object with methods bound to a specific collection.
   */
  scopedCollection<T = PublicContentItem>(collectionSlug: string) {
    const collection = this.collection<T>(collectionSlug)
    
    return {
      first: () => collection.first(),
      many: (options?: Parameters<typeof collection.many>[0]) => collection.many(options),
      all: () => collection.all(),
      item: (itemId: string) => collection.item(itemId),
      clearCache: () => collection.clearCache(),
      getInfo: () => collection.getCollectionInfo(),
    }
  }
}