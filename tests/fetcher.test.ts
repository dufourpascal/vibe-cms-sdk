/**
 * Tests for the Fetcher HTTP client.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { Fetcher } from '../src/core/fetcher.js'
import { VibeCMSError } from '../src/types/config.js'
import { 
  mockFetch,
  createMockResponse,
  createMockErrorResponse,
  createMockNetworkError,
  MOCK_PUBLIC_CONTENT_LIST_RESPONSE
} from './setup.js'

describe('Fetcher', () => {
  let fetcher: Fetcher

  beforeEach(() => {
    vi.clearAllMocks()
    fetcher = new Fetcher('https://api.vibe-cms.com')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor', () => {
    test('normalizes base URL by removing trailing slash', () => {
      const fetcherWithSlash = new Fetcher('https://api.vibe-cms.com/')
      expect(fetcherWithSlash['baseUrl']).toBe('https://api.vibe-cms.com')
    })

    test('preserves base URL without trailing slash', () => {
      const fetcherWithoutSlash = new Fetcher('https://api.vibe-cms.com')
      expect(fetcherWithoutSlash['baseUrl']).toBe('https://api.vibe-cms.com')
    })
  })

  describe('GET Requests', () => {
    test('makes successful GET request', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
      )

      const result = await fetcher.get('/api/test')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vibe-cms.com/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(result).toEqual(MOCK_PUBLIC_CONTENT_LIST_RESPONSE)
    })

    test('normalizes endpoint by adding leading slash', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true })
      )

      await fetcher.get('api/test')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vibe-cms.com/api/test',
        expect.any(Object)
      )
    })

    test('handles custom headers', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true })
      )

      await fetcher.get('/api/test', {
        headers: {
          'Authorization': 'Bearer token',
        },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vibe-cms.com/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token',
          }),
        })
      )
    })
  })

  describe('POST Requests', () => {
    test('makes successful POST request with JSON data', async () => {
      const postData = { name: 'Test', value: 123 }
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ id: 1, ...postData })
      )

      const result = await fetcher.post('/api/create', postData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vibe-cms.com/api/create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(result).toEqual({ id: 1, ...postData })
    })
  })

  describe('PUT Requests', () => {
    test('makes successful PUT request', async () => {
      const putData = { id: 1, name: 'Updated' }
      mockFetch.mockResolvedValueOnce(
        createMockResponse(putData)
      )

      const result = await fetcher.put('/api/update/1', putData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vibe-cms.com/api/update/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(putData),
        })
      )
      expect(result).toEqual(putData)
    })
  })

  describe('DELETE Requests', () => {
    test('makes successful DELETE request', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true })
      )

      const result = await fetcher.delete('/api/delete/1')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vibe-cms.com/api/delete/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
      expect(result).toEqual({ success: true })
    })
  })

  describe('Error Handling', () => {
    test('throws VibeCMSError for HTTP errors with JSON response', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse(404, 'Content not found')
      )

      await expect(fetcher.get('/api/missing')).rejects.toThrow(VibeCMSError)
      
      try {
        await fetcher.get('/api/missing')
      } catch (error) {
        expect(error).toBeInstanceOf(VibeCMSError)
        expect((error as VibeCMSError).message).toBe('Content not found')
        expect((error as VibeCMSError).status).toBe(404)
        expect((error as VibeCMSError).details).toEqual({ detail: 'Content not found' })
      }
    })

    test('handles different error message formats', async () => {
      // Test FastAPI detail format
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: () => Promise.resolve({ detail: 'Validation error' }),
        text: () => Promise.resolve(''),
      } as Response)

      await expect(fetcher.get('/api/invalid')).rejects.toThrow('Validation error')

      // Test generic error format
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Database connection failed' }),
        text: () => Promise.resolve(''),
      } as Response)

      await expect(fetcher.get('/api/error')).rejects.toThrow('Database connection failed')

      // Test nested detail format
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ 
          detail: { message: 'Invalid request format' }
        }),
        text: () => Promise.resolve(''),
      } as Response)

      await expect(fetcher.get('/api/bad')).rejects.toThrow('Invalid request format')
    })

    test('handles non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Not JSON')),
        text: () => Promise.resolve('Server crashed'),
      } as Response)

      await expect(fetcher.get('/api/crash')).rejects.toThrow('HTTP 500: Internal Server Error')
    })

    test('handles network errors', async () => {
      mockFetch.mockImplementation(() => createMockNetworkError('Network connection failed'))

      await expect(fetcher.get('/api/test')).rejects.toThrow(VibeCMSError)
      
      try {
        // Reset mock for the second call
        mockFetch.mockImplementation(() => createMockNetworkError('Network connection failed'))
        await fetcher.get('/api/test')
      } catch (error) {
        expect(error).toBeInstanceOf(VibeCMSError)
        expect((error as VibeCMSError).message).toBe('Network connection failed')
        expect((error as VibeCMSError).status).toBe(0)
      }
    })

    test('handles timeout errors', async () => {
      // Mock AbortError
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      
      mockFetch.mockRejectedValueOnce(abortError)

      await expect(
        fetcher.get('/api/slow', { timeout: 1000 })
      ).rejects.toThrow('Request timeout after 1000ms')
    })

    test('handles JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Malformed JSON')),
        text: () => Promise.resolve('Invalid JSON response'),
      } as Response)

      await expect(fetcher.get('/api/invalid-json')).rejects.toThrow(
        'Failed to parse response as JSON'
      )
    })
  })

  describe('Special Response Handling', () => {
    test('handles 204 No Content responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
      } as Response)

      const result = await fetcher.delete('/api/delete/1')

      expect(result).toBeUndefined()
    })
  })

  describe('Request Timeout', () => {
    test('uses default timeout', async () => {
      let abortSignal: AbortSignal | undefined

      mockFetch.mockImplementation((url, options) => {
        abortSignal = options?.signal
        return createMockResponse({ success: true })
      })

      await fetcher.get('/api/test')

      expect(abortSignal).toBeDefined()
      expect(abortSignal?.aborted).toBe(false)
    })

    test('uses custom timeout', async () => {
      let abortSignal: AbortSignal | undefined

      mockFetch.mockImplementation((url, options) => {
        abortSignal = options?.signal
        return createMockResponse({ success: true })
      })

      await fetcher.get('/api/test', { timeout: 5000 })

      expect(abortSignal).toBeDefined()
    })

    test('clears timeout on successful response', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true })
      )

      await fetcher.get('/api/test')

      expect(clearTimeoutSpy).toHaveBeenCalled()
      
      clearTimeoutSpy.mockRestore()
    })

    test('clears timeout on error response', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(fetcher.get('/api/error')).rejects.toThrow()

      expect(clearTimeoutSpy).toHaveBeenCalled()
      
      clearTimeoutSpy.mockRestore()
    })
  })
})