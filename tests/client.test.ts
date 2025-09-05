/**
 * Tests for the main VibeCMS client class.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { VibeCMSClient } from '../src/core/client.js'
import { createVibeCMS } from '../src/factory.js'
import { CollectionQuery } from '../src/core/collection.js'
import { 
  mockFetch, 
  TEST_PROJECT_ID,
  createMockResponse,
  MOCK_PUBLIC_CONTENT_LIST_RESPONSE
} from './setup.js'

describe('VibeCMSClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor and Configuration', () => {
    test('creates client with valid config', () => {
      const client = new VibeCMSClient({
        projectId: TEST_PROJECT_ID,
      })

      expect(client.projectId).toBe(TEST_PROJECT_ID)
      expect(client.baseUrl).toBe('https://api.vibe-cms.com')
    })

    test('creates client with custom base URL', () => {
      const customBaseUrl = 'https://custom-api.example.com'
      const client = new VibeCMSClient({
        projectId: TEST_PROJECT_ID,
        baseUrl: customBaseUrl,
      })

      expect(client.baseUrl).toBe(customBaseUrl)
    })

    test('creates client with custom cache config', () => {
      const client = new VibeCMSClient({
        projectId: TEST_PROJECT_ID,
        cache: {
          enabled: false,
          ttl: 60000,
          storage: 'sessionStorage',
        },
      })

      const config = client.getConfig()
      expect(config.cache.enabled).toBe(false)
      expect(config.cache.ttl).toBe(60000)
      expect(config.cache.storage).toBe('sessionStorage')
    })

    test('throws error for missing project ID', () => {
      expect(() => new VibeCMSClient({ projectId: '' })).toThrow(
        'VMS SDK: projectId is required'
      )
    })

    test('throws error for invalid project ID format', () => {
      expect(() => new VibeCMSClient({ projectId: 'invalid@project' })).toThrow(
        'VMS SDK: Invalid projectId format'
      )
    })
  })

  describe('Collection Method', () => {
    test('creates collection query for valid slug', () => {
      const client = new VibeCMSClient({ projectId: TEST_PROJECT_ID })
      const collection = client.collection('blog-posts')

      expect(collection).toBeInstanceOf(CollectionQuery)
    })

    test('throws error for empty collection slug', () => {
      const client = new VibeCMSClient({ projectId: TEST_PROJECT_ID })
      
      expect(() => client.collection('')).toThrow(
        'VMS SDK: Collection slug is required'
      )
    })

    test('throws error for invalid collection slug format', () => {
      const client = new VibeCMSClient({ projectId: TEST_PROJECT_ID })
      
      expect(() => client.collection('Invalid_Slug')).toThrow(
        'VMS SDK: Invalid collection slug format'
      )
    })
  })

  describe('Cache Management', () => {
    test('clears cache successfully', async () => {
      const client = new VibeCMSClient({ projectId: TEST_PROJECT_ID })
      
      // Set some test data in localStorage
      localStorage.setItem('vms:test:key', 'value')
      
      await client.clearCache()
      
      // Cache clear should have been called
      expect(localStorage.clear).toHaveBeenCalled()
    })

    test('cleans up expired cache entries', async () => {
      const client = new VibeCMSClient({ projectId: TEST_PROJECT_ID })
      
      await expect(client.cleanupCache()).resolves.not.toThrow()
    })

    test('gets cache statistics', async () => {
      const client = new VibeCMSClient({ projectId: TEST_PROJECT_ID })
      
      const stats = await client.getCacheStats()
      
      expect(stats).toHaveProperty('enabled')
      expect(stats).toHaveProperty('storage')
      expect(stats).toHaveProperty('ttl')
      expect(stats).toHaveProperty('keys')
    })
  })

  describe('Connectivity', () => {
    test('ping returns success when API is accessible', async () => {
      const client = new VibeCMSClient({ projectId: TEST_PROJECT_ID })
      
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 'ok' })
      )
      
      const result = await client.ping()
      
      expect(result.success).toBe(true)
      expect(result.status).toBe('connected')
      expect(result.timestamp).toBeDefined()
    })

    test('ping returns failure when API is not accessible', async () => {
      const client = new VibeCMSClient({ projectId: TEST_PROJECT_ID })
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      const result = await client.ping()
      
      expect(result.success).toBe(false)
      expect(result.status).toBe('Network error')
      expect(result.timestamp).toBeDefined()
    })
  })

  describe('Scoped Collection', () => {
    test('creates scoped collection with bound methods', () => {
      const client = new VibeCMSClient({ projectId: TEST_PROJECT_ID })
      const scoped = client.scopedCollection('blog-posts')
      
      expect(scoped).toHaveProperty('first')
      expect(scoped).toHaveProperty('many')
      expect(scoped).toHaveProperty('all')
      expect(scoped).toHaveProperty('item')
      expect(scoped).toHaveProperty('clearCache')
      expect(scoped).toHaveProperty('getInfo')
    })
  })

  describe('createVibeCMS Factory', () => {
    test('factory creates VibeCMSClient instance', () => {
      const cms = createVibeCMS({ projectId: TEST_PROJECT_ID })
      
      expect(cms).toBeInstanceOf(VibeCMSClient)
      expect(cms.projectId).toBe(TEST_PROJECT_ID)
    })

    test('factory passes configuration correctly', () => {
      const config = {
        projectId: TEST_PROJECT_ID,
        baseUrl: 'https://custom.example.com',
        cache: { enabled: false },
      }
      
      const cms = createVibeCMS(config)
      
      expect(cms.projectId).toBe(TEST_PROJECT_ID)
      expect(cms.baseUrl).toBe('https://custom.example.com')
    })
  })

  describe('Integration Scenarios', () => {
    test('client with disabled cache works correctly', async () => {
      const client = new VibeCMSClient({
        projectId: TEST_PROJECT_ID,
        cache: { enabled: false },
      })

      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )

      const posts = await client.collection('blog-posts').all()

      expect(posts).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vibe-cms.com/api/public/proj_test123/blog-posts',
        expect.any(Object)
      )
    })

    test('client handles multiple collections', () => {
      const client = new VibeCMSClient({ projectId: TEST_PROJECT_ID })
      
      const blogPosts = client.collection('blog-posts')
      const pages = client.collection('pages')
      
      expect(blogPosts).toBeInstanceOf(CollectionQuery)
      expect(pages).toBeInstanceOf(CollectionQuery)
      expect(blogPosts).not.toBe(pages) // Should be different instances
    })
  })
})