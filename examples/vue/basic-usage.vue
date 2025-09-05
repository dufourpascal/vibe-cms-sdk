<template>
  <div class="blog-container">
    <header>
      <h1>My Blog</h1>
      <p>Powered by Vibe CMS</p>
    </header>

    <!-- Loading state -->
    <div v-if="loading" class="loading">
      Loading posts...
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error">
      <p>Error loading posts: {{ error }}</p>
      <button @click="fetchPosts">Retry</button>
    </div>

    <!-- Posts -->
    <main v-else>
      <article v-for="post in posts" :key="post.id" class="post">
        <h2>{{ post.data.title }}</h2>
        <p class="excerpt">{{ post.data.excerpt }}</p>
        <div class="meta">
          <span>Published: {{ formatDate(post.data.published_at) }}</span>
          <span>Author: {{ post.data.author }}</span>
        </div>
      </article>

      <!-- Load more button -->
      <button 
        v-if="posts.length > 0 && !allLoaded" 
        @click="loadMore"
        :disabled="loadingMore"
        class="load-more"
      >
        {{ loadingMore ? 'Loading...' : 'Load More' }}
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createVibeCMS, type VibeCMSError } from 'vibe-cms-sdk'

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

// Reactive state
const posts = ref<BlogPost[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const allLoaded = ref(false)

// CMS client
const cms = createVibeCMS({
  projectId: 'your-project-id',
  baseUrl: 'https://api.vibe-cms.com',
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    storage: 'localStorage'
  }
})

// Methods
const fetchPosts = async () => {
  try {
    loading.value = true
    error.value = null
    
    const fetchedPosts = await cms.collection<BlogPost>('blog_posts').many({ 
      limit: 10 
    })
    
    posts.value = fetchedPosts || []
    allLoaded.value = (fetchedPosts?.length || 0) < 10
  } catch (err) {
    console.error('Error fetching posts:', err)
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'An unknown error occurred'
    }
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  try {
    loadingMore.value = true
    
    // In a real app, you'd implement pagination with offset/cursor
    const morePosts = await cms.collection<BlogPost>('blog_posts').many({ 
      limit: 10,
      // offset: posts.value.length // Add offset support to your API
    })
    
    if (morePosts && morePosts.length > 0) {
      posts.value.push(...morePosts)
      allLoaded.value = morePosts.length < 10
    } else {
      allLoaded.value = true
    }
  } catch (err) {
    console.error('Error loading more posts:', err)
  } finally {
    loadingMore.value = false
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Lifecycle
onMounted(() => {
  fetchPosts()
})
</script>

<style scoped>
.blog-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

header {
  text-align: center;
  margin-bottom: 3rem;
}

header h1 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

header p {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
}

.error {
  color: #e74c3c;
}

.error button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error button:hover {
  background: #2980b9;
}

.post {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #ecf0f1;
}

.post:last-child {
  border-bottom: none;
}

.post h2 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.excerpt {
  color: #34495e;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.meta {
  display: flex;
  gap: 1rem;
  color: #7f8c8d;
  font-size: 0.9rem;
}

.load-more {
  display: block;
  margin: 2rem auto;
  padding: 0.75rem 2rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.load-more:hover:not(:disabled) {
  background: #2980b9;
}

.load-more:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}
</style>