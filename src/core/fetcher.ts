/**
 * Native fetch wrapper with error handling for VMS public API.
 * Follows the same error handling patterns as frontend/src/composables/useApi.ts
 */

import { VibeCMSError } from '../types/config.js'

/**
 * HTTP methods supported by the fetcher.
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/**
 * Options for making HTTP requests.
 */
interface RequestOptions extends Omit<RequestInit, 'method'> {
  method?: HttpMethod
  timeout?: number
}

/**
 * Default request timeout in milliseconds (30 seconds).
 */
const DEFAULT_TIMEOUT = 30000

/**
 * Fetcher class for making HTTP requests to the VMS public API.
 */
export class Fetcher {
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  }

  /**
   * Make a GET request.
   */
  async get<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' })
  }

  /**
   * Make a POST request.
   */
  async post<T>(endpoint: string, data: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  }

  /**
   * Make a PUT request.
   */
  async put<T>(endpoint: string, data: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  }

  /**
   * Make a DELETE request.
   */
  async delete<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' })
  }

  /**
   * Make an HTTP request with comprehensive error handling.
   */
  private async makeRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      timeout = DEFAULT_TIMEOUT,
      method = 'GET',
      headers = {},
      ...fetchOptions
    } = options

    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = `${this.baseUrl}${normalizedEndpoint}`

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      // Make the request with timeout
      const response = await fetch(url, {
        ...fetchOptions,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Handle non-ok responses
      if (!response.ok) {
        await this.handleErrorResponse(response)
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return undefined as unknown as T
      }

      // Parse JSON response
      try {
        const result = await response.json()
        return result as T
      } catch (parseError) {
        throw new VibeCMSError(
          'Failed to parse response as JSON',
          response.status,
          { parseError, responseText: await response.text() }
        )
      }
    } catch (error) {
      clearTimeout(timeoutId)

      // Handle timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw new VibeCMSError(
          `Request timeout after ${timeout}ms`,
          408,
          { timeout, url }
        )
      }

      // Re-throw VibeCMSError instances
      if (error instanceof VibeCMSError) {
        throw error
      }

      // Handle other network errors
      throw new VibeCMSError(
        error instanceof Error ? error.message : 'Network error occurred',
        0,
        { originalError: error, url }
      )
    }
  }

  /**
   * Handle error responses following the same pattern as useApi.ts.
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    let errorDetails: unknown = null

    try {
      const errorData = await response.json()
      errorDetails = errorData

      // Handle structured error responses from backend
      // Following the same pattern as frontend/src/composables/useApi.ts
      if (errorData.message && typeof errorData.message === 'string') {
        errorMessage = errorData.message
      } else if (typeof errorData.detail === 'string') {
        // FastAPI default detail field (string)
        errorMessage = errorData.detail
      } else if (typeof errorData.error === 'string') {
        // Generic error field (string)
        errorMessage = errorData.error
      } else if (typeof errorData.detail === 'object' && errorData.detail?.message) {
        // Handle nested detail object with message
        errorMessage = errorData.detail.message
      }
    } catch {
      // If response body isn't JSON, use status text
      try {
        const textResponse = await response.text()
        if (textResponse) {
          errorDetails = { responseText: textResponse }
        }
      } catch {
        // Ignore text parsing errors
      }
    }

    throw new VibeCMSError(errorMessage, response.status, errorDetails)
  }
}