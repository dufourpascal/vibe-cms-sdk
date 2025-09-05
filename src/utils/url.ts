/**
 * URL building utilities for VMS SDK.
 */

/**
 * Normalize a URL by ensuring it doesn't end with a slash.
 */
export function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

/**
 * Ensure an endpoint starts with a slash.
 */
export function normalizeEndpoint(endpoint: string): string {
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`
}

/**
 * Build a full URL from base URL and endpoint.
 */
export function buildUrl(baseUrl: string, endpoint: string): string {
  const normalizedBase = normalizeBaseUrl(baseUrl)
  const normalizedEndpoint = normalizeEndpoint(endpoint)
  return `${normalizedBase}${normalizedEndpoint}`
}

/**
 * Build API endpoint for public content.
 */
export function buildPublicApiEndpoint(projectId: string, collectionSlug: string, itemId?: string): string {
  const parts = ['/api/public', projectId, collectionSlug]
  if (itemId) {
    parts.push(itemId)
  }
  return parts.join('/')
}