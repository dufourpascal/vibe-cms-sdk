/**
 * Chainable collection query implementation for VMS SDK.
 * Provides fluent interface for querying published content.
 */

import type { 
  PublicContentItem, 
  PublicContentListResponse, 
  PublicContentResponse 
} from '../types/api.js'
import type { QueryOptions } from '../types/config.js'
import type { BrowserCache } from './cache.js'
import type { Fetcher } from './fetcher.js'

/**
 * Chainable collection query class.
 * Provides .first(), .many(), and .all() methods for content retrieval.
 */
export class CollectionQuery<T = PublicContentItem> {
  constructor(
    private readonly fetcher: Fetcher,
    private readonly cache: BrowserCache,
    private readonly projectId: string,
    private readonly collectionSlug: string
  ) {}

  /**
   * Get the first item from the collection.
   * Returns null if the collection is empty.
   */
  async first(): Promise<T | null> {
    const cacheKey = this.cache.generateKey({
      projectId: this.projectId,
      collectionSlug: this.collectionSlug,
      queryType: 'first',
    })

    // Try cache first
    const cached = await this.cache.get<T>(cacheKey)
    if (cached !== null) {
      return cached
    }

    try {
      // Fetch all items from the collection
      const response = await this.fetcher.get<PublicContentListResponse>(
        `/api/public/${this.projectId}/${this.collectionSlug}`
      )

      const firstItem = response.items[0] || null
      
      // Cache the result
      if (firstItem) {
        await this.cache.set(cacheKey, firstItem as T)
      } else {
        // Cache the null result for a shorter time to avoid unnecessary requests
        await this.cache.set(cacheKey, null as T, 60000) // 1 minute for null results
      }

      return firstItem as T
    } catch (error) {
      // Don't cache errors, let them bubble up
      throw error
    }
  }

  /**
   * Get multiple items from the collection with optional limit.
   * Returns an empty array if the collection is empty.
   */
  async many(options: QueryOptions = {}): Promise<T[]> {
    const { limit } = options
    
    const cacheKey = this.cache.generateKey({
      projectId: this.projectId,
      collectionSlug: this.collectionSlug,
      queryType: 'many',
      ...(limit ? { params: { limit } } : {}),
    })

    // Try cache first
    const cached = await this.cache.get<T[]>(cacheKey)
    if (cached !== null) {
      return cached
    }

    try {
      // Fetch all items from the collection
      const response = await this.fetcher.get<PublicContentListResponse>(
        `/api/public/${this.projectId}/${this.collectionSlug}`
      )

      let items = response.items as T[]
      
      // Apply limit if specified
      if (limit && limit > 0) {
        items = items.slice(0, limit)
      }

      // Cache the result
      await this.cache.set(cacheKey, items)

      return items
    } catch (error) {
      // Don't cache errors, let them bubble up
      throw error
    }
  }

  /**
   * Get all items from the collection.
   * Equivalent to many() without a limit.
   */
  async all(): Promise<T[]> {
    return this.many()
  }

  /**
   * Get a specific item by its ID.
   * Returns null if the item is not found.
   */
  async item(itemId: string): Promise<T | null> {
    const cacheKey = this.cache.generateKey({
      projectId: this.projectId,
      collectionSlug: this.collectionSlug,
      queryType: 'item',
      itemId,
    })

    // Try cache first
    const cached = await this.cache.get<T>(cacheKey)
    if (cached !== null) {
      return cached
    }

    try {
      // Fetch specific item
      const response = await this.fetcher.get<PublicContentResponse>(
        `/api/public/${this.projectId}/${this.collectionSlug}/${itemId}`
      )

      const item = response.content as T
      
      // Cache the result
      await this.cache.set(cacheKey, item)

      return item
    } catch (error) {
      // Handle 404 errors gracefully for item() method
      if (error instanceof Error && 'status' in error && error.status === 404) {
        // Cache null result for missing items to avoid repeated requests
        await this.cache.set(cacheKey, null as T, 60000) // 1 minute for null results
        return null
      }
      
      // Re-throw other errors
      throw error
    }
  }


  /**
   * Clear cache for this collection.
   * Useful for invalidating cached data when content is known to have changed.
   */
  async clearCache(): Promise<void> {
    // Generate cache key patterns for this collection
    const patterns = ['first', 'many', 'all', 'item']
    
    for (const pattern of patterns) {
      const baseKey = `vms:${this.projectId}:${this.collectionSlug}:${pattern}`
      await this.cache.remove(baseKey)
    }
  }

  /**
   * Get collection metadata without caching.
   * This fetches the collection info by making a request and extracting metadata.
   */
  async getCollectionInfo() {
    try {
      const response = await this.fetcher.get<PublicContentListResponse>(
        `/api/public/${this.projectId}/${this.collectionSlug}`
      )

      return {
        slug: response.collection.slug,
        name: response.collection.name,
        description: response.collection.description,
        is_singleton: response.collection.is_singleton,
        total: response.total,
      }
    } catch (error) {
      throw error
    }
  }
}