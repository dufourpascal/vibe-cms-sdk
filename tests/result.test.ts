/**
 * Tests for the CollectionResult class and field extraction functionality.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { CollectionResult } from '../src/core/result.js'
import { AssetManager } from '../src/core/asset.js'
import { Fetcher } from '../src/core/fetcher.js'
import { BrowserCache } from '../src/core/cache.js'

// Mock data structures
const mockSingleItem = {
  id: 'item-1',
  status: 'published' as const,
  data: {
    title: 'Test Title',
    content: 'Test content here',
    author: 'John Doe',
    tags: ['tech', 'cms'],
    featured_image: 'asset-123',
    gallery: ['asset-456', 'asset-789'],
    priority: 1,
    published_at: '2023-01-01T00:00:00Z'
  },
  metadata: { seo: { title: 'SEO Title' } },
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

const mockMultipleItems = [
  mockSingleItem,
  {
    id: 'item-2',
    status: 'published' as const,
    data: {
      title: 'Second Title',
      content: 'Second content here',
      author: 'Jane Smith',
      tags: ['design', 'ui'],
      featured_image: 'asset-234',
      gallery: ['asset-567'],
      priority: 2,
      published_at: '2023-01-02T00:00:00Z'
    },
    metadata: { seo: { title: 'SEO Title 2' } },
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z'
  },
  {
    id: 'item-3',
    status: 'published' as const,
    data: {
      title: 'Third Title',
      content: 'Third content here',
      author: 'Bob Wilson',
      tags: ['development'],
      featured_image: null, // No featured image
      gallery: [], // Empty gallery
      priority: 3,
      published_at: '2023-01-03T00:00:00Z'
    },
    metadata: { seo: { title: 'SEO Title 3' } },
    created_at: '2023-01-03T00:00:00Z',
    updated_at: '2023-01-03T00:00:00Z'
  }
]

describe('CollectionResult', () => {
  let assetManager: AssetManager
  let mockGenerateAssetUrl: ReturnType<typeof vi.fn>
  let mockDownloadAsset: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock asset manager
    const fetcher = new Fetcher('https://test.api')
    const cache = new BrowserCache({ enabled: false, ttl: 0, storage: 'localStorage' })
    assetManager = new AssetManager(fetcher, cache, 'test-project', 'en-US')

    // Mock asset manager methods
    mockGenerateAssetUrl = vi.fn((assetId: string, options?: any) =>
      `https://cdn.test.com/${assetId}${options?.width ? `?w=${options.width}` : ''}`
    )
    mockDownloadAsset = vi.fn(async (assetId: string) => ({
      data: new ArrayBuffer(100),
      contentType: 'image/jpeg',
      contentLength: 100,
      fileName: `${assetId}.jpg`,
      assetId
    }))

    assetManager.generateAssetUrl = mockGenerateAssetUrl
    assetManager.downloadAsset = mockDownloadAsset
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Single Item Results', () => {
    test('should handle single item structure correctly', () => {
      const result = new CollectionResult(mockSingleItem, assetManager)

      expect(result.isEmpty).toBe(false)
      expect(result.isSingle).toBe(true)
      expect(result.isArray).toBe(false)
      expect(result.count).toBe(1)
      expect(result.raw).toBe(mockSingleItem)
    })

    test('should extract fields from single item', () => {
      const result = new CollectionResult(mockSingleItem, assetManager)

      expect(result.field('title')).toBe('Test Title')
      expect(result.field('content')).toBe('Test content here')
      expect(result.field('author')).toBe('John Doe')
      expect(result.field('tags')).toEqual(['tech', 'cms'])
      expect(result.field('priority')).toBe(1)
      expect(result.field('nonexistent')).toBeNull()
    })

    test('should generate asset URLs for single item', () => {
      const result = new CollectionResult(mockSingleItem, assetManager)

      const featuredImageUrl = result.asset_url('featured_image')
      expect(featuredImageUrl).toBe('https://cdn.test.com/asset-123')
      expect(mockGenerateAssetUrl).toHaveBeenCalledWith('asset-123', undefined)

      const featuredImageUrlWithOptions = result.asset_url('featured_image', { width: 300 })
      expect(featuredImageUrlWithOptions).toBe('https://cdn.test.com/asset-123?w=300')
      expect(mockGenerateAssetUrl).toHaveBeenCalledWith('asset-123', { width: 300 })
    })

    test('should generate asset URLs for array fields in single item', () => {
      const result = new CollectionResult(mockSingleItem, assetManager)

      const galleryUrls = result.asset_url('gallery')
      expect(galleryUrls).toEqual([
        'https://cdn.test.com/asset-456',
        'https://cdn.test.com/asset-789'
      ])
      expect(mockGenerateAssetUrl).toHaveBeenCalledWith('asset-456', undefined)
      expect(mockGenerateAssetUrl).toHaveBeenCalledWith('asset-789', undefined)
    })

    test('should download assets for single item', async () => {
      const result = new CollectionResult(mockSingleItem, assetManager)

      const assetData = await result.download_asset('featured_image')
      expect(assetData).toEqual({
        data: expect.any(ArrayBuffer),
        contentType: 'image/jpeg',
        contentLength: 100,
        fileName: 'asset-123.jpg',
        assetId: 'asset-123'
      })
      expect(mockDownloadAsset).toHaveBeenCalledWith('asset-123', undefined)
    })

    test('should download multiple assets for array field in single item', async () => {
      const result = new CollectionResult(mockSingleItem, assetManager)

      const assetsData = await result.download_asset('gallery')
      expect(Array.isArray(assetsData)).toBe(true)
      expect(assetsData).toHaveLength(2)
      expect(mockDownloadAsset).toHaveBeenCalledWith('asset-456', undefined)
      expect(mockDownloadAsset).toHaveBeenCalledWith('asset-789', undefined)
    })

    test('should handle null asset fields gracefully', () => {
      const itemWithNullAsset = {
        ...mockSingleItem,
        data: { ...mockSingleItem.data, featured_image: null }
      }
      const result = new CollectionResult(itemWithNullAsset, assetManager)

      expect(result.asset_url('featured_image')).toBeNull()
    })
  })

  describe('Array Results', () => {
    test('should handle array structure correctly', () => {
      const result = new CollectionResult(mockMultipleItems, assetManager)

      expect(result.isEmpty).toBe(false)
      expect(result.isSingle).toBe(false)
      expect(result.isArray).toBe(true)
      expect(result.count).toBe(3)
      expect(result.raw).toBe(mockMultipleItems)
    })

    test('should extract fields as arrays from multiple items', () => {
      const result = new CollectionResult(mockMultipleItems, assetManager)

      expect(result.field('title')).toEqual(['Test Title', 'Second Title', 'Third Title'])
      expect(result.field('author')).toEqual(['John Doe', 'Jane Smith', 'Bob Wilson'])
      expect(result.field('priority')).toEqual([1, 2, 3])
      expect(result.field('nonexistent')).toEqual([null, null, null])
    })

    test('should generate asset URLs for array of items', () => {
      const result = new CollectionResult(mockMultipleItems, assetManager)

      const featuredImageUrls = result.asset_url('featured_image')
      expect(featuredImageUrls).toEqual([
        'https://cdn.test.com/asset-123',
        'https://cdn.test.com/asset-234'
        // Third item has null featured_image, so it gets filtered out
      ])
    })

    test('should handle complex asset URL extraction from arrays', () => {
      const result = new CollectionResult(mockMultipleItems, assetManager)

      const galleryUrls = result.asset_url('gallery')
      expect(galleryUrls).toEqual([
        'https://cdn.test.com/asset-456',
        'https://cdn.test.com/asset-789',
        'https://cdn.test.com/asset-567'
        // Third item has empty gallery, so no URLs added
      ])
    })

    test('should download assets from array of items', async () => {
      const result = new CollectionResult(mockMultipleItems, assetManager)

      const assetsData = await result.download_asset('featured_image')
      expect(Array.isArray(assetsData)).toBe(true)
      expect((assetsData as any[]).length).toBe(2) // Only items with non-null featured_image
    })
  })

  describe('Empty and Null Results', () => {
    test('should handle null result correctly', () => {
      const result = new CollectionResult(null, assetManager)

      expect(result.isEmpty).toBe(true)
      expect(result.isSingle).toBe(false)
      expect(result.isArray).toBe(false)
      expect(result.count).toBe(0)
      expect(result.raw).toBeNull()
    })

    test('should handle empty array result correctly', () => {
      const result = new CollectionResult([], assetManager)

      expect(result.isEmpty).toBe(true)
      expect(result.isSingle).toBe(false)
      expect(result.isArray).toBe(true)
      expect(result.count).toBe(0)
      expect(result.raw).toEqual([])
    })

    test('should return null/empty for field extraction on empty results', () => {
      const nullResult = new CollectionResult(null, assetManager)
      const emptyResult = new CollectionResult([], assetManager)

      expect(nullResult.field('title')).toBeNull()
      expect(emptyResult.field('title')).toEqual([])

      expect(nullResult.asset_url('featured_image')).toBeNull()
      expect(emptyResult.asset_url('featured_image')).toEqual([])
    })
  })

  describe('Utility Methods', () => {
    test('should convert to array correctly', () => {
      const singleResult = new CollectionResult(mockSingleItem, assetManager)
      const arrayResult = new CollectionResult(mockMultipleItems, assetManager)
      const nullResult = new CollectionResult(null, assetManager)

      expect(singleResult.toArray()).toEqual([mockSingleItem])
      expect(arrayResult.toArray()).toBe(mockMultipleItems)
      expect(nullResult.toArray()).toEqual([])
    })

    test('should get first and last items correctly', () => {
      const singleResult = new CollectionResult(mockSingleItem, assetManager)
      const arrayResult = new CollectionResult(mockMultipleItems, assetManager)
      const nullResult = new CollectionResult(null, assetManager)

      expect(singleResult.first()).toBe(mockSingleItem)
      expect(singleResult.last()).toBe(mockSingleItem)

      expect(arrayResult.first()).toBe(mockMultipleItems[0])
      expect(arrayResult.last()).toBe(mockMultipleItems[2])

      expect(nullResult.first()).toBeNull()
      expect(nullResult.last()).toBeNull()
    })

    test('should support iteration', () => {
      const result = new CollectionResult(mockMultipleItems, assetManager)

      const items = []
      for (const item of result) {
        items.push(item)
      }

      expect(items).toEqual(mockMultipleItems)
    })

    test('should support mapping', () => {
      const result = new CollectionResult(mockMultipleItems, assetManager)

      const titles = result.map(item => item.data.title)
      expect(titles).toEqual(['Test Title', 'Second Title', 'Third Title'])
    })

    test('should support filtering', () => {
      const result = new CollectionResult(mockMultipleItems, assetManager)

      const filtered = result.filter(item => item.data.priority > 1)
      expect(filtered.count).toBe(2)
      expect(filtered.field('title')).toEqual(['Second Title', 'Third Title'])
    })

    test('should support find', () => {
      const result = new CollectionResult(mockMultipleItems, assetManager)

      const found = result.find(item => item.data.author === 'Jane Smith')
      expect(found?.data.title).toBe('Second Title')

      const notFound = result.find(item => item.data.author === 'Nonexistent')
      expect(notFound).toBeUndefined()
    })
  })

  describe('Serialization', () => {
    test('should serialize to JSON correctly', () => {
      const result = new CollectionResult(mockSingleItem, assetManager)

      const json = JSON.stringify(result)
      const parsed = JSON.parse(json)

      expect(parsed).toEqual(mockSingleItem)
    })

    test('should have meaningful string representation', () => {
      const singleResult = new CollectionResult(mockSingleItem, assetManager)
      const arrayResult = new CollectionResult(mockMultipleItems, assetManager)
      const nullResult = new CollectionResult(null, assetManager)

      expect(singleResult.toString()).toBe('CollectionResult(1 item)')
      expect(arrayResult.toString()).toBe('CollectionResult(3 items)')
      expect(nullResult.toString()).toBe('CollectionResult(null)')
    })
  })
})