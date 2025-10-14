/**
 * Test setup and global mocks for VMS SDK tests.
 */

import { vi } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage and sessionStorage
const createMockStorage = () => {
  const store = new Map<string, string>()
  
  return {
    getItem: vi.fn((key: string) => store.get(key) || null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() {
      return store.size
    },
    key: vi.fn((index: number) => Array.from(store.keys())[index] || null),
  }
}

Object.defineProperty(global, 'localStorage', {
  value: createMockStorage(),
})

Object.defineProperty(global, 'sessionStorage', {
  value: createMockStorage(),
})

// Export commonly used test utilities
export { mockFetch }

// Test data that matches backend/tests/test_public_api.py
export const TEST_PROJECT_ID = 'proj_test123'
export const TEST_COLLECTION_SLUG = 'blog-posts'
export const TEST_ITEM_ID = 'item_published123'

export const MOCK_PUBLIC_CONTENT_ITEM = {
  id: TEST_ITEM_ID,
  status: 'published' as const,
  data: {
    title: 'Test Public Blog Post',
    content: 'This is public content for the blog post',
    author: 'Public Author',
  },
  metadata: {
    seo_title: 'Test SEO Title',
    seo_description: 'Test SEO description',
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const MOCK_PUBLIC_COLLECTION = {
  slug: TEST_COLLECTION_SLUG,
  name: 'Blog Posts',
  description: 'Public blog posts collection',
  is_singleton: false,
}

// Public API returns items directly (not wrapped in response object)
export const MOCK_PUBLIC_CONTENT_RESPONSE = MOCK_PUBLIC_CONTENT_ITEM

// Public API returns array of items directly
export const MOCK_PUBLIC_CONTENT_LIST_RESPONSE = [MOCK_PUBLIC_CONTENT_ITEM]

// Helper to create a successful fetch response
export function createMockResponse<T>(data: T, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response)
}

// Helper to create a failed fetch response
export function createMockErrorResponse(status: number, detail: string) {
  return Promise.resolve({
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.resolve({ detail }),
    text: () => Promise.resolve(JSON.stringify({ detail })),
  } as Response)
}

// Helper to create network error
export function createMockNetworkError(message: string) {
  return Promise.reject(new Error(message))
}