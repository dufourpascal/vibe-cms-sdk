/**
 * TypeScript types for VMS Public API responses.
 * These types exactly match the backend models in backend/app/models/public_content.py
 */

/**
 * Public content item model without sensitive internal metadata.
 * Always published content only (no drafts or archived content).
 */
export interface PublicContentItem {
  /** Content item ID */
  id: string
  /** Content status - always "published" for public API */
  status: 'published'
  /** Content data based on collection fields */
  data: Record<string, any>
  /** Public metadata (SEO, publishing info, etc.) */
  metadata: Record<string, any>
  /** Content creation timestamp in ISO format */
  created_at: string
  /** Content last update timestamp in ISO format */
  updated_at: string
}

/**
 * Public collection information for API responses.
 */
export interface PublicCollection {
  /** URL-friendly collection identifier */
  slug: string
  /** Collection display name */
  name: string
  /** Collection description (optional) */
  description?: string
  /** Whether this collection has only one item */
  is_singleton: boolean
}

/**
 * Response model for single published content item with context.
 */
export interface PublicContentResponse {
  /** The content item */
  content: PublicContentItem
  /** Collection information */
  collection: PublicCollection
  /** Project identifier */
  project_id: string
}

/**
 * Response model for listing published content items.
 */
export interface PublicContentListResponse {
  /** List of content items */
  items: PublicContentItem[]
  /** Collection information */
  collection: PublicCollection
  /** Project identifier */
  project_id: string
  /** Total number of published items */
  total: number
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