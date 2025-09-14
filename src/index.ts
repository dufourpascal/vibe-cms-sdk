/**
 * VMS TypeScript SDK - Framework-agnostic content management system client.
 * 
 * @example
 * ```typescript
 * import { createVibeCMS } from '@vibe-cms/sdk'
 * 
 * const cms = createVibeCMS({
 *   projectId: 'your-project-id',
 *   baseUrl: 'https://api.vibe-cms.com' // optional
 * })
 * 
 * // Chainable API for intuitive content queries
 * const firstPost = await cms.collection('blog_posts').first()
 * const recentPosts = await cms.collection('blog_posts').many({ limit: 10 })
 * const allPosts = await cms.collection('blog_posts').all()
 * const postBySlug = await cms.collection('blog_posts').slug('my-post-slug')
 *
 * // Asset management for files and images
 * const imageUrl = cms.asset_url('asset-id', { width: 800, height: 600 })
 * const assetData = await cms.download_asset('asset-id')
 * ```
 */

// Core classes
import { VibeCMSClient } from './core/client.js'
import { BrowserCache } from './core/cache.js'
import { CollectionQuery } from './core/collection.js'
import { CollectionResult } from './core/result.js'
import { Fetcher } from './core/fetcher.js'
import { AssetManager } from './core/asset.js'

// Types
export * from './types/index.js'

// Core class exports (for advanced usage)
export { VibeCMSClient, BrowserCache, CollectionQuery, CollectionResult, Fetcher, AssetManager }

// Main factory function
export { createVibeCMS } from './factory.js'

// Default export for convenience
export { createVibeCMS as default } from './factory.js'

/**
 * Version of the SDK.
 */
export const VERSION = '1.0.0'

/**
 * SDK information.
 */
export const SDK_INFO = {
  name: '@vibe-cms/sdk',
  version: VERSION,
  description: 'Framework-agnostic TypeScript SDK for VMS',
  author: 'VMS Team',
  homepage: 'https://github.com/your-org/vibe-cms/tree/main/packages/sdk',
} as const