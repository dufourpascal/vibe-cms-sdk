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

```typescript
import { createVibeCMS } from 'vibe-cms-sdk'

// Initialize the CMS client
const cms = createVibeCMS({
  projectId: 'your-project-id',
  baseUrl: 'https://api.vibe-cms.com', // optional, defaults to this
  cache: {
    enabled: true,    // optional, defaults to true
    ttl: 300000,     // optional, 5 minutes default
    storage: 'localStorage' // optional, 'localStorage' | 'sessionStorage'
  }
})

// Use the chainable API
const firstPost = await cms.collection('blog_posts').first()
const recentPosts = await cms.collection('blog_posts').many({ limit: 10 })
const postById = await cms.collection('blog_posts').item('item-123')
const allPosts = await cms.collection('blog_posts').all()
```

## API Reference

### `createVibeCMS(config)`

Creates a new CMS client instance.

**Parameters:**
- `config.projectId` (string, required): Your Vibe CMS project ID
- `config.baseUrl` (string, optional): API base URL, defaults to `https://api.vibe-cms.com`
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
const defaultMany = await cms.collection('blog_posts').many() // defaults to 50
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

### Caching Methods

#### `.clearCache()`

Clears cached data for the collection.

```typescript
await cms.collection('blog_posts').clearCache()
```

## TypeScript Support

The SDK is built with TypeScript and provides full type safety:

```typescript
// Generic type support
interface BlogPost {
  title: string
  content: string
  published_at: string
}

const post = await cms.collection<BlogPost>('blog_posts').first()
// post is typed as BlogPost | null
```

## Framework Examples

### Vue 3

```vue
<template>
  <div>
    <article v-for="post in posts" :key="post.id">
      <h2>{{ post.data.title }}</h2>
      <p>{{ post.data.excerpt }}</p>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createVibeCMS } from 'vibe-cms-sdk'

const posts = ref([])

const cms = createVibeCMS({
  projectId: 'your-project-id'
})

onMounted(async () => {
  posts.value = await cms.collection('blog_posts').many({ limit: 10 })
})
</script>
```

### React

```tsx
import { useState, useEffect } from 'react'
import { createVibeCMS } from 'vibe-cms-sdk'

const cms = createVibeCMS({
  projectId: 'your-project-id'
})

function BlogPosts() {
  const [posts, setPosts] = useState([])
  
  useEffect(() => {
    cms.collection('blog_posts').many({ limit: 10 })
      .then(setPosts)
  }, [])
  
  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.data.title}</h2>
          <p>{post.data.excerpt}</p>
        </article>
      ))}
    </div>
  )
}
```

### Angular

```typescript
import { Component, OnInit } from '@angular/core'
import { createVibeCMS } from 'vibe-cms-sdk'

@Component({
  selector: 'app-blog',
  template: `
    <article *ngFor="let post of posts">
      <h2>{{ post.data.title }}</h2>
      <p>{{ post.data.excerpt }}</p>
    </article>
  `
})
export class BlogComponent implements OnInit {
  posts: any[] = []
  
  private cms = createVibeCMS({
    projectId: 'your-project-id'
  })
  
  async ngOnInit() {
    this.posts = await this.cms.collection('blog_posts').many({ limit: 10 })
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