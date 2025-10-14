/**
 * TypeScript types for VMS Public API responses.
 * These types match the actual API structure from /openapi.json
 */

/**
 * Public content item model - returns only essential data for consumers.
 *
 * The API returns a simplified structure focused on the actual content:
 * - No status field (all public API items are implicitly published)
 * - No timestamps (not needed for content consumption)
 * - No metadata wrapper (metadata is in the data object if needed)
 */
export interface PublicContentItem {
  /** Content item ID */
  id: string
  /** Content data based on collection fields */
  data: Record<string, any>
  /** Actual locale used (accounts for fallback chain) */
  locale: string
}

/**
 * Standard error response model for public API.
 */
export interface PublicErrorResponse {
  /** Error message */
  detail: string
  /** HTTP status code */
  status_code: number
}

/**
 * Not found error response for public API.
 */
export interface PublicNotFoundResponse {
  /** Error message */
  detail: string
  /** HTTP status code (always 404) */
  status_code: 404
}

/**
 * Options for asset URL generation and downloading.
 */
export interface AssetUrlOptions {
  /** Image variant/format (e.g., 'thumbnail', 'medium', 'large') */
  variant?: string
  /** Image width in pixels */
  width?: number
  /** Image height in pixels */
  height?: number
}

/**
 * Options for downloading assets with additional parameters.
 */
export interface DownloadAssetOptions extends AssetUrlOptions {
  /** Whether to use cache for the download (default: true) */
  useCache?: boolean
  /** Custom cache TTL for this asset (default: uses client cache TTL) */
  cacheTtl?: number
}

/**
 * Downloaded asset data structure.
 */
export interface AssetData {
  /** Asset binary data */
  data: ArrayBuffer
  /** Content type (MIME type) */
  contentType: string
  /** Content length in bytes */
  contentLength: number
  /** Asset file name if available */
  fileName?: string | undefined
  /** Asset ID */
  assetId: string
}