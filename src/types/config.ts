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
  /** Default locale for content requests (BCP 47 format, default: en-US) */
  locale?: string
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
  /** Locale for content requests */
  locale: string
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

/**
 * Validate locale format (BCP 47).
 * Must be 2-20 characters following BCP 47 format (e.g., 'en-US', 'fr', 'zh-CN').
 */
export function validateLocale(locale: string): boolean {
  if (typeof locale !== 'string') {
    return false
  }

  // Check length constraints from API spec
  if (locale.length < 2 || locale.length > 20) {
    return false
  }

  // Basic BCP 47 format validation - allow common variations
  // Primary language: 2-3 lowercase letters (must be lowercase per BCP 47)
  // Optional script: 4 letters starting with uppercase
  // Optional region: 2 letters (usually uppercase) or 3 digits
  // Additional subtags allowed with hyphens
  const bcpPattern = /^[a-z]{2,3}(-[a-zA-Z]{2,4}|-[0-9]{3})?(-[a-zA-Z0-9]{2,8})*$/

  return bcpPattern.test(locale)
}