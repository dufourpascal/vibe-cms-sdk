import React, { useState, useEffect, useCallback } from 'react'
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

// CMS client (initialize outside component to avoid recreation)
const cms = createVibeCMS({
  projectId: 'your-project-id',
  baseUrl: 'https://api.vibe-cms.com',
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    storage: 'localStorage'
  }
})

const BlogPosts: React.FC = () => {
  // State
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allLoaded, setAllLoaded] = useState(false)

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const fetchedPosts = await cms.collection<BlogPost>('blog_posts').many({ 
        limit: 10 
      })
      
      setPosts(fetchedPosts || [])
      setAllLoaded((fetchedPosts?.length || 0) < 10)
    } catch (err) {
      console.error('Error fetching posts:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Load more posts
  const loadMore = useCallback(async () => {
    try {
      setLoadingMore(true)
      
      // In a real app, you'd implement pagination with offset/cursor
      const morePosts = await cms.collection<BlogPost>('blog_posts').many({ 
        limit: 10,
        // offset: posts.length // Add offset support to your API
      })
      
      if (morePosts && morePosts.length > 0) {
        setPosts(prev => [...prev, ...morePosts])
        setAllLoaded(morePosts.length < 10)
      } else {
        setAllLoaded(true)
      }
    } catch (err) {
      console.error('Error loading more posts:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [posts.length])

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Effects
  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // Render loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          Loading posts...
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <p>Error loading posts: {error}</p>
          <button onClick={fetchPosts} style={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Render posts
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>My Blog</h1>
        <p style={styles.subtitle}>Powered by Vibe CMS</p>
      </header>

      <main>
        {posts.map((post) => (
          <article key={post.id} style={styles.post}>
            <h2 style={styles.postTitle}>{post.data.title}</h2>
            <p style={styles.excerpt}>{post.data.excerpt}</p>
            <div style={styles.meta}>
              <span>Published: {formatDate(post.data.published_at)}</span>
              <span>Author: {post.data.author}</span>
            </div>
          </article>
        ))}

        {posts.length > 0 && !allLoaded && (
          <button 
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              ...styles.loadMore,
              ...(loadingMore ? styles.loadMoreDisabled : {})
            }}
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        )}
      </main>
    </div>
  )
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  header: {
    textAlign: 'center',
    marginBottom: '3rem'
  },
  title: {
    color: '#2c3e50',
    marginBottom: '0.5rem'
  },
  subtitle: {
    color: '#7f8c8d',
    fontSize: '1.1rem'
  },
  loading: {
    textAlign: 'center',
    padding: '2rem'
  },
  error: {
    textAlign: 'center',
    padding: '2rem',
    color: '#e74c3c'
  },
  retryButton: {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    background: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  post: {
    marginBottom: '2rem',
    paddingBottom: '2rem',
    borderBottom: '1px solid #ecf0f1'
  },
  postTitle: {
    color: '#2c3e50',
    marginBottom: '0.5rem'
  },
  excerpt: {
    color: '#34495e',
    lineHeight: 1.6,
    marginBottom: '1rem'
  },
  meta: {
    display: 'flex',
    gap: '1rem',
    color: '#7f8c8d',
    fontSize: '0.9rem'
  },
  loadMore: {
    display: 'block',
    margin: '2rem auto',
    padding: '0.75rem 2rem',
    background: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  loadMoreDisabled: {
    background: '#bdc3c7',
    cursor: 'not-allowed'
  }
}

export default BlogPosts