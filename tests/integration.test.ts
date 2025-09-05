/**
 * Integration tests for the complete VMS SDK.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { createVibeCMS } from '../src/index.js'
import { VibeCMSClient } from '../src/core/client.js'
import { 
  mockFetch,
  TEST_PROJECT_ID,
  TEST_COLLECTION_SLUG,
  TEST_ITEM_ID,
  MOCK_PUBLIC_CONTENT_ITEM,
  MOCK_PUBLIC_CONTENT_RESPONSE,
  MOCK_PUBLIC_CONTENT_LIST_RESPONSE,
  createMockResponse,
  createMockErrorResponse
} from './setup.js'

describe('VMS SDK Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('End-to-End Usage Scenarios', () => {
    test('complete blog post retrieval workflow', async () => {
      const cms = createVibeCMS({
        projectId: TEST_PROJECT_ID,
        baseUrl: 'https://api.vibe-cms.com',
        cache: { enabled: true, ttl: 300000 }
      })

      expect(cms).toBeInstanceOf(VibeCMSClient)

      // Mock API responses
      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )

      // Test chained API calls
      const posts = cms.collection('blog-posts')
      const firstPost = await posts.first()
      
      expect(firstPost).toEqual(MOCK_PUBLIC_CONTENT_ITEM)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vibe-cms.com/api/public/proj_test123/blog-posts',
        expect.any(Object)
      )

      // Second call should use cache
      const cachedPost = await posts.first()
      expect(cachedPost).toEqual(MOCK_PUBLIC_CONTENT_ITEM)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Still only one call
    })

    test('multiple collection types workflow', async () => {
      const cms = createVibeCMS({ projectId: TEST_PROJECT_ID })

      // Mock responses for different collections
      mockFetch
        .mockResolvedValueOnce(createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE))
        .mockResolvedValueOnce(createMockResponse({
          ...MOCK_PUBLIC_CONTENT_LIST_RESPONSE,
          collection: { ...MOCK_PUBLIC_CONTENT_LIST_RESPONSE.collection, slug: 'pages' }
        }))

      // Access different collections
      const blogPosts = await cms.collection('blog-posts').all()
      const pages = await cms.collection('pages').all()

      expect(blogPosts).toHaveLength(1)
      expect(pages).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    test('error handling across the entire SDK', async () => {
      const cms = createVibeCMS({ projectId: TEST_PROJECT_ID })

      // Test 404 error
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse(404, 'Collection not found')
      )

      await expect(
        cms.collection('nonexistent').first()
      ).rejects.toThrow('Collection not found')

      // Test network error
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'))

      await expect(
        cms.collection('blog-posts').all()
      ).rejects.toThrow('Network timeout')
    })
  })

  describe('Caching Integration', () => {
    test('cache works across different query methods', async () => {
      const cms = createVibeCMS({ 
        projectId: TEST_PROJECT_ID,
        cache: { enabled: true, ttl: 300000 }
      })

      // Set up API response - both calls will use the same response since they have different cache keys
      mockFetch.mockResolvedValue(createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE))

      const collection = cms.collection('blog-posts')

      // Different query methods should cache separately
      const firstPost = await collection.first()
      const allPosts = await collection.all()

      expect(firstPost).toEqual(MOCK_PUBLIC_CONTENT_ITEM)
      expect(allPosts).toEqual([MOCK_PUBLIC_CONTENT_ITEM]) // Both get the same response
      expect(mockFetch).toHaveBeenCalledTimes(2) // Different cache keys mean separate API calls
    })

    test('cache invalidation works correctly', async () => {
      const cms = createVibeCMS({ 
        projectId: TEST_PROJECT_ID,
        cache: { enabled: true }
      })

      mockFetch.mockResolvedValue(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )

      const collection = cms.collection('blog-posts')

      // First call
      await collection.first()
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call uses cache
      await collection.first()
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Clear cache
      await collection.clearCache()

      // Third call hits API again
      await collection.first()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    test('disabled cache always hits API', async () => {
      const cms = createVibeCMS({ 
        projectId: TEST_PROJECT_ID,
        cache: { enabled: false }
      })

      mockFetch.mockResolvedValue(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )

      const collection = cms.collection('blog-posts')

      // Multiple calls should all hit API
      await collection.first()
      await collection.first()
      await collection.first()

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('Real-world Usage Patterns', () => {
    test('blog listing with pagination simulation', async () => {
      const cms = createVibeCMS({ projectId: TEST_PROJECT_ID })

      const multipleItems = {
        ...MOCK_PUBLIC_CONTENT_LIST_RESPONSE,
        items: Array.from({ length: 25 }, (_, i) => ({
          ...MOCK_PUBLIC_CONTENT_ITEM,
          id: `item${i + 1}`,
          data: { ...MOCK_PUBLIC_CONTENT_ITEM.data, title: `Post ${i + 1}` }
        })),
        total: 25
      }

      mockFetch.mockResolvedValue(createMockResponse(multipleItems))

      const collection = cms.collection('blog-posts')

      // Get different page sizes
      const firstFive = await collection.many({ limit: 5 })
      const firstTen = await collection.many({ limit: 10 })
      const allPosts = await collection.all()

      expect(firstFive).toHaveLength(5)
      expect(firstTen).toHaveLength(10)
      expect(allPosts).toHaveLength(25)
    })

    test('individual post retrieval by ID', async () => {
      const cms = createVibeCMS({ projectId: TEST_PROJECT_ID })

      // Mock specific item response
      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_RESPONSE)
      )

      const collection = cms.collection('blog-posts')

      // Get by ID
      const postById = await collection.item(TEST_ITEM_ID)
      expect(postById?.id).toBe(TEST_ITEM_ID)
    })

    test('scoped collection convenience methods', async () => {
      const cms = createVibeCMS({ projectId: TEST_PROJECT_ID })

      mockFetch.mockResolvedValue(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )

      // Use scoped collection
      const blogPosts = cms.scopedCollection('blog-posts')

      const first = await blogPosts.first()
      const all = await blogPosts.all()
      const many = await blogPosts.many({ limit: 5 })

      expect(first).toEqual(MOCK_PUBLIC_CONTENT_ITEM)
      expect(all).toEqual([MOCK_PUBLIC_CONTENT_ITEM])
      expect(many).toEqual([MOCK_PUBLIC_CONTENT_ITEM])
    })
  })

  describe('Configuration Flexibility', () => {
    test('different base URLs work correctly', async () => {
      const customCms = createVibeCMS({
        projectId: TEST_PROJECT_ID,
        baseUrl: 'https://custom-domain.com'
      })

      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )

      await customCms.collection('blog-posts').first()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom-domain.com/api/public/proj_test123/blog-posts',
        expect.any(Object)
      )
    })

    test('different cache storage types', async () => {
      const sessionCms = createVibeCMS({
        projectId: TEST_PROJECT_ID,
        cache: { storage: 'sessionStorage' }
      })

      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )

      await sessionCms.collection('blog-posts').first()

      // Should use sessionStorage instead of localStorage
      expect(sessionStorage.setItem).toHaveBeenCalled()
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('Error Recovery', () => {
    test('SDK continues working after errors', async () => {
      const cms = createVibeCMS({ projectId: TEST_PROJECT_ID })

      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        cms.collection('blog-posts').first()
      ).rejects.toThrow('Network error')

      // Second call succeeds
      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )

      const result = await cms.collection('blog-posts').first()
      expect(result).toEqual(MOCK_PUBLIC_CONTENT_ITEM)
    })

    test('partial failures do not affect other collections', async () => {
      const cms = createVibeCMS({ projectId: TEST_PROJECT_ID })

      // One collection fails
      mockFetch.mockRejectedValueOnce(new Error('Collection unavailable'))

      await expect(
        cms.collection('broken-collection').first()
      ).rejects.toThrow('Collection unavailable')

      // Another collection works
      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )

      const result = await cms.collection('working-collection').first()
      expect(result).toEqual(MOCK_PUBLIC_CONTENT_ITEM)
    })
  })

  describe('Performance Considerations', () => {
    test('concurrent requests are handled correctly', async () => {
      const cms = createVibeCMS({ projectId: TEST_PROJECT_ID })

      mockFetch.mockResolvedValue(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )

      const collection = cms.collection('blog-posts')

      // Make concurrent requests
      const [result1, result2, result3] = await Promise.all([
        collection.first(),
        collection.many({ limit: 5 }),
        collection.all()
      ])

      expect(result1).toEqual(MOCK_PUBLIC_CONTENT_ITEM)
      expect(result2).toEqual([MOCK_PUBLIC_CONTENT_ITEM])
      expect(result3).toEqual([MOCK_PUBLIC_CONTENT_ITEM])

      // Each should make its own request due to different cache keys
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    test('large response handling', async () => {
      const cms = createVibeCMS({ projectId: TEST_PROJECT_ID })

      // Simulate large response
      const largeResponse = {
        ...MOCK_PUBLIC_CONTENT_LIST_RESPONSE,
        items: Array.from({ length: 1000 }, (_, i) => ({
          ...MOCK_PUBLIC_CONTENT_ITEM,
          id: `item${i}`,
          data: { 
            ...MOCK_PUBLIC_CONTENT_ITEM.data, 
            title: `Large Post ${i}`,
            content: 'Lorem ipsum '.repeat(100) // Simulate large content
          }
        })),
        total: 1000
      }

      mockFetch.mockResolvedValueOnce(createMockResponse(largeResponse))

      const startTime = Date.now()
      const result = await cms.collection('large-collection').all()
      const endTime = Date.now()

      expect(result).toHaveLength(1000)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete quickly
    })
  })
})