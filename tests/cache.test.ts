/**
 * Tests for the BrowserCache implementation.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { BrowserCache } from '../src/core/cache.js'

describe('BrowserCache', () => {
  let cache: BrowserCache

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('LocalStorage Cache', () => {
    beforeEach(() => {
      cache = new BrowserCache({
        enabled: true,
        ttl: 60000, // 1 minute for testing
        storage: 'localStorage',
      })
    })

    test('stores and retrieves data', async () => {
      const testData = { message: 'Hello World', timestamp: Date.now() }
      const key = 'test-key'

      await cache.set(key, testData)
      const retrieved = await cache.get<typeof testData>(key)

      expect(retrieved).toEqual(testData)
    })

    test('returns null for non-existent keys', async () => {
      const result = await cache.get('nonexistent-key')
      expect(result).toBeNull()
    })

    test('expires data after TTL', async () => {
      const shortTtlCache = new BrowserCache({
        enabled: true,
        ttl: 10, // 10ms
        storage: 'localStorage',
      })

      await shortTtlCache.set('test-key', 'test-value')
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20))
      
      const result = await shortTtlCache.get('test-key')
      expect(result).toBeNull()
    })

    test('removes expired data on access', async () => {
      const shortTtlCache = new BrowserCache({
        enabled: true,
        ttl: 10,
        storage: 'localStorage',
      })

      await shortTtlCache.set('test-key', 'test-value')
      
      // Verify it's stored
      expect(localStorage.setItem).toHaveBeenCalled()
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20))
      
      // Access should remove expired data
      await shortTtlCache.get('test-key')
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('test-key')
    })

    test('uses custom TTL per item', async () => {
      const customTtl = 30000 // 30 seconds
      await cache.set('test-key', 'test-value', customTtl)

      // Verify the custom TTL is stored
      const storedItem = localStorage.getItem('test-key')
      expect(storedItem).toBeTruthy()
      
      const parsed = JSON.parse(storedItem as string)
      expect(parsed.ttl).toBe(customTtl)
    })

    test('removes data', async () => {
      await cache.set('test-key', 'test-value')
      await cache.remove('test-key')

      const result = await cache.get('test-key')
      expect(result).toBeNull()
    })

    test('clears all cache data', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      
      await cache.clear()

      expect(localStorage.clear).toHaveBeenCalled()
    })

    test('checks if key exists and is not expired', async () => {
      await cache.set('test-key', 'test-value')
      
      const exists = await cache.has('test-key')
      expect(exists).toBe(true)
      
      const notExists = await cache.has('nonexistent')
      expect(notExists).toBe(false)
    })

    test('handles storage errors gracefully', async () => {
      // Mock localStorage to throw an error
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      // Should not throw, but log warning
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      await expect(cache.set('test-key', 'test-value')).resolves.not.toThrow()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('VMS SDK: LocalStorage operation failed'),
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('SessionStorage Cache', () => {
    beforeEach(() => {
      cache = new BrowserCache({
        enabled: true,
        ttl: 60000,
        storage: 'sessionStorage',
      })
    })

    test('uses sessionStorage when configured', async () => {
      await cache.set('test-key', 'test-value')
      
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        expect.stringContaining('test-value')
      )
    })
  })

  describe('Disabled Cache', () => {
    beforeEach(() => {
      cache = new BrowserCache({
        enabled: false,
        ttl: 60000,
        storage: 'localStorage',
      })
    })

    test('returns null when disabled', async () => {
      await cache.set('test-key', 'test-value')
      const result = await cache.get('test-key')
      
      expect(result).toBeNull()
    })

    test('set operations do nothing when disabled', async () => {
      await cache.set('test-key', 'test-value')
      
      // Should not call localStorage.setItem
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('Cache Key Generation', () => {
    beforeEach(() => {
      cache = new BrowserCache({
        enabled: true,
        ttl: 60000,
        storage: 'localStorage',
      })
    })

    test('generates consistent keys for same components', () => {
      const components = {
        projectId: 'test-project',
        collectionSlug: 'blog-posts',
        queryType: 'first' as const,
      }

      const key1 = cache.generateKey(components)
      const key2 = cache.generateKey(components)

      expect(key1).toBe(key2)
      expect(key1).toBe('vms:test-project:en-US:blog-posts:first')
    })

    test('includes item ID in key when provided', () => {
      const components = {
        projectId: 'test-project',
        collectionSlug: 'blog-posts',
        queryType: 'item' as const,
        itemId: 'item123',
      }

      const key = cache.generateKey(components)

      expect(key).toBe('vms:test-project:en-US:blog-posts:item:item123')
    })

    test('includes parameter hash when provided', () => {
      const components = {
        projectId: 'test-project',
        collectionSlug: 'blog-posts',
        queryType: 'many' as const,
        params: { limit: 10 },
      }

      const key = cache.generateKey(components)

      expect(key).toContain('vms:test-project:en-US:blog-posts:many:')
      expect(key.split(':').length).toBe(6) // Should have param hash
    })

    test('generates different keys for different parameters', () => {
      const components1 = {
        projectId: 'test-project',
        collectionSlug: 'blog-posts',
        queryType: 'many' as const,
        params: { limit: 5 },
      }

      const components2 = {
        projectId: 'test-project',
        collectionSlug: 'blog-posts',
        queryType: 'many' as const,
        params: { limit: 10 },
      }

      const key1 = cache.generateKey(components1)
      const key2 = cache.generateKey(components2)

      expect(key1).not.toBe(key2)
    })

    test('generates different keys for different locales', () => {
      const baseComponents = {
        projectId: 'test-project',
        collectionSlug: 'blog-posts',
        queryType: 'first' as const,
      }

      const keyEnUS = cache.generateKey({ ...baseComponents, locale: 'en-US' })
      const keyFrFR = cache.generateKey({ ...baseComponents, locale: 'fr-FR' })
      const keyDefault = cache.generateKey(baseComponents) // Should use en-US default

      expect(keyEnUS).toBe('vms:test-project:en-US:blog-posts:first')
      expect(keyFrFR).toBe('vms:test-project:fr-FR:blog-posts:first')
      expect(keyDefault).toBe('vms:test-project:en-US:blog-posts:first')
      expect(keyEnUS).toBe(keyDefault)
      expect(keyEnUS).not.toBe(keyFrFR)
    })

    test('clearLocaleCache removes only specified locale keys', async () => {
      const projectId = 'test-project'
      const enUSKey = cache.generateKey({
        projectId,
        collectionSlug: 'blog-posts',
        queryType: 'first' as const,
        locale: 'en-US',
      })
      const frFRKey = cache.generateKey({
        projectId,
        collectionSlug: 'blog-posts',
        queryType: 'first' as const,
        locale: 'fr-FR',
      })

      // Set data for both locales
      await cache.set(enUSKey, { data: 'english' })
      await cache.set(frFRKey, { data: 'french' })

      // Verify both exist
      expect(await cache.get(enUSKey)).toEqual({ data: 'english' })
      expect(await cache.get(frFRKey)).toEqual({ data: 'french' })

      // Clear only en-US locale
      await cache.clearLocaleCache(projectId, 'en-US')

      // Verify en-US is cleared but fr-FR remains
      expect(await cache.get(enUSKey)).toBeNull()
      expect(await cache.get(frFRKey)).toEqual({ data: 'french' })
    })
  })

  describe('Cache Cleanup', () => {
    beforeEach(() => {
      cache = new BrowserCache({
        enabled: true,
        ttl: 60000,
        storage: 'localStorage',
      })
    })

    test('cleanup removes expired entries', async () => {
      const shortTtlCache = new BrowserCache({
        enabled: true,
        ttl: 10,
        storage: 'localStorage',
      })

      // Add some entries
      await shortTtlCache.set('vms:test:key1', 'value1')
      await shortTtlCache.set('vms:test:key2', 'value2')
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20))
      
      // Cleanup should remove expired entries
      await shortTtlCache.cleanup()
      
      // Verify removal was attempted
      expect(localStorage.removeItem).toHaveBeenCalled()
    })

    test('cleanup ignores non-VMS keys', async () => {
      // Mock localStorage.key and localStorage.length to simulate mixed keys
      const originalKey = localStorage.key
      const originalLength = Object.getOwnPropertyDescriptor(localStorage, 'length')

      // Mock localStorage to have 3 items with mixed keys
      Object.defineProperty(localStorage, 'length', {
        value: 3,
        configurable: true,
      })

      vi.mocked(localStorage.key).mockImplementation((index: number) => {
        const keys = ['vms:test:key1', 'other-app:key', 'vms:test:key2']
        return keys[index] || null
      })

      await cache.cleanup()

      // Should only process VMS keys
      expect(localStorage.getItem).toHaveBeenCalledWith('vms:test:key1')
      expect(localStorage.getItem).toHaveBeenCalledWith('vms:test:key2')
      expect(localStorage.getItem).not.toHaveBeenCalledWith('other-app:key')

      // Restore original implementations
      localStorage.key = originalKey
      if (originalLength) {
        Object.defineProperty(localStorage, 'length', originalLength)
      }
    })
  })

  describe('Storage Fallbacks', () => {
    test('falls back to memory storage when browser storage unavailable', () => {
      // Mock both localStorage and sessionStorage to throw
      const originalLocalStorage = localStorage
      const originalSessionStorage = sessionStorage
      
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        configurable: true,
      })
      
      Object.defineProperty(global, 'sessionStorage', {
        value: undefined,
        configurable: true,
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const fallbackCache = new BrowserCache({
        enabled: true,
        ttl: 60000,
        storage: 'localStorage',
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('VMS SDK: Browser storage not available')
      )

      // Restore original storage
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
      })
      
      Object.defineProperty(global, 'sessionStorage', {
        value: originalSessionStorage,
        configurable: true,
      })
      
      consoleSpy.mockRestore()
    })
  })
})