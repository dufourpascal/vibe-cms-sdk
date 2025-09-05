/**
 * Tests for the CollectionQuery chainable API.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { CollectionQuery } from '../src/core/collection.js'
import { Fetcher } from '../src/core/fetcher.js'
import { BrowserCache } from '../src/core/cache.js'
import { 
  mockFetch,
  TEST_PROJECT_ID,
  TEST_COLLECTION_SLUG,
  TEST_ITEM_ID,
  MOCK_PUBLIC_CONTENT_ITEM,
  MOCK_PUBLIC_CONTENT_RESPONSE,
  MOCK_PUBLIC_CONTENT_LIST_RESPONSE,
  createMockResponse,
  createMockErrorResponse,
  createMockNetworkError
} from './setup.js'

describe('CollectionQuery', () => {
  let fetcher: Fetcher
  let cache: BrowserCache
  let collection: CollectionQuery

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    
    fetcher = new Fetcher('https://api.vibe-cms.com')
    cache = new BrowserCache({ enabled: true, ttl: 300000, storage: 'localStorage' })
    collection = new CollectionQuery(fetcher, cache, TEST_PROJECT_ID, TEST_COLLECTION_SLUG)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('first() method', () => {
    test('returns first item from collection', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )

      const result = await collection.first()

      expect(result).toEqual(MOCK_PUBLIC_CONTENT_ITEM)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vibe-cms.com/api/public/proj_test123/blog-posts',
        expect.any(Object)
      )
    })

    test('returns null for empty collection', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ...MOCK_PUBLIC_CONTENT_LIST_RESPONSE,
          items: [],
          total: 0,
        })
      )

      const result = await collection.first()

      expect(result).toBeNull()
    })

    test('uses cached result on second call', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )

      // First call
      const result1 = await collection.first()
      // Second call should use cache
      const result2 = await collection.first()

      expect(result1).toEqual(MOCK_PUBLIC_CONTENT_ITEM)
      expect(result2).toEqual(MOCK_PUBLIC_CONTENT_ITEM)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    test('throws error on API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(collection.first()).rejects.toThrow('Network error')
    })
  })

  describe('many() method', () => {
    test('returns multiple items without limit', async () => {
      const multipleItems = {
        ...MOCK_PUBLIC_CONTENT_LIST_RESPONSE,
        items: [
          MOCK_PUBLIC_CONTENT_ITEM,
          { ...MOCK_PUBLIC_CONTENT_ITEM, id: 'item2' },
          { ...MOCK_PUBLIC_CONTENT_ITEM, id: 'item3' },
        ],
        total: 3,
      }

      mockFetch.mockResolvedValueOnce(createMockResponse(multipleItems))

      const result = await collection.many()

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual(MOCK_PUBLIC_CONTENT_ITEM)
    })

    test('returns limited items when limit specified', async () => {
      const multipleItems = {
        ...MOCK_PUBLIC_CONTENT_LIST_RESPONSE,
        items: [
          MOCK_PUBLIC_CONTENT_ITEM,
          { ...MOCK_PUBLIC_CONTENT_ITEM, id: 'item2' },
          { ...MOCK_PUBLIC_CONTENT_ITEM, id: 'item3' },
        ],
        total: 3,
      }

      mockFetch.mockResolvedValueOnce(createMockResponse(multipleItems))

      const result = await collection.many({ limit: 2 })

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(MOCK_PUBLIC_CONTENT_ITEM)
    })

    test('returns empty array for empty collection', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ...MOCK_PUBLIC_CONTENT_LIST_RESPONSE,
          items: [],
          total: 0,
        })
      )

      const result = await collection.many()

      expect(result).toEqual([])
    })

    test('caches results with different limits separately', async () => {
      const multipleItems = {
        ...MOCK_PUBLIC_CONTENT_LIST_RESPONSE,
        items: [
          MOCK_PUBLIC_CONTENT_ITEM,
          { ...MOCK_PUBLIC_CONTENT_ITEM, id: 'item2' },
          { ...MOCK_PUBLIC_CONTENT_ITEM, id: 'item3' },
        ],
        total: 3,
      }

      mockFetch.mockResolvedValue(createMockResponse(multipleItems))

      // Call with different limits
      const result1 = await collection.many({ limit: 1 })
      const result2 = await collection.many({ limit: 2 })
      const result3 = await collection.many()

      expect(result1).toHaveLength(1)
      expect(result2).toHaveLength(2)
      expect(result3).toHaveLength(3)
      
      // Each should have made its own API call due to different cache keys
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('all() method', () => {
    test('returns all items (alias for many)', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )

      const result = await collection.all()

      expect(result).toEqual([MOCK_PUBLIC_CONTENT_ITEM])
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vibe-cms.com/api/public/proj_test123/blog-posts',
        expect.any(Object)
      )
    })
  })

  describe('item() method', () => {
    test('returns specific item by ID', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_RESPONSE)
      )

      const result = await collection.item(TEST_ITEM_ID)

      expect(result).toEqual(MOCK_PUBLIC_CONTENT_ITEM)
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.vibe-cms.com/api/public/proj_test123/blog-posts/${TEST_ITEM_ID}`,
        expect.any(Object)
      )
    })

    test('returns null for non-existent item', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse(404, 'Content not found or not published')
      )

      const result = await collection.item('nonexistent')

      expect(result).toBeNull()
    })

    test('throws error for other API failures', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse(500, 'Internal server error')
      )

      await expect(collection.item(TEST_ITEM_ID)).rejects.toThrow()
    })

    test('uses cached result on repeated calls', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_RESPONSE)
      )

      // First call
      const result1 = await collection.item(TEST_ITEM_ID)
      // Second call should use cache
      const result2 = await collection.item(TEST_ITEM_ID)

      expect(result1).toEqual(MOCK_PUBLIC_CONTENT_ITEM)
      expect(result2).toEqual(MOCK_PUBLIC_CONTENT_ITEM)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })


  describe('Cache Management', () => {
    test('clearCache removes cached data for collection', async () => {
      // Set up some cached data
      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )
      
      await collection.first()
      
      // Clear cache
      await collection.clearCache()
      
      // Next call should hit API again
      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )
      
      await collection.first()
      
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Collection Info', () => {
    test('getCollectionInfo returns collection metadata', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )

      const info = await collection.getCollectionInfo()

      expect(info).toEqual({
        slug: TEST_COLLECTION_SLUG,
        name: 'Blog Posts',
        description: 'Public blog posts collection',
        is_singleton: false,
        total: 1,
      })
    })
  })

  describe('Error Handling', () => {
    test('handles network errors gracefully', async () => {
      mockFetch.mockImplementation(() => createMockNetworkError('Network timeout'))

      await expect(collection.first()).rejects.toThrow('Network timeout')
      
      // Reset the mock for the next calls
      mockFetch.mockImplementation(() => createMockNetworkError('Network timeout'))
      await expect(collection.many()).rejects.toThrow('Network timeout')
      
      mockFetch.mockImplementation(() => createMockNetworkError('Network timeout'))
      await expect(collection.all()).rejects.toThrow('Network timeout')
    })

    test('handles malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON')),
        text: () => Promise.resolve('Invalid response'),
      } as Response)

      await expect(collection.first()).rejects.toThrow()
    })
  })
})