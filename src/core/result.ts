/**
 * Enhanced result wrapper for VibeCMS SDK collection queries.
 * Provides field extraction and asset handling capabilities.
 */

import type { PublicContentItem, AssetUrlOptions, DownloadAssetOptions, AssetData } from '../types/api.js'
import type { AssetManager } from './asset.js'

/**
 * Represents either a single item or an array of items from a collection query.
 */
export type CollectionQueryResult<T = PublicContentItem> = T | T[] | null

/**
 * Enhanced collection result wrapper that provides field extraction and asset handling.
 * Maintains backward compatibility while adding powerful new functionality.
 */
export class CollectionResult<T = PublicContentItem> {
  private readonly data: CollectionQueryResult<T>
  private readonly assetManager: AssetManager

  constructor(data: CollectionQueryResult<T>, assetManager: AssetManager) {
    this.data = data
    this.assetManager = assetManager
  }

  /**
   * Get the raw data (for backward compatibility).
   * This allows existing code to continue working unchanged.
   */
  get raw(): CollectionQueryResult<T> {
    return this.data
  }

  /**
   * Check if the result is empty/null.
   */
  get isEmpty(): boolean {
    return this.data === null || (Array.isArray(this.data) && this.data.length === 0)
  }

  /**
   * Check if the result is a single item.
   */
  get isSingle(): boolean {
    return this.data !== null && !Array.isArray(this.data)
  }

  /**
   * Check if the result is an array of items.
   */
  get isArray(): boolean {
    return Array.isArray(this.data)
  }

  /**
   * Get the count of items in the result.
   */
  get count(): number {
    if (this.data === null) return 0
    if (Array.isArray(this.data)) return this.data.length
    return 1
  }

  /**
   * Extract field values from the result.
   * - For single items: returns the field value directly
   * - For arrays: returns an array of field values
   * - For empty results: returns null or empty array respectively
   *
   * @param fieldName - The field name to extract from item.data
   * @returns The field value(s) or null/empty array if not found
   */
  field<K extends string>(fieldName: K): any {
    if (this.data === null) {
      return null
    }

    if (Array.isArray(this.data)) {
      // For arrays, return array of field values
      return this.data.map((item: any) => {
        return item?.data?.[fieldName] ?? null
      })
    } else {
      // For single items, return the field value directly
      return (this.data as any)?.data?.[fieldName] ?? null
    }
  }

  /**
   * Generate asset URLs from field values.
   * Automatically handles both single assets and arrays of assets.
   *
   * @param fieldName - The field name containing asset ID(s)
   * @param options - Optional asset URL generation options
   * @returns Asset URL(s) or null if no assets found
   */
  asset_url<K extends string>(fieldName: K, options?: AssetUrlOptions): string | string[] | null {
    if (this.data === null) {
      return null
    }

    if (Array.isArray(this.data)) {
      // For arrays, return array of asset URLs
      const results: (string | string[])[] = this.data.map((item: any) => {
        const assetId = item?.data?.[fieldName]
        if (!assetId) return null

        if (Array.isArray(assetId)) {
          // Handle asset arrays within items
          return assetId.map(id => this.assetManager.generateAssetUrl(id, options))
        } else {
          // Handle single asset within items
          return this.assetManager.generateAssetUrl(assetId, options)
        }
      }).filter(url => url !== null) // Remove null entries

      return results.flat() // Flatten nested arrays
    } else {
      // For single items, handle asset field
      const assetId = (this.data as any)?.data?.[fieldName]
      if (!assetId) return null

      if (Array.isArray(assetId)) {
        // Handle array of assets in single item
        return assetId.map(id => this.assetManager.generateAssetUrl(id, options))
      } else {
        // Handle single asset in single item
        return this.assetManager.generateAssetUrl(assetId, options)
      }
    }
  }

  /**
   * Download asset(s) from field values.
   * Automatically handles both single assets and arrays of assets.
   *
   * @param fieldName - The field name containing asset ID(s)
   * @param options - Optional asset download options
   * @returns Promise resolving to asset data or array of asset data
   */
  async download_asset<K extends string>(fieldName: K, options?: DownloadAssetOptions): Promise<AssetData | AssetData[] | null> {
    if (this.data === null) {
      return null
    }

    if (Array.isArray(this.data)) {
      // For arrays, return array of downloaded assets
      const downloads = await Promise.all(
        this.data.map(async (item: any) => {
          const assetId = item?.data?.[fieldName]
          if (!assetId) return null

          if (Array.isArray(assetId)) {
            // Handle asset arrays within items
            return Promise.all(assetId.map(id => this.assetManager.downloadAsset(id, options)))
          } else {
            // Handle single asset within items
            return this.assetManager.downloadAsset(assetId, options)
          }
        })
      )

      const flattenedDownloads = downloads.filter(download => download !== null).flat()
      return flattenedDownloads as AssetData[]
    } else {
      // For single items, handle asset field
      const assetId = (this.data as any)?.data?.[fieldName]
      if (!assetId) return null

      if (Array.isArray(assetId)) {
        // Handle array of assets in single item
        return Promise.all(assetId.map(id => this.assetManager.downloadAsset(id, options)))
      } else {
        // Handle single asset in single item
        return this.assetManager.downloadAsset(assetId, options)
      }
    }
  }

  /**
   * Convert to array for consistent iteration.
   * - For single items: returns [item]
   * - For arrays: returns the array as-is
   * - For null: returns empty array
   */
  toArray(): T[] {
    if (this.data === null) return []
    if (Array.isArray(this.data)) return this.data
    return [this.data]
  }

  /**
   * Map over the result items.
   * Works for both single items and arrays.
   */
  map<U>(fn: (item: T, index: number) => U): U[] {
    return this.toArray().map(fn)
  }

  /**
   * Filter the result items.
   * Works for both single items and arrays.
   */
  filter(fn: (item: T, index: number) => boolean): CollectionResult<T> {
    const filtered = this.toArray().filter(fn)
    return new CollectionResult(filtered, this.assetManager)
  }

  /**
   * Find the first item matching a condition.
   * Works for both single items and arrays.
   */
  find(fn: (item: T, index: number) => boolean): T | undefined {
    return this.toArray().find(fn)
  }

  /**
   * Get the first item from the result.
   * - For single items: returns the item
   * - For arrays: returns the first item
   * - For empty: returns null
   */
  first(): T | null {
    if (this.data === null) return null
    if (Array.isArray(this.data)) return this.data[0] || null
    return this.data
  }

  /**
   * Get the last item from the result.
   * - For single items: returns the item
   * - For arrays: returns the last item
   * - For empty: returns null
   */
  last(): T | null {
    if (this.data === null) return null
    if (Array.isArray(this.data)) return this.data[this.data.length - 1] || null
    return this.data
  }

  /**
   * Allow direct iteration over the result.
   * Makes CollectionResult iterable for for...of loops.
   */
  *[Symbol.iterator](): Iterator<T> {
    for (const item of this.toArray()) {
      yield item
    }
  }

  /**
   * JSON serialization support.
   * Returns the raw data for JSON.stringify().
   */
  toJSON(): CollectionQueryResult<T> {
    return this.data
  }

  /**
   * String representation for debugging.
   */
  toString(): string {
    if (this.data === null) return 'CollectionResult(null)'
    if (Array.isArray(this.data)) return `CollectionResult(${this.data.length} items)`
    return 'CollectionResult(1 item)'
  }
}