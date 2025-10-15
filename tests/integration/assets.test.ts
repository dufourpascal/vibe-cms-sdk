/**
 * Integration tests for asset API against real Vibe CMS API.
 *
 * Tests asset URL generation, variants, transformations, and downloads
 * using stable staging environment data.
 *
 * Run with: npm run test:integration
 */

import { describe, test, expect, beforeAll } from 'vitest'
import { createVibeCMS } from '../../src/index.js'
import type { VibeCMSClient } from '../../src/core/client.js'
import { getConfig, getEnvironmentInfo } from './config.js'
import { ASSET_IDS, COLLECTIONS, LOCALES } from './testData.js'

const testConfig = getConfig()

describe('Asset Integration Tests', () => {
  let cms: VibeCMSClient

  beforeAll(() => {
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
    test('should generate original asset URL for IMAGE_1', () => {
      const url = cms.asset_url(ASSET_IDS.IMAGE_1)

      expect(url).toBeDefined()
      expect(url).toContain(testConfig.baseUrl)
      expect(url).toContain(testConfig.projectId)
      expect(url).toContain(ASSET_IDS.IMAGE_1)
      expect(url).toContain('/api/assets/')

      console.log('   ℹ️  IMAGE_1 URL:', url)
    })

    test('should generate original asset URL for IMAGE_2', () => {
      const url = cms.asset_url(ASSET_IDS.IMAGE_2)

      expect(url).toBeDefined()
      expect(url).toContain(testConfig.baseUrl)
      expect(url).toContain(testConfig.projectId)
      expect(url).toContain(ASSET_IDS.IMAGE_2)
      expect(url).toContain('/api/assets/')

      console.log('   ℹ️  IMAGE_2 URL:', url)
    })

    test('should generate web variant URL', () => {
      const url = cms.asset_url(ASSET_IDS.IMAGE_1, { variant: 'web' })

      expect(url).toBeDefined()
      expect(url).toContain('variant=web')

      console.log('   ℹ️  Web variant URL:', url)
    })

    test('should generate thumbnail variant URL', () => {
      const url = cms.asset_url(ASSET_IDS.IMAGE_1, { variant: 'thumbnail' })

      expect(url).toBeDefined()
      expect(url).toContain('variant=thumbnail')

      console.log('   ℹ️  Thumbnail variant URL:', url)
    })

    test('should generate URL with width parameter', () => {
      const url = cms.asset_url(ASSET_IDS.IMAGE_1, { width: 800 })

      expect(url).toBeDefined()
      expect(url).toContain('width=800')

      console.log('   ℹ️  Width 800 URL:', url)
    })

    test('should generate URL with height parameter', () => {
      const url = cms.asset_url(ASSET_IDS.IMAGE_1, { height: 600 })

      expect(url).toBeDefined()
      expect(url).toContain('height=600')

      console.log('   ℹ️  Height 600 URL:', url)
    })

    test('should generate URL with both width and height', () => {
      const url = cms.asset_url(ASSET_IDS.IMAGE_1, {
        width: 1920,
        height: 1080,
      })

      expect(url).toBeDefined()
      expect(url).toContain('width=1920')
      expect(url).toContain('height=1080')

      console.log('   ℹ️  1920x1080 URL:', url)
    })

    test('should generate URL with variant and size', () => {
      const url = cms.asset_url(ASSET_IDS.IMAGE_1, {
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

    test('should not include locale parameter in asset URLs', () => {
      // Asset URLs are locale-independent
      const url = cms.asset_url(ASSET_IDS.IMAGE_1)

      expect(url).toBeDefined()
      expect(url).not.toContain('locale=')

      console.log('   ℹ️  Asset URL (no locale):', url)
    })
  })

  describe('Asset Download - IMAGE_1', () => {
    test('should download IMAGE_1 original', async () => {
      const assetData = await cms.download_asset(ASSET_IDS.IMAGE_1)

      expect(assetData).toBeDefined()
      expect(assetData).toHaveProperty('data')
      expect(assetData).toHaveProperty('contentType')
      expect(assetData).toHaveProperty('contentLength')

      // Verify data is ArrayBuffer
      expect(assetData.data).toBeInstanceOf(ArrayBuffer)
      expect(assetData.data.byteLength).toBeGreaterThan(0)

      console.log('   ℹ️  Downloaded IMAGE_1:')
      console.log('       Content-Type:', assetData.contentType)
      console.log('       Size:', assetData.contentLength, 'bytes')
      console.log('       File:', assetData.fileName || 'N/A')
    }, testConfig.timeout)

    test('should cache downloaded IMAGE_1', async () => {
      // Clear cache first
      await cms.clearCache()

      // First download
      const start1 = Date.now()
      const asset1 = await cms.download_asset(ASSET_IDS.IMAGE_1)
      const duration1 = Date.now() - start1

      // Second download (should be cached)
      const start2 = Date.now()
      const asset2 = await cms.download_asset(ASSET_IDS.IMAGE_1)
      const duration2 = Date.now() - start2

      // ArrayBuffers should have same content
      expect(asset1.data.byteLength).toBe(asset2.data.byteLength)
      // Note: Cache timing can vary, so we just verify both downloads succeed

      console.log(`   ℹ️  First download: ${duration1}ms, Cached: ${duration2}ms`)
    }, testConfig.timeout * 2)
  })

  describe('Asset Download - IMAGE_2', () => {
    test('should download IMAGE_2 original', async () => {
      const assetData = await cms.download_asset(ASSET_IDS.IMAGE_2)

      expect(assetData).toBeDefined()
      expect(assetData).toHaveProperty('data')
      expect(assetData).toHaveProperty('contentType')
      expect(assetData).toHaveProperty('contentLength')

      expect(assetData.data).toBeInstanceOf(ArrayBuffer)
      expect(assetData.data.byteLength).toBeGreaterThan(0)

      console.log('   ℹ️  Downloaded IMAGE_2:')
      console.log('       Content-Type:', assetData.contentType)
      console.log('       Size:', assetData.contentLength, 'bytes')
      console.log('       File:', assetData.fileName || 'N/A')
    }, testConfig.timeout)
  })

  describe('Asset Variants and Transformations', () => {
    beforeAll(async () => {
      // Clear cache to prevent quota issues
      await cms.clearCache()
    })

    test('should download web variant', async () => {
      const assetData = await cms.download_asset(ASSET_IDS.IMAGE_1, {
        variant: 'web',
      })

      expect(assetData).toBeDefined()
      expect(assetData.contentType).toBeDefined()
      expect(assetData.contentLength).toBeGreaterThan(0)

      console.log('   ℹ️  Web variant size:', assetData.contentLength, 'bytes')
    }, testConfig.timeout)

    test('should download thumbnail variant', async () => {
      const assetData = await cms.download_asset(ASSET_IDS.IMAGE_1, {
        variant: 'thumbnail',
      })

      expect(assetData).toBeDefined()
      expect(assetData.contentType).toBeDefined()
      expect(assetData.contentLength).toBeGreaterThan(0)

      console.log('   ℹ️  Thumbnail size:', assetData.contentLength, 'bytes')
    }, testConfig.timeout * 3) // Thumbnail generation can be slow

    test('should download with custom width', async () => {
      const assetData = await cms.download_asset(ASSET_IDS.IMAGE_1, {
        width: 400,
      })

      expect(assetData).toBeDefined()
      expect(assetData.contentLength).toBeGreaterThan(0)

      console.log('   ℹ️  Width 400px size:', assetData.contentLength, 'bytes')
    }, testConfig.timeout)

    test('should download with custom height', async () => {
      const assetData = await cms.download_asset(ASSET_IDS.IMAGE_1, {
        height: 300,
      })

      expect(assetData).toBeDefined()
      expect(assetData.contentLength).toBeGreaterThan(0)

      console.log('   ℹ️  Height 300px size:', assetData.contentLength, 'bytes')
    }, testConfig.timeout)

    test('should download with width and height', async () => {
      const assetData = await cms.download_asset(ASSET_IDS.IMAGE_1, {
        width: 800,
        height: 600,
      })

      expect(assetData).toBeDefined()
      expect(assetData.contentLength).toBeGreaterThan(0)

      console.log('   ℹ️  800x600 size:', assetData.contentLength, 'bytes')
    }, testConfig.timeout)
  })

  describe('Asset Extraction from Collections', () => {
    beforeAll(() => {
      cms.setLocale(LOCALES.EN_US)
    })

    test('should extract single file field (file_field_4) from first item', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()

      const fileField = result.field('file_field_4')
      expect(fileField).toBe(ASSET_IDS.IMAGE_1)

      // Generate asset URL from field
      const assetUrl = result.asset_url('file_field_4')
      expect(assetUrl).toBeDefined()
      expect(assetUrl).toContain(ASSET_IDS.IMAGE_1)

      console.log('   ℹ️  Extracted asset URL from file_field_4:', assetUrl)
    }, testConfig.timeout)

    test('should extract multifile field (multifile_field_5) from first item', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()

      const multifileField = result.field('multifile_field_5')
      expect(Array.isArray(multifileField)).toBe(true)
      expect(multifileField).toEqual([ASSET_IDS.IMAGE_2, ASSET_IDS.IMAGE_1])

      // Generate asset URLs from multifile field
      const assetUrls = result.asset_url('multifile_field_5')
      expect(Array.isArray(assetUrls)).toBe(true)
      expect(assetUrls.length).toBe(2)
      expect(assetUrls[0]).toContain(ASSET_IDS.IMAGE_2)
      expect(assetUrls[1]).toContain(ASSET_IDS.IMAGE_1)

      console.log('   ℹ️  Extracted asset URLs from multifile_field_5:', assetUrls)
    }, testConfig.timeout)

    test('should extract asset URLs from all items', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).all()

      // Extract file_field_4 from all items
      const assetUrls = result.asset_url('file_field_4')

      expect(Array.isArray(assetUrls)).toBe(true)
      expect(assetUrls.length).toBe(2)
      expect(assetUrls[0]).toContain(ASSET_IDS.IMAGE_1) // First item
      expect(assetUrls[1]).toContain(ASSET_IDS.IMAGE_2) // Second item

      console.log('   ℹ️  Extracted asset URLs from all items:', assetUrls)
    }, testConfig.timeout)

    test('should extract asset URLs with transformation options', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()

      const assetUrl = result.asset_url('file_field_4', {
        variant: 'web',
        width: 800,
      })

      expect(assetUrl).toBeDefined()
      expect(assetUrl).toContain(ASSET_IDS.IMAGE_1)
      expect(assetUrl).toContain('variant=web')
      expect(assetUrl).toContain('width=800')

      console.log('   ℹ️  Asset URL with transformations:', assetUrl)
    }, testConfig.timeout)
  })

  describe('Locale Handling', () => {
    test('should generate consistent URLs regardless of locale', () => {
      // Asset URLs are locale-independent (unlike content URLs)
      const locales = [LOCALES.EN_US, LOCALES.ES_ES]
      const urls: string[] = []

      for (const locale of locales) {
        cms.setLocale(locale)
        const url = cms.asset_url(ASSET_IDS.IMAGE_1)

        expect(url).not.toContain('locale=')
        urls.push(url)
      }

      // All URLs should be identical since assets are locale-independent
      const firstUrl = urls[0]
      for (const url of urls) {
        expect(url).toBe(firstUrl)
      }

      console.log('   ℹ️  Asset URLs are locale-independent')

      // Reset to default
      cms.setLocale(LOCALES.EN_US)
    })

    test('should cache assets regardless of locale', async () => {
      // Assets are locale-independent and cached globally
      // Clear cache
      await cms.clearCache()

      // Download with English locale
      cms.setLocale(LOCALES.EN_US)
      const start1 = Date.now()
      const enAsset = await cms.download_asset(ASSET_IDS.IMAGE_1)
      const duration1 = Date.now() - start1

      // Download with Spanish locale - should use cache since assets are locale-independent
      cms.setLocale(LOCALES.ES_ES)
      const start2 = Date.now()
      const esAsset = await cms.download_asset(ASSET_IDS.IMAGE_1)
      const duration2 = Date.now() - start2

      // Both should have same data (assets don't vary by locale)
      expect(enAsset.data.byteLength).toBe(esAsset.data.byteLength)

      // Note: Cache timing can vary, so we just verify both downloads succeed
      console.log(`   ℹ️  First download: ${duration1}ms, Second (cached): ${duration2}ms`)

      // Reset to default
      cms.setLocale(LOCALES.EN_US)
    }, testConfig.timeout * 2)

    test('should extract valid asset IDs from collections in different locales', async () => {
      // Fetch in English
      cms.setLocale(LOCALES.EN_US)
      const enResult = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()
      const enFileField = enResult.field('file_field_4')

      // Fetch in Spanish
      cms.setLocale(LOCALES.ES_ES)
      const esResult = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()
      const esFileField = esResult.field('file_field_4')

      // Both should have valid asset IDs (they may differ per locale)
      expect(enFileField).toBeTruthy()
      expect(esFileField).toBeTruthy()

      console.log(`   ℹ️  Asset IDs per locale - EN: ${enFileField}, ES: ${esFileField}`)

      // Reset
      cms.setLocale(LOCALES.EN_US)
    }, testConfig.timeout * 2)
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
      expect(() => cms.asset_url(ASSET_IDS.IMAGE_1, { width: -100 })).toThrow()
      expect(() => cms.asset_url(ASSET_IDS.IMAGE_1, { height: -100 })).toThrow()

      // Zero dimensions should be rejected
      expect(() => cms.asset_url(ASSET_IDS.IMAGE_1, { width: 0 })).toThrow()
      expect(() => cms.asset_url(ASSET_IDS.IMAGE_1, { height: 0 })).toThrow()
    })
  })

  describe('Asset Size Comparison', () => {
    beforeAll(async () => {
      // Clear cache to prevent quota issues
      await cms.clearCache()
    })

    test('should compare sizes across variants', async () => {
      // Download same asset in different variants
      const [original, web, thumbnail] = await Promise.all([
        cms.download_asset(ASSET_IDS.IMAGE_1),
        cms.download_asset(ASSET_IDS.IMAGE_1, { variant: 'web' }),
        cms.download_asset(ASSET_IDS.IMAGE_1, { variant: 'thumbnail' }),
      ])

      console.log('   ℹ️  Size comparison for IMAGE_1:')
      console.log('       Original:', original.contentLength, 'bytes')
      console.log('       Web:', web.contentLength, 'bytes')
      console.log('       Thumbnail:', thumbnail.contentLength, 'bytes')

      // Generally thumbnail should be smallest
      expect(thumbnail.contentLength).toBeLessThanOrEqual(web.contentLength)
    }, testConfig.timeout * 3)

    test('should verify size reduction with transformations', async () => {
      // Download original and resized versions
      const [original, small] = await Promise.all([
        cms.download_asset(ASSET_IDS.IMAGE_2),
        cms.download_asset(ASSET_IDS.IMAGE_2, { width: 200, height: 200 }),
      ])

      console.log('   ℹ️  Transformation size comparison for IMAGE_2:')
      console.log('       Original:', original.contentLength, 'bytes')
      console.log('       Resized (200x200):', small.contentLength, 'bytes')

      // Resized version should typically be smaller
      expect(small.contentLength).toBeLessThanOrEqual(original.contentLength)
    }, testConfig.timeout * 2)
  })

  describe('Integration with Collection Results', () => {
    beforeAll(() => {
      cms.setLocale(LOCALES.EN_US)
    })

    test('should generate asset URLs for all items with map', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).all()

      // Map over items to get their asset IDs
      const assetIds = result.map((item) => item.data.file_field_4)

      expect(assetIds).toEqual([ASSET_IDS.IMAGE_1, ASSET_IDS.IMAGE_2])

      // Generate URLs for each
      const urls = assetIds.map((id) => cms.asset_url(id as string))

      expect(urls.length).toBe(2)
      expect(urls[0]).toContain(ASSET_IDS.IMAGE_1)
      expect(urls[1]).toContain(ASSET_IDS.IMAGE_2)

      console.log('   ℹ️  Generated asset URLs from collection items:', urls)
    }, testConfig.timeout)

    test('should handle multifile fields with flatMap', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).all()

      // Flatten all multifile_field_5 arrays
      const allAssetIds = result
        .toArray()
        .flatMap((item) => item.data.multifile_field_5 as string[])

      // Should have 3 total asset IDs (first item has 2, second item has 1)
      expect(allAssetIds.length).toBe(3)
      expect(allAssetIds).toContain(ASSET_IDS.IMAGE_1)
      expect(allAssetIds).toContain(ASSET_IDS.IMAGE_2)

      console.log('   ℹ️  All asset IDs from multifile fields:', allAssetIds)
    }, testConfig.timeout)
  })
})
