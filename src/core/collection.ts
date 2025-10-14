/**
 * Chainable collection query implementation for VMS SDK.
 * Provides fluent interface for querying published content.
 */

import type {
  PublicContentItem
} from '../types/api.js'
import type { QueryOptions } from '../types/config.js'
import type { BrowserCache } from './cache.js'
import type { Fetcher } from './fetcher.js'
import type { AssetManager } from './asset.js'
import { CollectionResult } from './result.js'

/**
 * Chainable collection query class.
 * Provides .first(), .many(), and .all() methods for content retrieval.
 */
export class CollectionQuery<T = PublicContentItem> {
  constructor(
    private readonly fetcher: Fetcher,
    private readonly cache: BrowserCache,
    private readonly projectId: string,
    private readonly collectionSlug: string,
    private readonly locale: string,
    private readonly assetManager: AssetManager
  ) {}

  /**
   * Get the first item from the collection.
   * Returns a CollectionResult wrapping the first item, or null if the collection is empty.
   */
  async first(): Promise<CollectionResult<T>> {
    console.log('🔍 SDK DEBUG: CollectionQuery.first() called for:', {
      projectId: this.projectId,
      collectionSlug: this.collectionSlug
    })

    const cacheKey = this.cache.generateKey({
      projectId: this.projectId,
      collectionSlug: this.collectionSlug,
      queryType: 'first',
      locale: this.locale,
    })

    // Try cache first
    const cached = await this.cache.get<T>(cacheKey)
    if (cached !== null) {
      console.log('🔍 SDK DEBUG: Cache hit for first()')
      return new CollectionResult(cached, this.assetManager)
    }

    console.log('🔍 SDK DEBUG: Cache miss, making API request to fetcher.get()')

    try {
      // Fetch items from the collection - API returns plain array
      const items = await this.fetcher.get<PublicContentItem[]>(
        `/api/public/${this.projectId}/${this.collectionSlug}?locale=${encodeURIComponent(this.locale)}`
      )

      console.log('🔍 SDK DEBUG: API response received:', {
        isArray: Array.isArray(items),
        itemCount: items.length
      })

      const firstItem = items[0] || null

      console.log('🔍 SDK DEBUG: First item result:', {
        hasFirstItem: !!firstItem,
        firstItemKeys: firstItem && typeof firstItem === 'object' ? Object.keys(firstItem) : 'not-object'
      })

      // Cache the result
      if (firstItem) {
        await this.cache.set(cacheKey, firstItem as T)
        console.log('🔍 SDK DEBUG: Cached first item result')
      } else {
        // Cache the null result for a shorter time to avoid unnecessary requests
        await this.cache.set(cacheKey, null as T, 60000) // 1 minute for null results
        console.log('🔍 SDK DEBUG: Cached null result for first item')
      }

      return new CollectionResult(firstItem as T, this.assetManager)
    } catch (error) {
      console.log('🔍 SDK DEBUG: Error in first() method:', error)
      // Don't cache errors, let them bubble up
      throw error
    }
  }

  /**
   * Get multiple items from the collection with optional limit.
   * Returns a CollectionResult wrapping an array, or empty array if the collection is empty.
   */
  async many(options: QueryOptions = {}): Promise<CollectionResult<T>> {
    const { limit } = options
    
    const cacheKey = this.cache.generateKey({
      projectId: this.projectId,
      collectionSlug: this.collectionSlug,
      queryType: 'many',
      locale: this.locale,
      ...(limit ? { params: { limit } } : {}),
    })

    // Try cache first
    const cached = await this.cache.get<T[]>(cacheKey)
    if (cached !== null) {
      return new CollectionResult(cached, this.assetManager)
    }

    try {
      // Fetch items from the collection - API returns plain array
      const allItems = await this.fetcher.get<PublicContentItem[]>(
        `/api/public/${this.projectId}/${this.collectionSlug}?locale=${encodeURIComponent(this.locale)}`
      )

      let items = allItems as T[]

      // Apply limit client-side if specified
      if (limit && limit > 0) {
        items = items.slice(0, limit)
      }

      // Cache the result
      await this.cache.set(cacheKey, items)

      return new CollectionResult(items, this.assetManager)
    } catch (error) {
      // Don't cache errors, let them bubble up
      throw error
    }
  }

  /**
   * Get all items from the collection.
   * Equivalent to many() without a limit.
   */
  async all(): Promise<CollectionResult<T>> {
    return this.many()
  }

  /**
   * Get a specific item by its ID.
   * Returns a CollectionResult wrapping the item, or null if the item is not found.
   */
  async item(itemId: string): Promise<CollectionResult<T>> {
    const cacheKey = this.cache.generateKey({
      projectId: this.projectId,
      collectionSlug: this.collectionSlug,
      queryType: 'item',
      itemId,
      locale: this.locale,
    })

    // Try cache first
    const cached = await this.cache.get<T>(cacheKey)
    if (cached !== null) {
      return new CollectionResult(cached, this.assetManager)
    }

    try {
      // Fetch specific item - API returns single PublicContentItem
      const item = await this.fetcher.get<PublicContentItem>(
        `/api/public/${this.projectId}/${this.collectionSlug}/${itemId}?locale=${encodeURIComponent(this.locale)}`
      )

      // Cache the result
      await this.cache.set(cacheKey, item as T)

      return new CollectionResult(item as T, this.assetManager)
    } catch (error) {
      // Handle 404 errors gracefully for item() method
      if (error instanceof Error && 'status' in error && error.status === 404) {
        // Cache null result for missing items to avoid repeated requests
        await this.cache.set(cacheKey, null as T, 60000) // 1 minute for null results
        return new CollectionResult(null as T, this.assetManager)
      }

      // Re-throw other errors
      throw error
    }
  }


  /**
   * Clear cache for this collection and current locale.
   * Useful for invalidating cached data when content is known to have changed.
   */
  async clearCache(): Promise<void> {
    // Generate cache key patterns for this collection and locale
    const patterns = ['first', 'many', 'all', 'item']

    for (const pattern of patterns) {
      const baseKey = `vms:${this.projectId}:${this.locale}:${this.collectionSlug}:${pattern}`
      await this.cache.remove(baseKey)
    }
  }

  /**
   * Get basic collection information.
   * Note: The public API doesn't return collection metadata, so this only returns
   * the collection slug and item count.
   */
  async getCollectionInfo() {
    try {
      const items = await this.fetcher.get<PublicContentItem[]>(
        `/api/public/${this.projectId}/${this.collectionSlug}?locale=${encodeURIComponent(this.locale)}`
      )

      return {
        slug: this.collectionSlug,
        itemCount: items.length,
        locale: this.locale,
      }
    } catch (error) {
      throw error
    }
  }
}