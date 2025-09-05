/**
 * Configuration types for the VMS SDK.
 */

/**
 * Cache configuration options.
 */
export interface CacheConfig {
  /** Enable/disable caching (default: true) */
  enabled?: boolean
  /** Cache TTL in milliseconds (default: 300000 = 5 minutes) */
  ttl?: number
  /** Storage type to use (default: localStorage) */
  storage?: 'localStorage' | 'sessionStorage'
}

/**
 * Main configuration for the VMS SDK.
 */
export interface VibeCMSConfig {
  /** Project identifier (required) */
  projectId: string
  /** Base URL for the API (default: https://api.vibe-cms.com) */
  baseUrl?: string
  /** Cache configuration options */
  cache?: CacheConfig
}

/**
 * Internal configuration with defaults applied.
 */
export interface ResolvedVibeCMSConfig {
  /** Project identifier */
  projectId: string
  /** Base URL for the API */
  baseUrl: string
  /** Cache configuration with defaults applied */
  cache: Required<CacheConfig>
}

/**
 * Options for collection queries.
 */
export interface QueryOptions {
  /** Maximum number of items to return */
  limit?: number
}

/**
 * SDK Error class for consistent error handling.
 */
export class VibeCMSError extends Error {
  /** HTTP status code if available */
  public readonly status?: number
  /** Additional error details */
  public readonly details?: any

  constructor(message: string, status?: number, details?: any) {
    super(message)
    this.name = 'VibeCMSError'
    if (status !== undefined) {
      this.status = status
    }
    if (details !== undefined) {
      this.details = details
    }
    
    // Maintains proper stack trace for where error was thrown (V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VibeCMSError)
    }
  }
}