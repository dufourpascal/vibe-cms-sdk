/**
 * Input validation utilities for VMS SDK.
 */

/**
 * Regex pattern for validating project IDs (from backend validation).
 * Must match: ^[a-zA-Z0-9_-]+$
 */
export const PROJECT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

/**
 * Regex pattern for validating collection slugs (from backend validation).
 * Must match: ^[a-z0-9_-]+$ (lowercase only!)
 */
export const COLLECTION_SLUG_PATTERN = /^[a-z0-9_-]+$/

/**
 * Regex pattern for validating item IDs (from backend validation).
 * Must match: ^[a-zA-Z0-9_-]+$
 */
export const ITEM_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

/**
 * Validate project ID format.
 */
export function validateProjectId(projectId: string): { valid: boolean; error?: string } {
  if (!projectId) {
    return { valid: false, error: 'Project ID is required' }
  }

  if (!PROJECT_ID_PATTERN.test(projectId)) {
    return { 
      valid: false, 
      error: 'Invalid project ID format. Must contain only letters, numbers, underscores, and hyphens.' 
    }
  }

  return { valid: true }
}

/**
 * Validate collection slug format.
 */
export function validateCollectionSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug) {
    return { valid: false, error: 'Collection slug is required' }
  }

  if (!COLLECTION_SLUG_PATTERN.test(slug)) {
    return { 
      valid: false, 
      error: 'Invalid collection slug format. Must contain only lowercase letters, numbers, underscores, and hyphens.' 
    }
  }

  return { valid: true }
}

/**
 * Validate item ID format.
 */
export function validateItemId(itemId: string): { valid: boolean; error?: string } {
  if (!itemId) {
    return { valid: false, error: 'Item ID is required' }
  }

  if (!ITEM_ID_PATTERN.test(itemId)) {
    return { 
      valid: false, 
      error: 'Invalid item ID format. Must contain only letters, numbers, underscores, and hyphens.' 
    }
  }

  return { valid: true }
}

/**
 * Validate base URL format.
 */
export function validateBaseUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'Base URL is required' }
  }

  try {
    new URL(url)
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid base URL format' }
  }
}