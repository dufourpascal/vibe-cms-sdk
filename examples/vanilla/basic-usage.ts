import { createVibeCMS, type VibeCMSError } from '@dufourpascal/vibe-cms-sdk'

// Types
interface BlogPost {
  id: string
  data: {
    title: string
    excerpt: string
    content: string
    published_at: string
    author: string
  }
}

// Initialize CMS client
const cms = createVibeCMS({
  projectId: 'your-project-id',
  baseUrl: 'https://api.vibe-cms.com',
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    storage: 'localStorage'
  }
})

// State management
class BlogApp {
  private posts: BlogPost[] = []
  private loading = false
  private error: string | null = null
  private allLoaded = false

  constructor() {
    this.init()
  }

  private async init() {
    await this.fetchPosts()
    this.setupEventListeners()
  }

  // Fetch posts from CMS
  async fetchPosts(): Promise<void> {
    try {
      this.setLoading(true)
      this.setError(null)
      
      const fetchedPosts = await cms.collection<BlogPost>('blog_posts').many({ 
        limit: 10 
      })
      
      this.posts = fetchedPosts || []
      this.allLoaded = (fetchedPosts?.length || 0) < 10
      this.render()
    } catch (err) {
      console.error('Error fetching posts:', err)
      this.setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      this.setLoading(false)
    }
  }

  // Load more posts
  async loadMore(): Promise<void> {
    try {
      this.setLoadingMore(true)
      
      // In a real app, you'd implement pagination with offset/cursor
      const morePosts = await cms.collection<BlogPost>('blog_posts').many({ 
        limit: 10,
        // offset: this.posts.length // Add offset support to your API
      })
      
      if (morePosts && morePosts.length > 0) {
        this.posts.push(...morePosts)
        this.allLoaded = morePosts.length < 10
      } else {
        this.allLoaded = true
      }
      
      this.render()
    } catch (err) {
      console.error('Error loading more posts:', err)
    } finally {
      this.setLoadingMore(false)
    }
  }

  // Get single post by ID
  async getPost(postId: string): Promise<BlogPost | null> {
    try {
      const post = await cms.collection<BlogPost>('blog_posts').item(postId)
      return post
    } catch (err) {
      console.error('Error fetching post:', err)
      return null
    }
  }

  // Clear cache
  async clearCache(): Promise<void> {
    await cms.collection('blog_posts').clearCache()
    console.log('Cache cleared')
  }

  // Set loading state
  private setLoading(loading: boolean) {
    this.loading = loading
    this.updateLoadingUI()
  }

  // Set loading more state
  private setLoadingMore(loadingMore: boolean) {
    const button = document.getElementById('load-more-btn') as HTMLButtonElement
    if (button) {
      button.disabled = loadingMore
      button.textContent = loadingMore ? 'Loading...' : 'Load More'
    }
  }

  // Set error state
  private setError(error: string | null) {
    this.error = error
    this.render()
  }

  // Update loading UI
  private updateLoadingUI() {
    const loadingEl = document.getElementById('loading')
    if (loadingEl) {
      loadingEl.style.display = this.loading ? 'block' : 'none'
    }
  }

  // Format date
  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Render the blog posts
  private render() {
    const container = document.getElementById('blog-container')
    if (!container) return

    // Show error if exists
    if (this.error) {
      container.innerHTML = `
        <div class="error">
          <p>Error loading posts: ${this.error}</p>
          <button onclick="blogApp.fetchPosts()">Retry</button>
        </div>
      `
      return
    }

    // Show loading if no posts and loading
    if (this.loading && this.posts.length === 0) {
      container.innerHTML = '<div id="loading" class="loading">Loading posts...</div>'
      return
    }

    // Render posts
    const postsHTML = this.posts.map(post => `
      <article class="post">
        <h2>${this.escapeHtml(post.data.title)}</h2>
        <p class="excerpt">${this.escapeHtml(post.data.excerpt)}</p>
        <div class="meta">
          <span>Published: ${this.formatDate(post.data.published_at)}</span>
          <span>Author: ${this.escapeHtml(post.data.author)}</span>
        </div>
      </article>
    `).join('')

    const loadMoreButton = !this.allLoaded ? 
      `<button id="load-more-btn" class="load-more">Load More</button>` : ''

    container.innerHTML = `
      <div id="loading" class="loading" style="display: none;">Loading posts...</div>
      <main>
        ${postsHTML}
        ${loadMoreButton}
      </main>
    `
  }

  // Escape HTML to prevent XSS
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return text.replace(/[&<>"']/g, (m) => map[m])
  }

  // Setup event listeners
  private setupEventListeners() {
    // Load more button
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      if (target.id === 'load-more-btn') {
        this.loadMore()
      }
    })

    // Clear cache button (if exists)
    const clearCacheBtn = document.getElementById('clear-cache-btn')
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', () => this.clearCache())
    }
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Make blogApp global for easy access from HTML onclick handlers
  ;(window as any).blogApp = new BlogApp()
})

// Export for module usage
export { BlogApp, cms }

// Example usage in different contexts:

// 1. Direct CMS usage
async function directUsage() {
  try {
    // Get first post
    const firstPost = await cms.collection<BlogPost>('blog_posts').first()
    console.log('First post:', firstPost)

    // Get all posts
    const allPosts = await cms.collection<BlogPost>('blog_posts').all()
    console.log('All posts:', allPosts)

    // Get specific post
    const specificPost = await cms.collection<BlogPost>('blog_posts').item('post-123')
    console.log('Specific post:', specificPost)

    // Clear cache
    await cms.collection('blog_posts').clearCache()
    console.log('Cache cleared')

  } catch (error) {
    if (error instanceof Error) {
      console.error('VibeCMS Error:', error.message)
    }
  }
}

// 2. Error handling example
async function errorHandlingExample() {
  try {
    const posts = await cms.collection<BlogPost>('blog_posts').many({ limit: 5 })
    console.log('Posts loaded:', posts)
  } catch (error) {
    // Handle VibeCMS specific errors
    if (error && typeof error === 'object' && 'status' in error) {
      const vmsError = error as VibeCMSError
      console.error('API Error:', {
        message: vmsError.message,
        status: (vmsError as any).status,
        details: (vmsError as any).details
      })
    } else {
      console.error('Network or other error:', error)
    }
  }
}

// 3. Cache management example
async function cacheManagementExample() {
  // First call - will fetch from API
  console.time('First call')
  const posts1 = await cms.collection<BlogPost>('blog_posts').many({ limit: 10 })
  console.timeEnd('First call')

  // Second call - should be faster due to caching
  console.time('Cached call')
  const posts2 = await cms.collection<BlogPost>('blog_posts').many({ limit: 10 })
  console.timeEnd('Cached call')

  // Clear cache and fetch again
  await cms.collection('blog_posts').clearCache()
  console.time('After cache clear')
  const posts3 = await cms.collection<BlogPost>('blog_posts').many({ limit: 10 })
  console.timeEnd('After cache clear')
}

// Make examples available globally for testing
;(window as any).examples = {
  directUsage,
  errorHandlingExample,
  cacheManagementExample
}