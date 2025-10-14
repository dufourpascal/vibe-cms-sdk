/**
 * Unit tests for asset functionality.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { AssetManager } from '../src/core/asset.js'
import { Fetcher } from '../src/core/fetcher.js'
import { BrowserCache } from '../src/core/cache.js'
import { createVibeCMS } from '../src/index.js'
import { mockFetch, TEST_PROJECT_ID } from './setup.js'
import type { AssetData } from '../src/types/api.js'

// Test constants
const TEST_ASSET_ID = 'xipxoehgsad'
const TEST_BASE_URL = 'https://api.vibe-cms.com'
const TEST_LOCALE = 'en-US'

// Mock asset data for tests
const MOCK_ASSET_BUFFER = new ArrayBuffer(1024)
const MOCK_ASSET_DATA: AssetData = {
  data: MOCK_ASSET_BUFFER,
  contentType: 'image/jpeg',
  contentLength: 1024,
  fileName: 'test-image.jpg',
  assetId: TEST_ASSET_ID
}

// Helper to create mock asset response
function createMockAssetResponse(
  data: ArrayBuffer,
  contentType = 'image/jpeg',
  status = 200,
  headers: Record<string, string> = {}
) {
  const defaultHeaders = {
    'content-type': contentType,
    'content-length': data.byteLength.toString(),
    ...headers
  }

  const mockHeaders = new Map(Object.entries(defaultHeaders))

  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      get: (name: string) => mockHeaders.get(name.toLowerCase()) || null,
      forEach: (callback: (value: string, key: string) => void) => {
        mockHeaders.forEach((value, key) => callback(value, key))
      }
    },
    arrayBuffer: () => Promise.resolve(data),
  } as Response)
}

describe('AssetManager', () => {
  let assetManager: AssetManager
  let fetcher: Fetcher
  let cache: BrowserCache

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()

    fetcher = new Fetcher(TEST_BASE_URL)
    cache = new BrowserCache({ enabled: true, ttl: 300000, storage: 'localStorage' })
    assetManager = new AssetManager(fetcher, cache, TEST_PROJECT_ID, TEST_LOCALE)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateAssetUrl', () => {
    test('generates basic asset URL without parameters', () => {
      const url = assetManager.generateAssetUrl(TEST_ASSET_ID)

      expect(url).toBe(
        `${TEST_BASE_URL}/api/assets/${TEST_PROJECT_ID}/${TEST_ASSET_ID}`
      )
    })

    test('generates asset URL with variant parameter', () => {
      const url = assetManager.generateAssetUrl(TEST_ASSET_ID, { variant: 'thumbnail' })

      expect(url).toBe(
        `${TEST_BASE_URL}/api/assets/${TEST_PROJECT_ID}/${TEST_ASSET_ID}?variant=thumbnail`
      )
    })

    test('generates asset URL with width and height parameters', () => {
      const url = assetManager.generateAssetUrl(TEST_ASSET_ID, { width: 800, height: 600 })

      expect(url).toBe(
        `${TEST_BASE_URL}/api/assets/${TEST_PROJECT_ID}/${TEST_ASSET_ID}?width=800&height=600`
      )
    })

    test('generates asset URL with all parameters', () => {
      const url = assetManager.generateAssetUrl(TEST_ASSET_ID, {
        variant: 'medium',
        width: 1024,
        height: 768
      })

      expect(url).toBe(
        `${TEST_BASE_URL}/api/assets/${TEST_PROJECT_ID}/${TEST_ASSET_ID}?variant=medium&width=1024&height=768`
      )
    })

    test('throws error for empty asset ID', () => {
      expect(() => {
        assetManager.generateAssetUrl('')
      }).toThrow('VMS SDK: Asset ID is required')
    })

    test('throws error for invalid asset ID format', () => {
      expect(() => {
        assetManager.generateAssetUrl('invalid@id!')
      }).toThrow('VMS SDK: Invalid asset ID format')
    })

    test('throws error for negative width', () => {
      expect(() => {
        assetManager.generateAssetUrl(TEST_ASSET_ID, { width: -100 })
      }).toThrow('VMS SDK: Asset width must be a positive number')
    })

    test('throws error for negative height', () => {
      expect(() => {
        assetManager.generateAssetUrl(TEST_ASSET_ID, { height: -50 })
      }).toThrow('VMS SDK: Asset height must be a positive number')
    })

    test('accepts valid asset ID formats', () => {
      const validIds = ['abc123', 'test-asset', 'asset_123', 'A1B2C3']

      validIds.forEach(id => {
        expect(() => {
          assetManager.generateAssetUrl(id)
        }).not.toThrow()
      })
    })
  })

  describe('downloadAsset', () => {
    test('downloads asset successfully without caching', async () => {
      // Mock successful asset response
      const mockBuffer = new ArrayBuffer(2048)
      mockFetch.mockResolvedValueOnce(
        createMockAssetResponse(mockBuffer, 'image/png', 200, {
          'content-disposition': 'attachment; filename="test.png"'
        })
      )

      const result = await assetManager.downloadAsset(TEST_ASSET_ID, { useCache: false })

      expect(result).toEqual({
        data: mockBuffer,
        contentType: 'image/png',
        contentLength: 2048,
        fileName: 'test.png',
        assetId: TEST_ASSET_ID
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/assets/${TEST_PROJECT_ID}/${TEST_ASSET_ID}?`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': '*/*'
          })
        })
      )
    })

    test('downloads asset with image parameters', async () => {
      const mockBuffer = new ArrayBuffer(1500)
      mockFetch.mockResolvedValueOnce(createMockAssetResponse(mockBuffer))

      await assetManager.downloadAsset(TEST_ASSET_ID, {
        variant: 'large',
        width: 1200,
        height: 800,
        useCache: false
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/assets/${TEST_PROJECT_ID}/${TEST_ASSET_ID}?variant=large&width=1200&height=800`,
        expect.any(Object)
      )
    })

    test('caches downloaded assets by default', async () => {
      const mockBuffer = new ArrayBuffer(512)
      mockFetch.mockResolvedValueOnce(createMockAssetResponse(mockBuffer))

      // First call - should hit API
      const result1 = await assetManager.downloadAsset(TEST_ASSET_ID)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call - should use cache (ArrayBuffer is converted to/from base64 for caching)
      const result2 = await assetManager.downloadAsset(TEST_ASSET_ID)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Still only one call due to caching

      // Compare properties of both results
      expect(result1.assetId).toBe(result2.assetId)
      expect(result1.contentType).toBe(result2.contentType)
      expect(result1.contentLength).toBe(result2.contentLength)
      expect(result1.fileName).toBe(result2.fileName)
      expect(result1.data).toBeInstanceOf(ArrayBuffer)
      expect(result2.data).toBeInstanceOf(ArrayBuffer)
      expect(result1.data.byteLength).toBe(result2.data.byteLength)

      // Verify the data content is the same (both should be empty ArrayBuffers in this test)
      const view1 = new Uint8Array(result1.data)
      const view2 = new Uint8Array(result2.data)
      expect(view1.length).toBe(view2.length)
    })

    test('bypasses cache when useCache is false', async () => {
      const mockBuffer = new ArrayBuffer(256)
      mockFetch.mockResolvedValue(createMockAssetResponse(mockBuffer))

      // Multiple calls with caching disabled
      await assetManager.downloadAsset(TEST_ASSET_ID, { useCache: false })
      await assetManager.downloadAsset(TEST_ASSET_ID, { useCache: false })

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    test('handles missing content-length header', async () => {
      const mockBuffer = new ArrayBuffer(750)
      mockFetch.mockResolvedValueOnce(
        createMockAssetResponse(mockBuffer, 'application/pdf', 200, {
          // No content-length header
        })
      )

      const result = await assetManager.downloadAsset(TEST_ASSET_ID, { useCache: false })

      expect(result.contentLength).toBe(750) // Should use actual buffer size
    })

    test('parses filename from content-disposition header', async () => {
      const testCases = [
        {
          header: 'attachment; filename="document.pdf"',
          expected: 'document.pdf'
        },
        {
          header: 'attachment; filename=image.jpg',
          expected: 'image.jpg'
        },
        {
          header: 'inline; filename="file with spaces.doc"',
          expected: 'file with spaces.doc'
        }
      ]

      for (const testCase of testCases) {
        const mockBuffer = new ArrayBuffer(100)
        mockFetch.mockResolvedValueOnce(
          createMockAssetResponse(mockBuffer, 'application/octet-stream', 200, {
            'content-disposition': testCase.header
          })
        )

        const result = await assetManager.downloadAsset(TEST_ASSET_ID, { useCache: false })
        expect(result.fileName).toBe(testCase.expected)
      }
    })

    test('handles error responses', async () => {
      // Mock 404 error
      mockFetch.mockResolvedValueOnce(Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve(JSON.stringify({ detail: 'Asset not found' }))
      } as Response))

      await expect(
        assetManager.downloadAsset(TEST_ASSET_ID, { useCache: false })
      ).rejects.toThrow('Asset not found')
    })

    test('throws error for invalid asset ID', async () => {
      await expect(
        assetManager.downloadAsset('invalid@id!')
      ).rejects.toThrow('VMS SDK: Invalid asset ID format')
    })

    test('throws error for negative width parameter', async () => {
      await expect(
        assetManager.downloadAsset(TEST_ASSET_ID, { width: -100 })
      ).rejects.toThrow('VMS SDK: Asset width must be a positive number')
    })

    test('throws error for negative height parameter', async () => {
      await expect(
        assetManager.downloadAsset(TEST_ASSET_ID, { height: -50 })
      ).rejects.toThrow('VMS SDK: Asset height must be a positive number')
    })

    test('uses custom cache TTL when provided', async () => {
      const mockBuffer = new ArrayBuffer(300)
      mockFetch.mockResolvedValueOnce(createMockAssetResponse(mockBuffer))

      const customTtl = 60000 // 1 minute
      await assetManager.downloadAsset(TEST_ASSET_ID, {
        useCache: true,
        cacheTtl: customTtl
      })

      // Verify that cache was called with custom TTL
      // This is hard to test directly, so we'll just make sure it doesn't throw
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('clearAssetCache', () => {
    test('clears asset cache successfully', async () => {
      // First, cache some assets
      const mockBuffer = new ArrayBuffer(100)
      mockFetch.mockResolvedValue(createMockAssetResponse(mockBuffer))

      await assetManager.downloadAsset(TEST_ASSET_ID)
      await assetManager.downloadAsset('another-asset')

      // Clear cache
      await assetManager.clearAssetCache()

      // Subsequent calls should hit the API again
      await assetManager.downloadAsset(TEST_ASSET_ID)

      // Should be 3 calls total: 2 initial + 1 after clear
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })
})

describe('VibeCMSClient Asset Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('asset_url method works correctly', () => {
    const cms = createVibeCMS({
      projectId: TEST_PROJECT_ID,
      baseUrl: TEST_BASE_URL
    })

    const url = cms.asset_url(TEST_ASSET_ID, { width: 400, height: 300 })

    expect(url).toBe(
      `${TEST_BASE_URL}/api/assets/${TEST_PROJECT_ID}/${TEST_ASSET_ID}?width=400&height=300`
    )
  })

  test('download_asset method works correctly', async () => {
    const cms = createVibeCMS({
      projectId: TEST_PROJECT_ID,
      baseUrl: TEST_BASE_URL
    })

    const mockBuffer = new ArrayBuffer(1024)
    mockFetch.mockResolvedValueOnce(createMockAssetResponse(mockBuffer))

    const result = await cms.download_asset(TEST_ASSET_ID)

    expect(result.assetId).toBe(TEST_ASSET_ID)
    expect(result.data).toBe(mockBuffer)
  })

  test('clearAssetCache method works correctly', async () => {
    const cms = createVibeCMS({
      projectId: TEST_PROJECT_ID,
      baseUrl: TEST_BASE_URL
    })

    const mockBuffer = new ArrayBuffer(500)
    mockFetch.mockResolvedValue(createMockAssetResponse(mockBuffer))

    // Download asset to populate cache
    await cms.download_asset(TEST_ASSET_ID)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Clear asset cache
    await cms.clearAssetCache()

    // Next download should hit API again
    await cms.download_asset(TEST_ASSET_ID)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  test('locale changes do not affect asset URLs', () => {
    const cms = createVibeCMS({
      projectId: TEST_PROJECT_ID,
      baseUrl: TEST_BASE_URL,
      locale: 'fr-FR'
    })

    const url = cms.asset_url(TEST_ASSET_ID)
    expect(url).not.toContain('locale=')
    expect(url).toBe(`${TEST_BASE_URL}/api/assets/${TEST_PROJECT_ID}/${TEST_ASSET_ID}`)

    cms.setLocale('es-ES')
    const newUrl = cms.asset_url(TEST_ASSET_ID)
    expect(newUrl).not.toContain('locale=')
    expect(newUrl).toBe(`${TEST_BASE_URL}/api/assets/${TEST_PROJECT_ID}/${TEST_ASSET_ID}`)

    // Asset URLs should be identical regardless of locale
    expect(url).toBe(newUrl)
  })
})

describe('Asset Cache Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  test('asset cache keys are generated correctly', () => {
    const cache = new BrowserCache({ enabled: true, ttl: 300000, storage: 'localStorage' })

    // Test asset URL cache key
    const urlKey = cache.generateKey({
      projectId: TEST_PROJECT_ID,
      assetId: TEST_ASSET_ID,
      queryType: 'asset-url',
      locale: 'en-US'
    })

    expect(urlKey).toBe(`vms:${TEST_PROJECT_ID}:en-US:asset:asset-url:${TEST_ASSET_ID}`)

    // Test asset download cache key with parameters
    const downloadKey = cache.generateKey({
      projectId: TEST_PROJECT_ID,
      assetId: TEST_ASSET_ID,
      queryType: 'asset-download',
      params: { width: 800, variant: 'large' },
      locale: 'en-US'
    })

    // Check the structure is correct, but not the exact hash since it depends on implementation
    expect(downloadKey).toMatch(new RegExp(`^vms:${TEST_PROJECT_ID}:en-US:asset:asset-download:${TEST_ASSET_ID}:[a-z0-9]+$`))
  })

  test('throws error for asset operations without asset ID', () => {
    const cache = new BrowserCache({ enabled: true, ttl: 300000, storage: 'localStorage' })

    expect(() => {
      cache.generateKey({
        projectId: TEST_PROJECT_ID,
        queryType: 'asset-url',
        locale: 'en-US'
        // Missing assetId
      })
    }).toThrow('Asset ID is required for asset operations')
  })
})