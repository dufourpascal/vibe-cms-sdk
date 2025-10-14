/**
 * Integration tests for collection queries against real Vibe CMS API.
 *
 * These tests make actual HTTP requests to the configured environment.
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

describe.skipIf(skipIfNotConfigured)('Collection Integration Tests', () => {
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
        enabled: true, // Test with caching enabled
        ttl: 60000, // 1 minute for tests
      },
    })
  })

  describe('FAQ Collection', () => {
    test('should fetch first FAQ item', async () => {
      const result = await cms.collection(testConfig.collections.faq).first()

      // Verify result structure
      expect(result).toBeDefined()
      expect(result.raw).toBeDefined()

      if (result.raw) {
        expect(result.raw).toHaveProperty('id')
        expect(result.raw).toHaveProperty('data')
        expect(result.raw).toHaveProperty('locale')
      }
    }, testConfig.timeout)

    test('should fetch many FAQ items with limit', async () => {
      const result = await cms.collection(testConfig.collections.faq).many({ limit: 5 })

      expect(result).toBeDefined()
      expect(result.count).toBeGreaterThanOrEqual(0)
      expect(result.count).toBeLessThanOrEqual(5)
      expect(result.isArray).toBe(true)

      // If we have results, verify structure
      if (result.count > 0) {
        const firstItem = result.first()
        expect(firstItem).toHaveProperty('id')
        expect(firstItem).toHaveProperty('data')
        expect(firstItem).toHaveProperty('locale')
      }
    }, testConfig.timeout)

    test('should fetch all FAQ items', async () => {
      const result = await cms.collection(testConfig.collections.faq).all()

      expect(result).toBeDefined()
      expect(result.count).toBeGreaterThanOrEqual(0)
      expect(result.isArray).toBe(true)

      console.log(`   ℹ️  Found ${result.count} FAQ items`)
    }, testConfig.timeout)

    test('should use cache on subsequent requests', async () => {
      // First request
      const start1 = Date.now()
      const result1 = await cms.collection(testConfig.collections.faq).first()
      const duration1 = Date.now() - start1

      // Second request (should be cached)
      const start2 = Date.now()
      const result2 = await cms.collection(testConfig.collections.faq).first()
      const duration2 = Date.now() - start2

      expect(result1.raw).toEqual(result2.raw)
      expect(duration2).toBeLessThan(duration1) // Cached request should be faster

      console.log(`   ℹ️  First request: ${duration1}ms, Cached request: ${duration2}ms`)
    }, testConfig.timeout * 2)
  })

  describe('Blog Post Collection', () => {
    test('should fetch first blog post', async () => {
      const result = await cms.collection(testConfig.collections.blogPost).first()

      expect(result).toBeDefined()
      expect(result.raw).toBeDefined()

      if (result.raw) {
        expect(result.raw).toHaveProperty('id')
        expect(result.raw).toHaveProperty('data')
        expect(result.raw).toHaveProperty('locale')
      }
    }, testConfig.timeout)

    test('should fetch many blog posts with default limit', async () => {
      const result = await cms.collection(testConfig.collections.blogPost).many()

      expect(result).toBeDefined()
      expect(result.count).toBeGreaterThanOrEqual(0)
      expect(result.count).toBeLessThanOrEqual(50) // Default limit
      expect(result.isArray).toBe(true)

      console.log(`   ℹ️  Found ${result.count} blog posts`)
    }, testConfig.timeout)

    test('should fetch specific blog post by ID', async () => {
      // First get an item to have a valid ID
      const firstPost = await cms.collection(testConfig.collections.blogPost).first()

      if (firstPost.raw) {
        const itemId = firstPost.raw.id

        // Now fetch that specific item
        const result = await cms.collection(testConfig.collections.blogPost).item(itemId)

        expect(result).toBeDefined()
        expect(result.raw).toBeDefined()
        expect(result.raw?.id).toBe(itemId)
      }
    }, testConfig.timeout * 2)

    test('should support field extraction', async () => {
      const result = await cms.collection(testConfig.collections.blogPost).first()

      if (result.raw) {
        // Test field extraction
        const fields = Object.keys(result.raw.data)

        if (fields.length > 0) {
          const firstField = fields[0]
          const value = result.field(firstField)

          expect(value).toBeDefined()
          console.log(`   ℹ️  Extracted field '${firstField}':`, value)
        }
      }
    }, testConfig.timeout)
  })

  describe('Landing Page Collection (Singleton)', () => {
    test('should fetch landing page singleton', async () => {
      const result = await cms.collection(testConfig.collections.landingPage).first()

      expect(result).toBeDefined()
      expect(result.raw).toBeDefined()

      if (result.raw) {
        expect(result.raw).toHaveProperty('id')
        expect(result.raw).toHaveProperty('status')
        expect(result.raw).toHaveProperty('data')
        expect(result.raw.status).toBe('published')

        console.log(`   ℹ️  Landing page ID: ${result.raw.id}`)
      }
    }, testConfig.timeout)

    test('should return same item for .first() and .all()', async () => {
      const first = await cms.collection(testConfig.collections.landingPage).first()
      const all = await cms.collection(testConfig.collections.landingPage).all()

      // Singleton should return same content
      if (first.raw && all.count > 0) {
        expect(all.count).toBe(1)
        expect(all.first().id).toBe(first.raw.id)
      }
    }, testConfig.timeout * 2)

    test('should support field extraction on singleton', async () => {
      const result = await cms.collection(testConfig.collections.landingPage).first()

      if (result.raw) {
        const fields = Object.keys(result.raw.data)

        if (fields.length > 0) {
          const firstField = fields[0]
          const value = result.field(firstField)

          expect(value).toBeDefined()
          console.log(`   ℹ️  Landing page field '${firstField}':`, value)
        }
      }
    }, testConfig.timeout)
  })

  describe('Cache Management', () => {
    test('should clear cache for specific collection', async () => {
      const collection = cms.collection(testConfig.collections.faq)

      // Fetch and cache
      await collection.first()

      // Clear cache
      await collection.clearCache()

      // This should fetch fresh data
      const result = await collection.first()
      expect(result).toBeDefined()
    }, testConfig.timeout * 2)

    test('should clear all cache', async () => {
      // Fetch from multiple collections
      await cms.collection(testConfig.collections.faq).first()
      await cms.collection(testConfig.collections.blogPost).first()

      // Clear all cache
      await cms.clearCache()

      // Subsequent requests should fetch fresh data
      const result = await cms.collection(testConfig.collections.faq).first()
      expect(result).toBeDefined()
    }, testConfig.timeout * 3)

    test('should get cache statistics', async () => {
      // Clear cache first
      await cms.clearCache()

      // Make some requests
      await cms.collection(testConfig.collections.faq).first()
      await cms.collection(testConfig.collections.blogPost).many({ limit: 5 })

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
    test('should handle non-existent collection gracefully', async () => {
      const nonExistentSlug = 'non-existent-collection-xyz'

      await expect(
        cms.collection(nonExistentSlug).first()
      ).rejects.toThrow()
    }, testConfig.timeout)

    test('should handle non-existent item ID gracefully', async () => {
      const nonExistentId = 'non-existent-item-xyz-123'

      const result = await cms.collection(testConfig.collections.faq).item(nonExistentId)

      // Should return null or undefined for non-existent item
      expect(result.raw).toBeNull()
    }, testConfig.timeout)

    test('should validate collection slug format', () => {
      // Invalid slug format (uppercase, spaces, etc.)
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
})
