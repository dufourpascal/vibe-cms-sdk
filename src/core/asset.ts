/**
 * Asset management functionality for VibeCMS SDK.
 * Handles asset URL generation and binary asset downloading.
 */

import type { AssetUrlOptions, DownloadAssetOptions, AssetData } from '../types/api.js'
import type { BrowserCache } from './cache.js'
import type { Fetcher } from './fetcher.js'

/**
 * Regex pattern for validating asset IDs.
 * Must match: ^[a-zA-Z0-9_-]+$
 */
const ASSET_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

/**
 * Asset manager class for handling file and image operations.
 */
export class AssetManager {
  private readonly fetcher: Fetcher
  private readonly cache: BrowserCache
  private readonly projectId: string
  private readonly locale: string

  constructor(
    fetcher: Fetcher,
    cache: BrowserCache,
    projectId: string,
    locale: string
  ) {
    this.fetcher = fetcher
    this.cache = cache
    this.projectId = projectId
    this.locale = locale
  }

  /**
   * Generate a browser-cacheable URL for an asset.
   * This URL can be used directly in HTML img tags, download links, etc.
   */
  generateAssetUrl(assetId: string, options: AssetUrlOptions = {}): string {
    // Validate asset ID format
    if (!assetId) {
      throw new Error('VMS SDK: Asset ID is required')
    }

    if (!ASSET_ID_PATTERN.test(assetId)) {
      throw new Error(
        'VMS SDK: Invalid asset ID format. Must contain only letters, numbers, underscores, and hyphens.'
      )
    }

    // Build the base URL following the public API pattern
    const baseUrl = this.fetcher['baseUrl'] // Access private property for URL construction
    let url = `${baseUrl}/api/assets/${this.projectId}/${assetId}`

    // Add query parameters if provided
    const params = new URLSearchParams()

    if (options.variant) {
      params.append('variant', options.variant)
    }

    if (options.width !== undefined) {
      if (options.width <= 0) {
        throw new Error('VMS SDK: Asset width must be a positive number')
      }
      params.append('width', options.width.toString())
    }

    if (options.height !== undefined) {
      if (options.height <= 0) {
        throw new Error('VMS SDK: Asset height must be a positive number')
      }
      params.append('height', options.height.toString())
    }

    // Append query string if we have parameters
    if (params.toString()) {
      url += `?${params.toString()}`
    }

    return url
  }

  /**
   * Download an asset and return the binary data with metadata.
   * This method handles caching automatically.
   */
  async downloadAsset(assetId: string, options: DownloadAssetOptions = {}): Promise<AssetData> {
    // Validate asset ID
    if (!assetId) {
      throw new Error('VMS SDK: Asset ID is required')
    }

    if (!ASSET_ID_PATTERN.test(assetId)) {
      throw new Error(
        'VMS SDK: Invalid asset ID format. Must contain only letters, numbers, underscores, and hyphens.'
      )
    }

    const { useCache = true, cacheTtl, ...urlOptions } = options

    // Generate cache key for this asset download
    const cacheKey = useCache ? this.cache.generateKey({
      projectId: this.projectId,
      assetId,
      queryType: 'asset-download',
      params: urlOptions,
      locale: this.locale
    }) : null

    // Try to get from cache first
    if (cacheKey && useCache) {
      const cachedData = await this.cache.get<any>(cacheKey)
      if (cachedData) {
        // Convert base64 back to ArrayBuffer if it was cached as base64
        if (typeof cachedData.data === 'string') {
          return {
            ...cachedData,
            data: this.base64ToArrayBuffer(cachedData.data)
          }
        }
        return cachedData as AssetData
      }
    }

    // Build request URL
    const endpoint = `/api/assets/${this.projectId}/${assetId}`

    // Build query parameters
    const params = new URLSearchParams()

    if (urlOptions.variant) {
      params.append('variant', urlOptions.variant)
    }

    if (urlOptions.width !== undefined) {
      if (urlOptions.width <= 0) {
        throw new Error('VMS SDK: Asset width must be a positive number')
      }
      params.append('width', urlOptions.width.toString())
    }

    if (urlOptions.height !== undefined) {
      if (urlOptions.height <= 0) {
        throw new Error('VMS SDK: Asset height must be a positive number')
      }
      params.append('height', urlOptions.height.toString())
    }

    const fullEndpoint = `${endpoint}?${params.toString()}`

    try {
      // Make request for binary data
      const response = await this.makeAssetRequest(fullEndpoint)

      // Parse response headers
      const contentType = response.headers.get('content-type') || 'application/octet-stream'
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
      const contentDisposition = response.headers.get('content-disposition')

      // Extract filename from content-disposition header if available
      let fileName: string | undefined
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1].replace(/['"]/g, '')
        }
      }

      // Get binary data
      const data = await response.arrayBuffer()

      // Create asset data object
      const assetData: AssetData = {
        data,
        contentType,
        contentLength: contentLength || data.byteLength,
        fileName,
        assetId
      }

      // Cache the result if caching is enabled
      // Note: We convert ArrayBuffer to base64 for caching since ArrayBuffer cannot be JSON serialized
      if (cacheKey && useCache) {
        const cacheableData = {
          ...assetData,
          data: this.arrayBufferToBase64(data)
        }
        await this.cache.set(cacheKey, cacheableData, cacheTtl)
      }

      return assetData

    } catch (error) {
      // Re-throw any VibeCMSError instances
      throw error
    }
  }

  /**
   * Make a raw HTTP request for asset data.
   * This is a private method that handles the low-level HTTP request.
   */
  private async makeAssetRequest(endpoint: string): Promise<Response> {
    // Use fetch directly for binary data to avoid JSON parsing
    const baseUrl = this.fetcher['baseUrl']
    const url = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': '*/*', // Accept any content type for assets
      },
    })

    if (!response.ok) {
      // Handle error responses
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`

      try {
        const errorText = await response.text()
        if (errorText) {
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.detail) {
              errorMessage = errorData.detail
            } else if (errorData.message) {
              errorMessage = errorData.message
            }
          } catch {
            // If not JSON, use raw text
            errorMessage = errorText
          }
        }
      } catch {
        // Use default error message
      }

      throw new Error(`VMS SDK Asset Error: ${errorMessage}`)
    }

    return response
  }

  /**
   * Clear asset cache for this project.
   * Removes all cached asset data.
   */
  async clearAssetCache(): Promise<void> {
    try {
      const keys = await this.getAssetCacheKeys()
      for (const key of keys) {
        await this.cache.remove(key)
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Get all asset cache keys for this project.
   */
  private async getAssetCacheKeys(): Promise<string[]> {
    try {
      // Access storage through cache instance
      const storage = this.cache['storage'] // Access private property
      const allKeys = storage.keys()
      const assetPrefix = `vms:${this.projectId}:${this.locale}:asset:`
      return allKeys.filter(key => key.startsWith(assetPrefix))
    } catch {
      return []
    }
  }

  /**
   * Convert ArrayBuffer to base64 string for caching.
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const length = bytes.length
    for (let i = 0; i < length; i++) {
      const byte = bytes[i]
      if (byte !== undefined) {
        binary += String.fromCharCode(byte)
      }
    }
    return btoa(binary)
  }

  /**
   * Convert base64 string back to ArrayBuffer.
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }
}