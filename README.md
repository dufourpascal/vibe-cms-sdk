# Vibe CMS TypeScript SDK

[![npm version](https://badge.fury.io/js/%40dufourpascal%2Fvibe-cms-sdk.svg)](https://badge.fury.io/js/%40dufourpascal%2Fvibe-cms-sdk)
[![CI](https://github.com/dufourpascal/vibe-cms-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/dufourpascal/vibe-cms-sdk/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Framework-agnostic TypeScript SDK for Vibe CMS - AI-powered content management system with instant rollback, one-click translation, and automated SEO optimization.

## Features

- **🔗 Chainable API**: Intuitive, fluent interface for content queries
- **🎯 Framework Agnostic**: Works with Vue, React, Angular, and vanilla TypeScript
- **⚡ Intelligent Caching**: Browser localStorage/sessionStorage with TTL
- **📦 Zero Dependencies**: Native Fetch API only
- **🔒 Type Safe**: Full TypeScript support with IntelliSense
- **📱 Dual Module Support**: Both CommonJS and ESM builds

## Installation

Install from public NPM registry:

```bash
npm install vibe-cms-sdk
```

## Quick Start

### Basic Usage

```typescript
import { createVibeCMS } from 'vibe-cms-sdk'

// Initialize the CMS client
const cms = createVibeCMS({
  projectId: 'your-project-id',
  baseUrl: 'https://api.vibe-cms.com', // optional, defaults to this
  locale: 'en-US',  // optional, defaults to 'en-US'
  cache: {
    enabled: true,    // optional, defaults to true
    ttl: 300000,     // optional, 5 minutes default
    storage: 'localStorage' // optional, 'localStorage' | 'sessionStorage'
  }
})

// Query content using the chainable API
const firstPost = await cms.collection('blog_posts').first()
const title = firstPost.field('title')           // Extract field directly
const imageUrl = firstPost.asset_url('featured_image')  // Generate asset URL

const allPosts = await cms.collection('blog_posts').many({ limit: 10 })
const titles = allPosts.field('title')           // ['Title 1', 'Title 2', ...]
const imageUrls = allPosts.asset_url('featured_image')  // Bulk asset URLs
```

### Singleton Pattern (Recommended)

For most applications, create a single shared SDK instance:

```typescript
// lib/cms.ts
import { createVibeCMS } from 'vibe-cms-sdk'

export const cms = createVibeCMS({
  projectId: process.env.VIBE_CMS_PROJECT_ID || 'your-project-id',
  cache: { enabled: true, ttl: 300000 }
})

// components/BlogList.tsx
import { cms } from '@/lib/cms'

export async function getBlogPosts() {
  const posts = await cms.collection('blog_posts').many({ limit: 10 })
  return posts.map(post => ({
    title: post.field('title'),
    excerpt: post.field('excerpt'),
    imageUrl: post.asset_url('featured_image')
  }))
}
```

## Common Patterns

### Fetching Content

```typescript
// Get a single item (first in collection)
const featuredPost = await cms.collection('blog_posts').first()

// Get all items in a collection
const allPosts = await cms.collection('blog_posts').all()

// Get multiple items with client-side limit
const recentPosts = await cms.collection('blog_posts').many({ limit: 10 })

// Get a specific item by ID
const post = await cms.collection('blog_posts').item('item-123')
```

### Working with Pagination

The SDK uses **client-side pagination** - the API returns all items, then applies the limit locally:

```typescript
// Fetch first 10 items (all items are fetched, then limited client-side)
const page1 = await cms.collection('blog_posts').many({ limit: 10 })

// For manual pagination, fetch all and slice:
const allPosts = await cms.collection('blog_posts').all()
const postsArray = allPosts.toArray()

const page1 = postsArray.slice(0, 10)   // Items 0-9
const page2 = postsArray.slice(10, 20)  // Items 10-19
const page3 = postsArray.slice(20, 30)  // Items 20-29
```

**Important:** There is no server-side pagination (offset/skip). For collections with many items, consider:
- Using `.first()` for single items
- Using `.many({ limit })` for reasonable limits
- Implementing client-side pagination with `.all()` and array slicing
- Leveraging caching to reduce API calls

### Error Handling

```typescript
import { VibeCMSError } from 'vibe-cms-sdk'

try {
  const posts = await cms.collection('blog_posts').all()
  // Process posts...
} catch (error) {
  if (error instanceof VibeCMSError) {
    console.error('CMS Error:', error.message)
    console.error('Status:', error.status)
    console.error('Details:', error.details)
  } else {
    console.error('Network Error:', error.message)
  }
}
```

### Loading States in Components

```typescript
// React example
function BlogPosts() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cms.collection('blog_posts').many({ limit: 10 })
      .then(result => {
        setPosts(result.toArray())
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.field('title')}</h2>
        </article>
      ))}
    </div>
  )
}
```

### Working with Locales

```typescript
// Set locale for all subsequent requests
cms.setLocale('fr-FR')
const frenchPosts = await cms.collection('blog_posts').many()

// Switch locales dynamically
cms.setLocale('es-ES')
const spanishPosts = await cms.collection('blog_posts').many()

// Each locale has separate cache
cms.setLocale('en-US')
const englishPosts = await cms.collection('blog_posts').many() // Fresh API call

// Clear cache for specific locale
await cms.clearLocaleCache('fr-FR')
```

## API Reference

### `createVibeCMS(config)`

Creates a new CMS client instance.

**Parameters:**
- `config.projectId` (string, required): Your Vibe CMS project ID
- `config.baseUrl` (string, optional): API base URL, defaults to `https://api.vibe-cms.com`
- `config.locale` (string, optional): Default locale for content requests, defaults to `'en-US'`
- `config.cache` (object, optional): Caching configuration

**Cache Configuration:**
- `enabled` (boolean): Enable/disable caching, defaults to `true`
- `ttl` (number): Time to live in milliseconds, defaults to `300000` (5 minutes)
- `storage` (string): Storage type, `'localStorage'` or `'sessionStorage'`, defaults to `'localStorage'`

### Collection Methods

#### `.collection(slug)`

Creates a collection query for the specified collection slug.

```typescript
const posts = cms.collection('blog_posts')
```

#### `.first()`

Returns the first item from the collection, or `null` if empty.

```typescript
const firstPost = await cms.collection('blog_posts').first()
```

#### `.many(options?)`

Returns an array of items with optional limit.

```typescript
const recentPosts = await cms.collection('blog_posts').many({ limit: 10 })
const defaultMany = await cms.collection('blog_posts').many() // returns all items (no limit)
```

#### `.all()`

Returns all items from the collection.

```typescript
const allPosts = await cms.collection('blog_posts').all()
```

#### `.item(itemId)`

Returns a specific item by ID, or `null` if not found.

```typescript
const post = await cms.collection('blog_posts').item('item-123')
```

### Localization Methods

#### `.setLocale(locale)`

Sets the current locale for content requests. This affects all subsequent content queries and uses separate cache per locale.

```typescript
cms.setLocale('fr-FR')  // Set to French (France)
cms.setLocale('es')     // Set to Spanish
```

#### `.getLocale()`

Gets the current locale.

```typescript
const currentLocale = cms.getLocale()  // Returns current locale, e.g., 'en-US'
```

#### `.clearLocaleCache(locale?)`

Clears cached data for a specific locale, or current locale if not specified.

```typescript
await cms.clearLocaleCache('fr-FR')  // Clear French cache
await cms.clearLocaleCache()         // Clear current locale cache
```

### Caching Methods

#### `.clearCache()`

Clears cached data for the collection.

```typescript
await cms.collection('blog_posts').clearCache()
```

## 🎯 Enhanced Field Extraction & Asset Handling

The SDK now includes powerful field extraction and asset handling capabilities that make working with content much more efficient.

### Field Extraction

Extract field values directly without accessing `.data` every time:

```typescript
// Single items
const post = await cms.collection('blog_posts').first()
const title = post.field('title')           // Instead of post.raw.data.title
const author = post.field('author')         // Clean and simple
const tags = post.field('tags')             // Works with any data type

// Multiple items - get arrays of values
const posts = await cms.collection('blog_posts').many({ limit: 10 })
const allTitles = posts.field('title')      // ['Post 1', 'Post 2', ...]
const allAuthors = posts.field('author')    // ['John', 'Jane', ...]
const allTags = posts.field('tags')         // [['tech'], ['design', 'ui'], ...]
```

### Asset Handling

Generate asset URLs and download assets directly from field values:

```typescript
// Single asset URLs (returns the original asset)
const post = await cms.collection('blog_posts').first()
const imageUrl = post.asset_url('featured_image')

// Image transformation with width/height
// Width and height maintain aspect ratio unless both are specified
const thumbnailUrl = post.asset_url('featured_image', { width: 300 })
const exactSizeUrl = post.asset_url('featured_image', { width: 300, height: 200 })

// Using pre-configured variants (if set up in Vibe CMS)
// Variants are defined in your Vibe CMS project settings
const thumbUrl = post.asset_url('featured_image', { variant: 'thumbnail' })
const largeUrl = post.asset_url('featured_image', { variant: 'large' })

// Combining transformations
const customUrl = post.asset_url('featured_image', {
  variant: 'large',
  width: 800,
  height: 600
})

// Multiple asset URLs (bulk generation)
const posts = await cms.collection('blog_posts').many()
const allImageUrls = posts.asset_url('featured_image')  // ['url1', 'url2', ...]

// Asset arrays (galleries)
const galleryUrls = post.asset_url('gallery')  // ['url1', 'url2', ...] if gallery is an array field

// Download assets (fetches binary data)
const imageData = await post.download_asset('featured_image')
console.log(imageData.contentType)      // e.g., 'image/jpeg'
console.log(imageData.contentLength)    // size in bytes
console.log(imageData.fileName)         // original file name

// Download with transformations
const thumbnailData = await post.download_asset('featured_image', {
  width: 300,
  height: 200,
  useCache: true  // cache the downloaded binary (default: true)
})
```

**Asset transformation options:**
- `width`: Width in pixels (maintains aspect ratio if height not specified)
- `height`: Height in pixels (maintains aspect ratio if width not specified)
- `variant`: Use pre-configured variant from Vibe CMS (e.g., 'thumbnail', 'medium', 'large')

**Note:** When both width and height are specified, the image may be cropped to fit exact dimensions.

### Collection Result Methods

Enhanced results provide utility methods for easier data manipulation:

```typescript
const posts = await cms.collection('blog_posts').many()

// Utility properties
console.log(posts.count)        // Number of items
console.log(posts.isEmpty)      // Boolean
console.log(posts.isArray)      // true for .many()/.all()
console.log(posts.isSingle)     // true for .first()/.item()

// Array-like operations (using .field() - recommended)
posts.map(post => post.field('title'))
posts.filter(post => post.field('featured'))
posts.find(post => post.field('slug') === 'target')

// Iteration with .field()
for (const post of posts) {
  console.log(post.field('title'))
}

// Or access raw data directly (backward compatibility)
posts.map(post => post.data.title)
for (const post of posts) {
  console.log(post.data.title)
}

// First/last access
const firstPost = posts.first()
const lastPost = posts.last()
```

### Backward Compatibility

Existing code continues to work unchanged via the `.raw` property:

```typescript
const result = await cms.collection('blog_posts').first()

// Old way (still works)
const oldTitle = result.raw?.data.title

// New way (recommended)
const newTitle = result.field('title')
```

## 🌍 Internationalization & Localization

The SDK provides comprehensive locale support for internationalized content with automatic cache separation and asset URL localization.

### Basic Locale Management

```typescript
const cms = createVibeCMS({
  projectId: 'your-project-id',
  locale: 'en-US'  // Set default locale
})

// Switch locales dynamically
cms.setLocale('fr-FR')
const frenchPosts = await cms.collection('blog_posts').many()

cms.setLocale('es-ES')
const spanishPosts = await cms.collection('blog_posts').many()

// Check current locale
console.log(cms.getLocale())  // 'es-ES'
```

### Automatic Cache Separation

Each locale maintains its own cache to ensure content consistency:

```typescript
// English content cached separately
cms.setLocale('en-US')
const englishPosts = await cms.collection('blog_posts').many()

// French content gets its own cache
cms.setLocale('fr-FR')
const frenchPosts = await cms.collection('blog_posts').many()

// Clear cache for specific locale
await cms.clearLocaleCache('fr-FR')  // Only clears French cache
await cms.clearLocaleCache()         // Clears current locale (French)
```

### Practical Multi-Language Example

```typescript
class BlogManager {
  private cms = createVibeCMS({ projectId: 'blog-project' })

  async getPostsByLocale(locale: string) {
    this.cms.setLocale(locale)

    const posts = await this.cms.collection('blog_posts').many()
    return posts.map(post => ({
      title: post.field('title'),
      content: post.field('content'),
      imageUrl: post.asset_url('featured_image'),
      locale: this.cms.getLocale()
    }))
  }

  async getAllLocalizedPosts() {
    const locales = ['en-US', 'fr-FR', 'es-ES', 'de-DE']
    const results = {}

    for (const locale of locales) {
      results[locale] = await this.getPostsByLocale(locale)
    }

    return results
  }
}

// Usage
const blog = new BlogManager()
const allPosts = await blog.getAllLocalizedPosts()
// Returns: { 'en-US': [...], 'fr-FR': [...], 'es-ES': [...], 'de-DE': [...] }
```

### Supported Locale Formats

The SDK validates locales using BCP 47 standards:

```typescript
// Valid formats
cms.setLocale('en')       // Language only
cms.setLocale('en-US')    // Language-Country
cms.setLocale('fr-FR')    // Language-Country
cms.setLocale('zh-CN')    // Language-Country
cms.setLocale('es-419')   // Language-Region

// Invalid formats (will throw errors)
cms.setLocale('EN-US')    // Uppercase not allowed
cms.setLocale('invalid-locale-format-too-long')  // Too long
cms.setLocale('')         // Empty string
```

## TypeScript Support

The SDK is built with TypeScript and provides full type safety with generic type parameters:

```typescript
// Define your content type
interface BlogPost {
  title: string
  content: string
  excerpt: string
  published_at: string
  featured_image?: string
  tags?: string[]
}

// Type flows through the entire query chain
const post = await cms.collection<BlogPost>('blog_posts').first()
// post is CollectionResult<BlogPost>

// Field extraction is type-aware
const title = post.field('title')  // Returns string | null
const tags = post.field('tags')    // Returns string[] | null

// Asset URLs maintain type safety
const imageUrl = post.asset_url('featured_image')  // Returns string | null

// Array operations maintain types
const posts = await cms.collection<BlogPost>('blog_posts').many({ limit: 10 })
posts.map(p => p.field('title'))  // Returns (string | null)[]

// Create type-safe helper functions
async function getPublishedPosts(limit = 10) {
  const result = await cms.collection<BlogPost>('blog_posts').many({ limit })
  return result.map(post => ({
    title: post.field('title') as string,
    excerpt: post.field('excerpt') as string,
    imageUrl: post.asset_url('featured_image') as string | undefined,
    tags: post.field('tags') as string[] | undefined
  }))
}

// Use with complex nested types
interface Product {
  name: string
  price: number
  description: string
  images: string[]  // Array of asset IDs
  variants: {
    size: string
    color: string
    sku: string
  }[]
}

const products = await cms.collection<Product>('products').all()
const allImageUrls = products.asset_url('images')  // Returns string[]
```

## Framework Examples

### Vue 3

```vue
<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <article v-for="post in posts" :key="post.id">
      <h2>{{ post.title }}</h2>
      <p>{{ post.excerpt }}</p>
      <img v-if="post.imageUrl" :src="post.imageUrl" :alt="post.title" />
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { cms } from '@/lib/cms' // Singleton instance

interface BlogPost {
  title: string
  excerpt: string
  content: string
  featured_image?: string
}

const posts = ref<Array<{ id: string; title: string; excerpt: string; imageUrl?: string }>>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const result = await cms.collection<BlogPost>('blog_posts').many({ limit: 10 })
    posts.value = result.map(post => ({
      id: post.id,
      title: post.field('title'),
      excerpt: post.field('excerpt'),
      imageUrl: post.asset_url('featured_image') as string | undefined
    }))
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    loading.value = false
  }
})
</script>
```

### React

```tsx
import { useState, useEffect } from 'react'
import { cms } from '@/lib/cms' // Singleton instance

interface BlogPost {
  title: string
  excerpt: string
  content: string
  featured_image?: string
}

function BlogPosts() {
  const [posts, setPosts] = useState<Array<{
    id: string
    title: string
    excerpt: string
    imageUrl?: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cms.collection<BlogPost>('blog_posts').many({ limit: 10 })
      .then(result => {
        const mapped = result.map(post => ({
          id: post.id,
          title: post.field('title'),
          excerpt: post.field('excerpt'),
          imageUrl: post.asset_url('featured_image') as string | undefined
        }))
        setPosts(mapped)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
          {post.imageUrl && <img src={post.imageUrl} alt={post.title} />}
        </article>
      ))}
    </div>
  )
}
```

### Angular

```typescript
import { Component, OnInit } from '@angular/core'
import { cms } from '@/lib/cms' // Singleton instance

interface BlogPost {
  title: string
  excerpt: string
  content: string
  featured_image?: string
}

interface PostViewModel {
  id: string
  title: string
  excerpt: string
  imageUrl?: string
}

@Component({
  selector: 'app-blog',
  template: `
    <div *ngIf="loading">Loading...</div>
    <div *ngIf="error">Error: {{ error }}</div>
    <article *ngFor="let post of posts">
      <h2>{{ post.title }}</h2>
      <p>{{ post.excerpt }}</p>
      <img *ngIf="post.imageUrl" [src]="post.imageUrl" [alt]="post.title" />
    </article>
  `
})
export class BlogComponent implements OnInit {
  posts: PostViewModel[] = []
  loading = true
  error: string | null = null

  async ngOnInit() {
    try {
      const result = await cms.collection<BlogPost>('blog_posts').many({ limit: 10 })
      this.posts = result.map(post => ({
        id: post.id,
        title: post.field('title'),
        excerpt: post.field('excerpt'),
        imageUrl: post.asset_url('featured_image') as string | undefined
      }))
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      this.loading = false
    }
  }
}
```

## Error Handling

The SDK provides comprehensive error handling:

```typescript
import { VibeCMSError } from 'vibe-cms-sdk'

try {
  const posts = await cms.collection('blog_posts').all()
} catch (error) {
  if (error instanceof VibeCMSError) {
    console.log('API Error:', error.message)
    console.log('Status:', error.status)
    console.log('Details:', error.details)
  } else {
    console.log('Network Error:', error.message)
  }
}
```

## Caching Behavior

The SDK intelligently caches responses to reduce API calls:

- **Cache Keys**: Unique per project, collection, and query parameters
- **TTL**: Configurable time-to-live, defaults to 5 minutes
- **Storage**: Uses localStorage with sessionStorage and memory fallbacks
- **Invalidation**: Automatic expiration and manual clearing

## Migration from GitHub Packages

If you were using the private GitHub Packages version:

```bash
# Remove old package
npm uninstall vibe-cms-sdk

# Install from public NPM
npm install vibe-cms-sdk

# No code changes needed - imports remain the same!
```

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Type check
npm run type-check

# Watch mode for development
npm run dev
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/dufourpascal/vibe-cms-sdk#readme)
- 🐛 [Report Issues](https://github.com/dufourpascal/vibe-cms-sdk/issues)
- 💬 [Discussions](https://github.com/dufourpascal/vibe-cms-sdk/discussions)

---

Made with ❤️ for the Vibe CMS community