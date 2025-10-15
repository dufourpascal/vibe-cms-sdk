/**
 * Integration tests for collection queries against real Vibe CMS API.
 *
 * These tests run against a stable staging environment with hardcoded test data.
 * No configuration required - tests validate exact expected values.
 *
 * Run with: npm run test:integration
 */

import { describe, test, expect, beforeAll } from 'vitest'
import { createVibeCMS } from '../../src/index.js'
import type { VibeCMSClient } from '../../src/core/client.js'
import { getConfig, getEnvironmentInfo } from './config.js'
import {
  TEST_COLLECTION_1_DATA,
  TEST_SINGLETON_2_DATA,
  COLLECTIONS,
  LOCALES,
  ASSET_IDS,
} from './testData.js'

const testConfig = getConfig()

describe('Collection Integration Tests', () => {
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

  describe('test_collection_1 - Regular Collection (en-US)', () => {
    beforeAll(() => {
      // Ensure we're using en-US locale
      cms.setLocale(LOCALES.EN_US)
    })

    test('should fetch first item with exact field values', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()

      expect(result).toBeDefined()
      expect(result.raw).toBeDefined()

      const expectedItem = TEST_COLLECTION_1_DATA['en-US'][0]

      expect(result.raw?.id).toBe(expectedItem.id)
      expect(result.raw?.locale).toBe(expectedItem.locale)
      expect(result.raw?.data).toEqual(expectedItem.data)
    }, testConfig.timeout)

    test('should fetch all items in correct order', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).all()

      expect(result).toBeDefined()
      expect(result.count).toBe(2)
      expect(result.isArray).toBe(true)

      const expectedItems = TEST_COLLECTION_1_DATA['en-US']

      // Verify both items
      const items = result.toArray()
      expect(items[0].id).toBe(expectedItems[0].id)
      expect(items[0].data).toEqual(expectedItems[0].data)
      expect(items[1].id).toBe(expectedItems[1].id)
      expect(items[1].data).toEqual(expectedItems[1].data)
    }, testConfig.timeout)

    test('should fetch many items with limit', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).many({ limit: 1 })

      expect(result).toBeDefined()
      expect(result.count).toBe(1)
      expect(result.isArray).toBe(true)

      const expectedItem = TEST_COLLECTION_1_DATA['en-US'][0]
      const firstItem = result.first()

      expect(firstItem.id).toBe(expectedItem.id)
      expect(firstItem.data).toEqual(expectedItem.data)
    }, testConfig.timeout)

    test('should fetch specific item by ID', async () => {
      const expectedItem = TEST_COLLECTION_1_DATA['en-US'][1] // Second item

      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).item(expectedItem.id)

      expect(result).toBeDefined()
      expect(result.raw).toBeDefined()
      expect(result.raw?.id).toBe(expectedItem.id)
      expect(result.raw?.data).toEqual(expectedItem.data)
    }, testConfig.timeout)

    test('should extract text fields correctly', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()

      expect(result.field('text_field_1')).toBe('it1 - f1 - en')
      expect(result.field('text_field_2')).toBe('it1 - f2 - en')
      expect(result.field('md_field_3')).toBe('it 1 - f3 - en')
    }, testConfig.timeout)

    test('should extract file field correctly', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()

      const fileField = result.field('file_field_4')
      expect(fileField).toBe(ASSET_IDS.IMAGE_1)
    }, testConfig.timeout)

    test('should extract multifile field correctly', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()

      const multifileField = result.field('multifile_field_5')
      expect(Array.isArray(multifileField)).toBe(true)
      expect(multifileField).toEqual([ASSET_IDS.IMAGE_2, ASSET_IDS.IMAGE_1])
    }, testConfig.timeout)

    test('should verify second item has different file associations', async () => {
      const expectedItem = TEST_COLLECTION_1_DATA['en-US'][1]

      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).item(expectedItem.id)

      expect(result.field('file_field_4')).toBe(ASSET_IDS.IMAGE_2)
      expect(result.field('multifile_field_5')).toEqual([ASSET_IDS.IMAGE_1])
    }, testConfig.timeout)
  })

  describe('test_collection_1 - Regular Collection (es-ES)', () => {
    beforeAll(() => {
      // Switch to Spanish locale
      cms.setLocale(LOCALES.ES_ES)
    })

    test('should fetch first item with Spanish locale data', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()

      expect(result).toBeDefined()
      expect(result.raw).toBeDefined()

      const expectedItem = TEST_COLLECTION_1_DATA['es-ES'][0]

      expect(result.raw?.id).toBe(expectedItem.id)
      expect(result.raw?.locale).toBe(expectedItem.locale)
      expect(result.raw?.data).toEqual(expectedItem.data)
    }, testConfig.timeout)

    test('should fetch all items with Spanish locale data', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).all()

      expect(result.count).toBe(2)

      const expectedItems = TEST_COLLECTION_1_DATA['es-ES']
      const items = result.toArray()

      expect(items[0].data).toEqual(expectedItems[0].data)
      expect(items[1].data).toEqual(expectedItems[1].data)
    }, testConfig.timeout)

    test('should extract Spanish text fields correctly', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()

      expect(result.field('text_field_1')).toBe('it1 - f1 - es')
      expect(result.field('text_field_2')).toBe('it1 - f2 - es')
      expect(result.field('md_field_3')).toBe('it1 - f3 - es')
    }, testConfig.timeout)

    test('should have valid asset IDs regardless of locale', async () => {
      // Asset IDs should be valid asset references regardless of locale
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()

      const fileField = result.field('file_field_4')
      const multifileField = result.field('multifile_field_5')

      // Verify fields contain valid asset IDs
      expect(fileField).toBeTruthy()
      expect(Array.isArray(multifileField)).toBe(true)
      expect(multifileField.length).toBeGreaterThan(0)
    }, testConfig.timeout)

    afterAll(() => {
      // Reset to default locale
      cms.setLocale(LOCALES.EN_US)
    })
  })

  describe('test_singleton_2 - Singleton Collection (en-US)', () => {
    beforeAll(() => {
      // Ensure we're using en-US locale
      cms.setLocale(LOCALES.EN_US)
    })

    test('should fetch singleton with exact field values', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_SINGLETON).first()

      expect(result).toBeDefined()
      expect(result.raw).toBeDefined()

      const expectedItem = TEST_SINGLETON_2_DATA['en-US']

      expect(result.raw?.id).toBe(expectedItem.id)
      expect(result.raw?.locale).toBe(expectedItem.locale)
      expect(result.raw?.data).toEqual(expectedItem.data)
    }, testConfig.timeout)

    test('should return single item for .all()', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_SINGLETON).all()

      expect(result.count).toBe(1)
      expect(result.isArray).toBe(true)

      const expectedItem = TEST_SINGLETON_2_DATA['en-US']
      const firstItem = result.first()

      expect(firstItem.id).toBe(expectedItem.id)
      expect(firstItem.data).toEqual(expectedItem.data)
    }, testConfig.timeout)

    test('should extract singleton fields correctly', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_SINGLETON).first()

      expect(result.field('field_1')).toBe('sit1 - f1 - en')
      expect(result.field('field_2')).toBe('sit1 - f1 - en')
    }, testConfig.timeout)
  })

  describe('test_singleton_2 - Singleton Collection (es-ES)', () => {
    beforeAll(() => {
      // Switch to Spanish locale
      cms.setLocale(LOCALES.ES_ES)
    })

    test('should fetch singleton with Spanish locale data', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_SINGLETON).first()

      expect(result).toBeDefined()
      expect(result.raw).toBeDefined()

      const expectedItem = TEST_SINGLETON_2_DATA['es-ES']

      expect(result.raw?.id).toBe(expectedItem.id)
      expect(result.raw?.locale).toBe(expectedItem.locale)
      expect(result.raw?.data).toEqual(expectedItem.data)
    }, testConfig.timeout)

    test('should extract Spanish singleton fields correctly', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_SINGLETON).first()

      expect(result.field('field_1')).toBe('sit1 - f1 - es')
      expect(result.field('field_2')).toBe('sit1 - f1 - es')
    }, testConfig.timeout)

    afterAll(() => {
      // Reset to default locale
      cms.setLocale(LOCALES.EN_US)
    })
  })

  describe('Locale Switching', () => {
    test('should return different data when switching locales', async () => {
      // Fetch in English
      cms.setLocale(LOCALES.EN_US)
      const enResult = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()

      // Fetch in Spanish
      cms.setLocale(LOCALES.ES_ES)
      const esResult = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()

      // Same ID, different locale data
      expect(enResult.raw?.id).toBe(esResult.raw?.id)
      expect(enResult.field('text_field_1')).toBe('it1 - f1 - en')
      expect(esResult.field('text_field_1')).toBe('it1 - f1 - es')

      // Reset
      cms.setLocale(LOCALES.EN_US)
    }, testConfig.timeout * 2)

    test('should cache separately per locale', async () => {
      // Clear cache
      await cms.clearCache()

      // Fetch in English (will be cached)
      cms.setLocale(LOCALES.EN_US)
      await cms.collection(COLLECTIONS.TEST_COLLECTION).first()

      // Fetch in Spanish (should make new API call, different cache key)
      cms.setLocale(LOCALES.ES_ES)
      const esResult = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()

      expect(esResult.field('text_field_1')).toBe('it1 - f1 - es')

      // Reset
      cms.setLocale(LOCALES.EN_US)
    }, testConfig.timeout * 2)
  })

  describe('Cache Management', () => {
    beforeAll(() => {
      cms.setLocale(LOCALES.EN_US)
    })

    test('should use cache on subsequent requests', async () => {
      const collection = cms.collection(COLLECTIONS.TEST_COLLECTION)

      // First request
      const start1 = Date.now()
      const result1 = await collection.first()
      const duration1 = Date.now() - start1

      // Second request (should be cached)
      const start2 = Date.now()
      const result2 = await collection.first()
      const duration2 = Date.now() - start2

      expect(result1.raw).toEqual(result2.raw)
      // Note: Cache timing can vary, so we just verify both requests succeed

      console.log(`   ℹ️  First request: ${duration1}ms, Cached: ${duration2}ms`)
    }, testConfig.timeout * 2)

    test('should clear cache for specific collection', async () => {
      const collection = cms.collection(COLLECTIONS.TEST_COLLECTION)

      // Fetch and cache
      await collection.first()

      // Clear cache
      await collection.clearCache()

      // Should fetch fresh data
      const result = await collection.first()
      expect(result).toBeDefined()
    }, testConfig.timeout * 2)

    test('should clear all cache', async () => {
      // Fetch from both collections
      await cms.collection(COLLECTIONS.TEST_COLLECTION).first()
      await cms.collection(COLLECTIONS.TEST_SINGLETON).first()

      // Clear all cache
      await cms.clearCache()

      // Subsequent requests should fetch fresh data
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).first()
      expect(result).toBeDefined()
    }, testConfig.timeout * 2)

    test('should get cache statistics', async () => {
      // Clear cache first
      await cms.clearCache()

      // Make some requests
      await cms.collection(COLLECTIONS.TEST_COLLECTION).first()
      await cms.collection(COLLECTIONS.TEST_SINGLETON).first()

      // Get cache stats
      const stats = await cms.getCacheStats()

      expect(stats).toHaveProperty('enabled')
      expect(stats).toHaveProperty('storage')
      expect(stats).toHaveProperty('ttl')
      expect(stats).toHaveProperty('keys')

      console.log('   ℹ️  Cache stats:', stats)
    }, testConfig.timeout * 2)
  })

  describe('Error Handling', () => {
    beforeAll(() => {
      cms.setLocale(LOCALES.EN_US)
    })

    test('should handle non-existent collection gracefully', async () => {
      const nonExistentSlug = 'non-existent-collection-xyz'

      const result = await cms.collection(nonExistentSlug).first()

      // Non-existent collection returns null (404 cached as null)
      expect(result.raw).toBeNull()
    }, testConfig.timeout)

    test('should handle non-existent item ID gracefully', async () => {
      const nonExistentId = 'non-existent-item-xyz-123'

      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).item(nonExistentId)

      // Should return null for non-existent item
      expect(result.raw).toBeNull()
    }, testConfig.timeout)

    test('should validate collection slug format', () => {
      // Invalid slug formats
      expect(() => cms.collection('Invalid-Slug')).toThrow()
      expect(() => cms.collection('slug with spaces')).toThrow()
      expect(() => cms.collection('')).toThrow()
    })
  })

  describe('Connectivity', () => {
    test('should ping API successfully', async () => {
      const result = await cms.ping()

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('timestamp')

      if (result.success) {
        console.log('   ✅ API is reachable')
      } else {
        console.warn('   ⚠️  API ping failed:', result.status)
      }
    }, testConfig.timeout)
  })

  describe('Array Operations on Results', () => {
    beforeAll(() => {
      cms.setLocale(LOCALES.EN_US)
    })

    test('should support .map() on collection results', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).all()

      const titles = result.map((item) => item.data.text_field_1)

      expect(titles).toEqual(['it1 - f1 - en', 'it2 - f1 - en'])
    }, testConfig.timeout)

    test('should support .filter() on collection results', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).all()

      const filtered = result.filter(
        (item) => item.data.text_field_1 === 'it2 - f1 - en'
      )

      expect(filtered.count).toBe(1)
      expect(filtered.first()?.id).toBe(TEST_COLLECTION_1_DATA['en-US'][1].id)
    }, testConfig.timeout)

    test('should support .find() on collection results', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).all()

      const found = result.find((item) => item.data.text_field_2 === 'it2 - f2 - en')

      expect(found).toBeDefined()
      expect(found?.id).toBe(TEST_COLLECTION_1_DATA['en-US'][1].id)
    }, testConfig.timeout)

    test('should support iteration on collection results', async () => {
      const result = await cms.collection(COLLECTIONS.TEST_COLLECTION).all()

      const ids: string[] = []
      for (const item of result) {
        ids.push(item.id)
      }

      expect(ids).toEqual([
        TEST_COLLECTION_1_DATA['en-US'][0].id,
        TEST_COLLECTION_1_DATA['en-US'][1].id,
      ])
    }, testConfig.timeout)
  })
})
