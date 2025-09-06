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

    // DEBUG: Log request details
    console.log('🔍 SDK DEBUG: Making request:', {
      method,
      url,
      baseUrl: this.baseUrl,
      endpoint,
      normalizedEndpoint,
      timeout,
      requestHeaders: headers,
      fetchOptions: { ...fetchOptions, body: fetchOptions.body ? '[BODY_PRESENT]' : undefined }
    })

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      // Final headers that will be sent
      const finalHeaders = {
        'Content-Type': 'application/json',
        ...headers,
      }

      console.log('🔍 SDK DEBUG: Final request headers:', finalHeaders)

      // Make the request with timeout
      const response = await fetch(url, {
        ...fetchOptions,
        method,
        headers: finalHeaders,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Log headers in a TypeScript-friendly way
      const responseHeaders: Record<string, string> = {}
      if (response.headers && typeof response.headers.forEach === 'function') {
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value
        })
      }

      console.log('🔍 SDK DEBUG: Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
        headers: responseHeaders
      })

      // Handle non-ok responses
      if (!response.ok) {
        await this.handleErrorResponse(response)
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        console.log('🔍 SDK DEBUG: 204 No Content response')
        return undefined as unknown as T
      }

      // Parse JSON response
      try {
        const result = await response.json()
        console.log('🔍 SDK DEBUG: Successful response parsed:', {
          hasData: !!result,
          keys: result && typeof result === 'object' ? Object.keys(result) : 'not-object'
        })
        return result as T
      } catch (parseError) {
        console.log('🔍 SDK DEBUG: Failed to parse JSON response:', parseError)
        const responseText = await response.text()
        console.log('🔍 SDK DEBUG: Raw response text:', responseText)
        throw new VibeCMSError(
          'Failed to parse response as JSON',
          response.status,
          { parseError, responseText }
        )
      }
    } catch (error) {
      clearTimeout(timeoutId)
      
      console.log('🔍 SDK DEBUG: Request failed with error:', {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorName: error instanceof Error ? error.name : 'unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        url
      })

      // Handle timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🔍 SDK DEBUG: Request timed out after', timeout, 'ms')
        throw new VibeCMSError(
          `Request timeout after ${timeout}ms`,
          408,
          { timeout, url }
        )
      }

      // Re-throw VibeCMSError instances
      if (error instanceof VibeCMSError) {
        console.log('🔍 SDK DEBUG: Re-throwing VibeCMSError:', error.message, error.status)
        throw error
      }

      // Handle other network errors
      console.log('🔍 SDK DEBUG: Throwing network error for unknown error type')
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
    console.log('🔍 SDK DEBUG: Handling error response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    })

    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    let errorDetails: unknown = null

    try {
      const errorData = await response.json()
      errorDetails = errorData
      console.log('🔍 SDK DEBUG: Error response JSON:', errorData)

      // Handle structured error responses from backend
      // Following the same pattern as frontend/src/composables/useApi.ts
      if (errorData.message && typeof errorData.message === 'string') {
        errorMessage = errorData.message
        console.log('🔍 SDK DEBUG: Using errorData.message:', errorMessage)
      } else if (typeof errorData.detail === 'string') {
        // FastAPI default detail field (string)
        errorMessage = errorData.detail
        console.log('🔍 SDK DEBUG: Using errorData.detail (string):', errorMessage)
      } else if (typeof errorData.error === 'string') {
        // Generic error field (string)
        errorMessage = errorData.error
        console.log('🔍 SDK DEBUG: Using errorData.error:', errorMessage)
      } else if (typeof errorData.detail === 'object' && errorData.detail?.message) {
        // Handle nested detail object with message
        errorMessage = errorData.detail.message
        console.log('🔍 SDK DEBUG: Using errorData.detail.message:', errorMessage)
      }
    } catch (jsonError) {
      console.log('🔍 SDK DEBUG: Failed to parse error response as JSON:', jsonError)
      // If response body isn't JSON, use status text
      try {
        const textResponse = await response.text()
        console.log('🔍 SDK DEBUG: Error response text:', textResponse)
        if (textResponse) {
          errorDetails = { responseText: textResponse }
        }
      } catch (textError) {
        console.log('🔍 SDK DEBUG: Failed to read error response as text:', textError)
        // Ignore text parsing errors
      }
    }

    console.log('🔍 SDK DEBUG: Throwing VibeCMSError:', { errorMessage, status: response.status, errorDetails })
    throw new VibeCMSError(errorMessage, response.status, errorDetails)
  }
}