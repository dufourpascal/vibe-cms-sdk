/**
 * Factory function for creating VibeCMS client instances.
 */

import type { VibeCMSConfig } from './types/config.js'
import { VibeCMSClient } from './core/client.js'

/**
 * Create a new VibeCMS client instance.
 * 
 * @param config - Configuration options for the client
 * @returns VibeCMSClient instance
 * 
 * @example
 * ```typescript
 * const cms = createVibeCMS({
 *   projectId: 'your-project-id',
 *   baseUrl: 'https://api.vibe-cms.com', // optional
 *   cache: {
 *     enabled: true,
 *     ttl: 300000, // 5 minutes
 *     storage: 'localStorage'
 *   }
 * })
 * 
 * // Use the client
 * const posts = await cms.collection('blog_posts').all()
 * ```
 */
export function createVibeCMS(config: VibeCMSConfig): VibeCMSClient {
  return new VibeCMSClient(config)
}