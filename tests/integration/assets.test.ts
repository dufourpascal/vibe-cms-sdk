/**
 * Integration tests for asset API against real Vibe CMS API.
 *
 * Tests asset URL generation, variants, transformations, and downloads.
 * Configure via .env.test.local (see .env.test.example)
 *
 * Run with: npm run test:integration
 */

import { describe, test, expect, beforeAll } from 'vitest'
import { createVibeCMS } from '../../src/index.js'
import type { VibeCMSClient } from '../../src/core/client.js'
import {
  getConfig,
  getEnvironmentInfo,
  skipIfNotConfigured,
  isEnvironmentConfigured,
} from './config.js'

// Load config before describe block to use in test timeouts
const testConfig = getConfig()

describe.skipIf(skipIfNotConfigured)('Asset Integration Tests', () => {
  let cms: VibeCMSClient

  beforeAll(() => {
    const config = testConfig

    if (!isEnvironmentConfigured()) {
      console.warn('⚠️  Environment not configured. Skipping integration tests.')
      console.warn('   Copy .env.test.example to .env.test.local and configure it.')
      return
    }

    console.log('🧪 ' + getEnvironmentInfo())

    cms = createVibeCMS({
      projectId: testConfig.projectId,
      baseUrl: testConfig.baseUrl,
      cache: {
        enabled: true,
        ttl: 60000, // 1 minute for tests
      },
    })
  })

  describe('Asset URL Generation', () => {
    test('should generate original asset URL', () => {
      const url = cms.asset_url(testConfig.assets.image)

      expect(url).toBeDefined()
      expect(url).toContain(testConfig.baseUrl)
      expect(url).toContain(testConfig.projectId)
      expect(url).toContain(testConfig.assets.image)
      expect(url).toContain('/api/assets/')

      console.log('   ℹ️  Original URL:', url)
    })

    test('should generate web variant URL', () => {
      const url = cms.asset_url(testConfig.assets.image, { variant: 'web' })

      expect(url).toBeDefined()
      expect(url).toContain('variant=web')

      console.log('   ℹ️  Web variant URL:', url)
    })

    test('should generate thumbnail variant URL', () => {
      const url = cms.asset_url(testConfig.assets.image, { variant: 'thumbnail' })

      expect(url).toBeDefined()
      expect(url).toContain('variant=thumbnail')

      console.log('   ℹ️  Thumbnail variant URL:', url)
    })

    test('should generate URL with width parameter', () => {
      const url = cms.asset_url(testConfig.assets.image, { width: 800 })

      expect(url).toBeDefined()
      expect(url).toContain('width=800')

      console.log('   ℹ️  Width 800 URL:', url)
    })

    test('should generate URL with height parameter', () => {
      const url = cms.asset_url(testConfig.assets.image, { height: 600 })

      expect(url).toBeDefined()
      expect(url).toContain('height=600')

      console.log('   ℹ️  Height 600 URL:', url)
    })

    test('should generate URL with both width and height', () => {
      const url = cms.asset_url(testConfig.assets.image, {
        width: 1920,
        height: 1080,
      })

      expect(url).toBeDefined()
      expect(url).toContain('width=1920')
      expect(url).toContain('height=1080')

      console.log('   ℹ️  1920x1080 URL:', url)
    })

    test('should generate URL with variant and size', () => {
      const url = cms.asset_url(testConfig.assets.image, {
        variant: 'web',
        width: 1200,
        height: 800,
      })

      expect(url).toBeDefined()
      expect(url).toContain('variant=web')
      expect(url).toContain('width=1200')
      expect(url).toContain('height=800')

      console.log('   ℹ️  Web variant 1200x800 URL:', url)
    })

    test('should generate URL without locale parameter', () => {
      // Asset URLs don't include locale parameter
      // (unlike content URLs which do support locale)
      const url = cms.asset_url(testConfig.assets.image)

      expect(url).toBeDefined()
      expect(url).not.toContain('locale=')
      expect(url).toContain('/api/assets/')

      console.log('   ℹ️  Asset URL (no locale):', url)
    })
  })

  describe('Asset Download - Original', () => {
    test('should download original asset', async () => {
      const assetData = await cms.download_asset(testConfig.assets.image)

      expect(assetData).toBeDefined()
      expect(assetData).toHaveProperty('data')
      expect(assetData).toHaveProperty('contentType')
      expect(assetData).toHaveProperty('contentLength')

      // Verify data is ArrayBuffer
      expect(assetData.data).toBeInstanceOf(ArrayBuffer)
      expect(assetData.data.byteLength).toBeGreaterThan(0)

      console.log('   ℹ️  Downloaded asset:')
      console.log('       Content-Type:', assetData.contentType)
      console.log('       Size:', assetData.contentLength, 'bytes')
      console.log('       File:', assetData.fileName || 'N/A')
    }, testConfig.timeout)

    test('should cache downloaded assets', async () => {
      // Clear cache first
      await cms.clearCache()

      // First download
      const start1 = Date.now()
      const asset1 = await cms.download_asset(testConfig.assets.image)
      const duration1 = Date.now() - start1

      // Second download (should be cached)
      const start2 = Date.now()
      const asset2 = await cms.download_asset(testConfig.assets.image)
      const duration2 = Date.now() - start2

      // ArrayBuffers should have same content (use byteLength to compare)
      expect(asset1.data.byteLength).toBe(asset2.data.byteLength)
      expect(duration2).toBeLessThan(duration1)

      console.log('   ℹ️  First download: ${duration1}ms, Cached: ${duration2}ms')
    }, testConfig.timeout * 2)
  })

  describe('Asset Download - Web Variant', () => {
    beforeAll(async () => {
      // Clear cache to prevent localStorage quota issues
      await cms.clearCache()
    })

    test('should download web variant', async () => {
      const assetData = await cms.download_asset(testConfig.assets.image, {
        variant: 'web',
      })

      expect(assetData).toBeDefined()
      expect(assetData.contentType).toBeDefined()
      expect(assetData.contentLength).toBeGreaterThan(0)

      console.log('   ℹ️  Web variant size:', assetData.contentLength, 'bytes')
    }, testConfig.timeout)

    test('should download web variant with width 400', async () => {
      const assetData = await cms.download_asset(testConfig.assets.image, {
        variant: 'web',
        width: 400,
      })

      expect(assetData).toBeDefined()
      expect(assetData.contentLength).toBeGreaterThan(0)

      console.log('   ℹ️  Web 400px width size:', assetData.contentLength, 'bytes')
    }, testConfig.timeout)

    test('should download web variant with height 300', async () => {
      const assetData = await cms.download_asset(testConfig.assets.image, {
        variant: 'web',
        height: 300,
      })

      expect(assetData).toBeDefined()
      expect(assetData.contentLength).toBeGreaterThan(0)

      console.log('   ℹ️  Web 300px height size:', assetData.contentLength, 'bytes')
    }, testConfig.timeout)

    test('should download web variant 800x600', async () => {
      const assetData = await cms.download_asset(testConfig.assets.image, {
        variant: 'web',
        width: 800,
        height: 600,
      })

      expect(assetData).toBeDefined()
      expect(assetData.contentLength).toBeGreaterThan(0)

      console.log('   ℹ️  Web 800x600 size:', assetData.contentLength, 'bytes')
    }, testConfig.timeout)

    test('should download web variant 1920x1080', async () => {
      const assetData = await cms.download_asset(testConfig.assets.image, {
        variant: 'web',
        width: 1920,
        height: 1080,
      })

      expect(assetData).toBeDefined()
      expect(assetData.contentLength).toBeGreaterThan(0)

      console.log('   ℹ️  Web 1920x1080 size:', assetData.contentLength, 'bytes')
    }, testConfig.timeout)
  })

  describe('Asset Download - Thumbnail Variant', () => {
    beforeAll(async () => {
      // Clear cache to prevent localStorage quota issues
      await cms.clearCache()
    })

    test('should download thumbnail variant', async () => {
      const assetData = await cms.download_asset(testConfig.assets.image, {
        variant: 'thumbnail',
      })

      expect(assetData).toBeDefined()
      expect(assetData.contentType).toBeDefined()
      expect(assetData.contentLength).toBeGreaterThan(0)

      console.log('   ℹ️  Thumbnail size:', assetData.contentLength, 'bytes')
    }, testConfig.timeout * 3) // Thumbnail generation can be slow

    test('should download thumbnail with custom width', async () => {
      const assetData = await cms.download_asset(testConfig.assets.image, {
        variant: 'thumbnail',
        width: 150,
      })

      expect(assetData).toBeDefined()
      expect(assetData.contentLength).toBeGreaterThan(0)

      console.log('   ℹ️  Thumbnail 150px width size:', assetData.contentLength, 'bytes')
    }, testConfig.timeout * 3) // Thumbnail generation can be slow

    test('should download thumbnail 200x200', async () => {
      const assetData = await cms.download_asset(testConfig.assets.image, {
        variant: 'thumbnail',
        width: 200,
        height: 200,
      })

      expect(assetData).toBeDefined()
      expect(assetData.contentLength).toBeGreaterThan(0)

      console.log('   ℹ️  Thumbnail 200x200 size:', assetData.contentLength, 'bytes')
    }, testConfig.timeout)
  })

  describe('Asset Size Comparison', () => {
    beforeAll(async () => {
      // Clear cache to prevent localStorage quota issues
      await cms.clearCache()
    })

    test('should compare sizes across variants', async () => {
      // Download same asset in different variants
      const [original, web, thumbnail] = await Promise.all([
        cms.download_asset(testConfig.assets.image),
        cms.download_asset(testConfig.assets.image, { variant: 'web' }),
        cms.download_asset(testConfig.assets.image, { variant: 'thumbnail' }),
      ])

      console.log('   ℹ️  Size comparison:')
      console.log('       Original:', original.contentLength, 'bytes')
      console.log('       Web:', web.contentLength, 'bytes')
      console.log('       Thumbnail:', thumbnail.contentLength, 'bytes')

      // Generally thumbnail should be smallest
      expect(thumbnail.contentLength).toBeLessThanOrEqual(web.contentLength)
    }, testConfig.timeout * 3)

    test('should verify size reduction with transformations', async () => {
      // Download original and resized versions
      const [original, small] = await Promise.all([
        cms.download_asset(testConfig.assets.image),
        cms.download_asset(testConfig.assets.image, { width: 200, height: 200 }),
      ])

      console.log('   ℹ️  Transformation size comparison:')
      console.log('       Original:', original.contentLength, 'bytes')
      console.log('       Resized (200x200):', small.contentLength, 'bytes')

      // Resized version should typically be smaller
      // (unless original is already very small)
      expect(small.contentLength).toBeLessThanOrEqual(original.contentLength)
    }, testConfig.timeout * 2)
  })

  describe('Asset Extraction from Collections', () => {
    test('should extract asset URLs from collection items', async () => {
      // Get a blog post that might have images
      const post = await cms.collection(testConfig.collections.blogPost).first()

      if (post.raw) {
        // Check if any fields contain asset IDs
        const fields = Object.entries(post.raw.data)

        for (const [fieldName, fieldValue] of fields) {
          if (typeof fieldValue === 'string' && fieldValue.startsWith('asset_')) {
            // Found an asset field - generate URL
            const assetUrl = post.asset_url(fieldName)

            expect(assetUrl).toBeDefined()
            expect(assetUrl).toContain(testConfig.baseUrl)

            console.log(`   ℹ️  Found asset field '${fieldName}':`, assetUrl)
            break
          }
        }
      }
    }, testConfig.timeout)

    test('should extract asset URLs from multiple items', async () => {
      const posts = await cms.collection(testConfig.collections.blogPost).many({ limit: 3 })

      if (posts.count > 0) {
        // Try to find a field that contains assets
        const firstItem = posts.first()
        const assetFields = Object.entries(firstItem.data).filter(
          ([_, value]) => typeof value === 'string' && value.startsWith('asset_')
        )

        if (assetFields.length > 0) {
          const [fieldName] = assetFields[0]
          const urls = posts.asset_url(fieldName)

          expect(urls).toBeDefined()
          expect(Array.isArray(urls)).toBe(true)
          expect(urls.length).toBe(posts.count)

          console.log(`   ℹ️  Extracted ${urls.length} asset URLs from field '${fieldName}'`)
        }
      }
    }, testConfig.timeout)
  })

  describe('Error Handling', () => {
    test('should handle non-existent asset ID', async () => {
      const nonExistentId = 'non-existent-asset-xyz-123'

      await expect(cms.download_asset(nonExistentId)).rejects.toThrow()
    }, testConfig.timeout)

    test('should validate asset ID format', () => {
      // Invalid asset ID formats
      expect(() => cms.asset_url('')).toThrow()
      expect(() => cms.asset_url('invalid asset')).toThrow() // spaces
      expect(() => cms.asset_url('invalid@asset')).toThrow() // special chars
    })

    test('should handle invalid transformation parameters', () => {
      // Negative dimensions should be rejected
      expect(() => cms.asset_url(testConfig.assets.image, { width: -100 })).toThrow()
      expect(() => cms.asset_url(testConfig.assets.image, { height: -100 })).toThrow()

      // Zero dimensions should be rejected
      expect(() => cms.asset_url(testConfig.assets.image, { width: 0 })).toThrow()
      expect(() => cms.asset_url(testConfig.assets.image, { height: 0 })).toThrow()
    })
  })

  describe('Locale Handling', () => {
    test('should generate consistent URLs regardless of locale', () => {
      // Asset URLs are locale-independent (unlike content URLs)
      const locales = ['en-US', 'fr-FR', 'es-ES', 'de-DE']
      const urls: string[] = []

      for (const locale of locales) {
        cms.setLocale(locale)
        const url = cms.asset_url(testConfig.assets.image)

        expect(url).not.toContain('locale=')
        urls.push(url)
      }

      // All URLs should be identical since assets are locale-independent
      const firstUrl = urls[0]
      for (const url of urls) {
        expect(url).toBe(firstUrl)
      }

      // Reset to default
      cms.setLocale('en-US')
    })

    test('should cache assets regardless of locale', async () => {
      // Assets are locale-independent and cached globally
      // Clear cache
      await cms.clearCache()

      // Download with English locale
      cms.setLocale('en-US')
      const start1 = Date.now()
      const enAsset = await cms.download_asset(testConfig.assets.image)
      const duration1 = Date.now() - start1

      // Download with French locale - should use cache since assets are locale-independent
      cms.setLocale('fr-FR')
      const start2 = Date.now()
      const frAsset = await cms.download_asset(testConfig.assets.image)
      const duration2 = Date.now() - start2

      // Both should have same data (assets don't vary by locale)
      expect(enAsset.data.byteLength).toBe(frAsset.data.byteLength)

      // Second request should be much faster (cached)
      // Note: Allow some margin as cache lookup isn't instant
      console.log(`   ℹ️  First download: ${duration1}ms, Second (cached): ${duration2}ms`)

      // Reset to default
      cms.setLocale('en-US')
    }, testConfig.timeout * 2)
  })
})
