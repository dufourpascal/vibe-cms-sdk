/**
 * Integration test configuration for different environments.
 *
 * Supports: local, dev, staging, prod
 * Configure via TEST_ENV environment variable (defaults to 'local')
 */

export type TestEnvironment = 'local' | 'dev' | 'staging' | 'prod'

export interface EnvironmentConfig {
  name: string
  baseUrl: string
  projectId: string
  assets: {
    // Test asset IDs for different purposes
    image: string      // A valid image asset
    document?: string  // A document asset (PDF, etc.)
    video?: string     // A video asset
  }
  collections: {
    faq: string
    blogPost: string
    landingPage: string
  }
  timeout: number // Request timeout in ms
}

/**
 * Environment configurations.
 *
 * Priority order for projectId and asset IDs:
 * 1. CLI arguments: PROJECT_ID and ASSET_ID (set via run.js wrapper)
 * 2. Environment-specific vars: VIBE_{ENV}_PROJECT_ID and VIBE_{ENV}_ASSET_IMAGE
 * 3. Empty string (triggers "not configured" skip)
 *
 * Other settings can be overridden via environment variables (see .env.test.example)
 */
const environments: Record<TestEnvironment, EnvironmentConfig> = {
  local: {
    name: 'Local Development',
    baseUrl: process.env.VIBE_LOCAL_BASE_URL || 'http://localhost:8000',
    projectId: process.env.PROJECT_ID || process.env.VIBE_LOCAL_PROJECT_ID || '',
    assets: {
      image: process.env.ASSET_ID || process.env.VIBE_LOCAL_ASSET_IMAGE || '',
    },
    collections: {
      faq: process.env.VIBE_LOCAL_COLLECTION_FAQ || 'faq',
      blogPost: process.env.VIBE_LOCAL_COLLECTION_BLOG || 'blog-post',
      landingPage: process.env.VIBE_LOCAL_COLLECTION_LANDING || 'landing-page',
    },
    timeout: 10000,
  },

  dev: {
    name: 'Deployed Development',
    baseUrl: process.env.VIBE_DEV_BASE_URL || 'https://dev-api.vibe-cms.com',
    projectId: process.env.PROJECT_ID || process.env.VIBE_DEV_PROJECT_ID || '',
    assets: {
      image: process.env.ASSET_ID || process.env.VIBE_DEV_ASSET_IMAGE || '',
    },
    collections: {
      faq: process.env.VIBE_DEV_COLLECTION_FAQ || 'faq',
      blogPost: process.env.VIBE_DEV_COLLECTION_BLOG || 'blog-post',
      landingPage: process.env.VIBE_DEV_COLLECTION_LANDING || 'landing-page',
    },
    timeout: 15000,
  },

  staging: {
    name: 'Staging',
    baseUrl: process.env.VIBE_STAGING_BASE_URL || 'https://staging-api.vibe-cms.com',
    projectId: process.env.PROJECT_ID || process.env.VIBE_STAGING_PROJECT_ID || '',
    assets: {
      image: process.env.ASSET_ID || process.env.VIBE_STAGING_ASSET_IMAGE || '',
    },
    collections: {
      faq: process.env.VIBE_STAGING_COLLECTION_FAQ || 'faq',
      blogPost: process.env.VIBE_STAGING_COLLECTION_BLOG || 'blog-post',
      landingPage: process.env.VIBE_STAGING_COLLECTION_LANDING || 'landing-page',
    },
    timeout: 15000,
  },

  prod: {
    name: 'Production',
    baseUrl: process.env.VIBE_PROD_BASE_URL || 'https://api.vibe-cms.com',
    projectId: process.env.PROJECT_ID || process.env.VIBE_PROD_PROJECT_ID || '',
    assets: {
      image: process.env.ASSET_ID || process.env.VIBE_PROD_ASSET_IMAGE || '',
    },
    collections: {
      faq: process.env.VIBE_PROD_COLLECTION_FAQ || 'faq',
      blogPost: process.env.VIBE_PROD_COLLECTION_BLOG || 'blog-post',
      landingPage: process.env.VIBE_PROD_COLLECTION_LANDING || 'landing-page',
    },
    timeout: 20000,
  },
}

/**
 * Get the current test environment from TEST_ENV variable.
 * Defaults to 'local' if not set or invalid.
 */
export function getTestEnvironment(): TestEnvironment {
  const envName = process.env.TEST_ENV?.toLowerCase()

  if (envName && envName in environments) {
    return envName as TestEnvironment
  }

  return 'local'
}

/**
 * Get configuration for the current test environment.
 */
export function getConfig(): EnvironmentConfig {
  const env = getTestEnvironment()
  return environments[env]
}

/**
 * Check if the current environment is configured and ready for testing.
 * Returns false if required fields (projectId, asset IDs) are missing.
 */
export function isEnvironmentConfigured(): boolean {
  const config = getConfig()

  // Check required fields
  if (!config.projectId || config.projectId === '') {
    return false
  }

  if (!config.assets.image || config.assets.image === '') {
    return false
  }

  return true
}

/**
 * Get a descriptive message about the current environment configuration.
 */
export function getEnvironmentInfo(): string {
  const env = getTestEnvironment()
  const config = getConfig()

  return `Testing against: ${config.name} (${config.baseUrl})\nProject ID: ${config.projectId}`
}

/**
 * Helper to skip tests if environment is not configured.
 * Use with describe.skipIf() or test.skipIf()
 */
export const skipIfNotConfigured = !isEnvironmentConfigured()
