/**
 * Enhanced VibeCMS SDK Usage Example - Field Extraction and Asset Handling
 *
 * This example demonstrates the new field extraction and asset handling capabilities
 * of the VibeCMS SDK, showing how to work with both single items and collections.
 */

import { createVibeCMS } from '../src/index.js'

// Type definitions for our content
interface BlogPost {
  id: string
  data: {
    title: string
    content: string
    excerpt: string
    author: string
    published_at: string
    featured_image?: string
    gallery?: string[]
    tags: string[]
    category: string
  }
}

interface FAQ {
  id: string
  data: {
    question: string
    answer: string
    category: string
    priority: number
    attachment?: string
    related_docs?: string[]
  }
}

async function demonstrateFieldExtraction() {
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

  console.log('🚀 VibeCMS SDK - Enhanced Field Extraction Demo\n')

  try {
    // === Single Item Field Extraction ===
    console.log('📄 Single Item Field Extraction:')
    console.log('=====================================')

    const firstPost = await cms.collection<BlogPost>('blog_posts').first()

    if (!firstPost.isEmpty) {
      // Extract individual fields - much cleaner than accessing .data.field
      const title = firstPost.field('title')
      const author = firstPost.field('author')
      const tags = firstPost.field('tags')
      const category = firstPost.field('category')

      console.log('Post Title:', title)
      console.log('Author:', author)
      console.log('Tags:', tags)
      console.log('Category:', category)

      // Generate asset URLs directly from fields
      if (firstPost.field('featured_image')) {
        const imageUrl = firstPost.asset_url('featured_image')
        const thumbnailUrl = firstPost.asset_url('featured_image', { width: 300, height: 200 })

        console.log('Featured Image URL:', imageUrl)
        console.log('Thumbnail URL:', thumbnailUrl)
      }

      // Handle gallery (array of assets)
      if (firstPost.field('gallery')?.length > 0) {
        const galleryUrls = firstPost.asset_url('gallery')
        console.log('Gallery URLs:', galleryUrls)

        // Download first gallery image
        const firstImage = await firstPost.download_asset('gallery')
        console.log('Downloaded first gallery image:', {
          size: Array.isArray(firstImage) ? firstImage[0]?.contentLength : firstImage?.contentLength,
          type: Array.isArray(firstImage) ? firstImage[0]?.contentType : firstImage?.contentType
        })
      }
    }

    console.log('\n')

    // === Array Field Extraction ===
    console.log('📚 Array Field Extraction:')
    console.log('============================')

    const allPosts = await cms.collection<BlogPost>('blog_posts').many({ limit: 5 })

    if (!allPosts.isEmpty) {
      // Extract fields as arrays - one call gets all values!
      const titles = allPosts.field('title')           // ['Title 1', 'Title 2', ...]
      const authors = allPosts.field('author')         // ['Author 1', 'Author 2', ...]
      const categories = allPosts.field('category')    // ['Tech', 'Design', ...]

      console.log('All Titles:', titles)
      console.log('All Authors:', authors)
      console.log('All Categories:', categories)

      // Get all featured image URLs at once
      const featuredImageUrls = allPosts.asset_url('featured_image')
      console.log('Featured Images:', featuredImageUrls)

      // Batch operations with utility methods
      console.log('\nUsing utility methods:')
      console.log('Total Posts:', allPosts.count)
      console.log('First Post Title:', allPosts.first()?.data.title)
      console.log('Last Post Title:', allPosts.last()?.data.title)

      // Filter and chain operations
      const techPosts = allPosts.filter(post => post.data.category === 'tech')
      console.log('Tech Posts Count:', techPosts.count)
      console.log('Tech Post Titles:', techPosts.field('title'))

      // Map to custom structure
      const postSummaries = allPosts.map(post => ({
        title: post.data.title,
        author: post.data.author,
        url: `/blog/${post.id}`
      }))
      console.log('Post Summaries:', postSummaries)
    }

    console.log('\n')

    // === Working with FAQ Collection ===
    console.log('❓ FAQ Collection Example:')
    console.log('===========================')

    const faqs = await cms.collection<FAQ>('faq').many({ limit: 3 })

    if (!faqs.isEmpty) {
      const questions = faqs.field('question')
      const answers = faqs.field('answer')
      const categories = faqs.field('category')

      console.log('FAQ Questions:', questions)
      console.log('FAQ Categories:', categories)

      // Group by category
      const faqsByCategory: Record<string, any[]> = {}
      for (const faq of faqs) {
        const cat = faq.data.category
        if (!faqsByCategory[cat]) faqsByCategory[cat] = []
        faqsByCategory[cat].push({
          question: faq.data.question,
          answer: faq.data.answer
        })
      }
      console.log('FAQs by Category:', faqsByCategory)
    }

    console.log('\n')

    // === Backward Compatibility ===
    console.log('🔄 Backward Compatibility:')
    console.log('============================')

    const result = await cms.collection('blog_posts').first()

    // Old way still works via .raw property
    if (result.raw) {
      const oldStyleAccess = result.raw.data.title
      console.log('Old-style access:', oldStyleAccess)
    }

    // New way is much cleaner
    const newStyleAccess = result.field('title')
    console.log('New-style access:', newStyleAccess)

    // Iteration still works
    const posts = await cms.collection('blog_posts').many({ limit: 3 })
    console.log('Iteration support:')
    for (const post of posts) {
      console.log(`  - ${post.data.title}`)
    }

    console.log('\n')

    // === Advanced Asset Handling ===
    console.log('🖼️  Advanced Asset Handling:')
    console.log('==============================')

    // Direct asset operations from client
    const directAssetUrl = cms.asset_url('some-asset-id', {
      width: 800,
      height: 600
    })
    console.log('Direct Asset URL:', directAssetUrl)

    // Batch download multiple assets
    const postWithAssets = await cms.collection('blog_posts').first()
    if (!postWithAssets.isEmpty && postWithAssets.field('gallery')) {
      try {
        const allGalleryAssets = await postWithAssets.download_asset('gallery')
        if (Array.isArray(allGalleryAssets)) {
          console.log(`Downloaded ${allGalleryAssets.length} gallery assets`)
          console.log('Asset details:', allGalleryAssets.map(asset => ({
            id: asset.assetId,
            type: asset.contentType,
            size: asset.contentLength
          })))
        }
      } catch (error) {
        console.log('Asset download example (expected to fail in demo):', error.message)
      }
    }

    console.log('\n✅ Field Extraction Demo Complete!')

  } catch (error) {
    console.error('❌ Demo failed:', error.message)
    console.error('This is expected when running without a real API connection.')

    // Show how error handling works
    console.log('\n🛡️  Error Handling:')
    console.log('The SDK gracefully handles network errors and provides meaningful error messages.')
    console.log('In a real application, you would handle errors appropriately for your use case.')
  }
}

// === Usage Examples for Different Scenarios ===

// 1. Blog listing page
async function buildBlogListing() {
  const cms = createVibeCMS({ projectId: 'your-project-id' })

  const posts = await cms.collection('blog_posts').many({ limit: 10 })

  return posts.map(post => ({
    id: post.id,
    title: post.data.title,
    excerpt: post.data.excerpt,
    author: post.data.author,
    publishedAt: post.data.published_at,
    thumbnailUrl: cms.asset_url(post.data.featured_image || 'default-thumbnail', {
      width: 300,
      height: 200
    })
  }))
}

// 2. Bulk field extraction for search indexing
async function buildSearchIndex() {
  const cms = createVibeCMS({ projectId: 'your-project-id' })

  const posts = await cms.collection('blog_posts').all()

  // Extract all titles, content, and tags at once for indexing
  const searchData = {
    titles: posts.field('title'),
    content: posts.field('content'),
    tags: posts.field('tags').flat(), // Flatten all tag arrays
    authors: posts.field('author')
  }

  return searchData
}

// 3. Asset optimization workflow
async function optimizeImageAssets() {
  const cms = createVibeCMS({ projectId: 'your-project-id' })

  const posts = await cms.collection('blog_posts').all()

  // Get all featured images that need optimization
  const featuredImages = posts.field('featured_image').filter(Boolean)

  // Generate optimized URLs for different breakpoints
  const optimizedUrls = featuredImages.map(imageId => ({
    id: imageId,
    mobile: cms.asset_url(imageId, { width: 400 }),
    tablet: cms.asset_url(imageId, { width: 800 }),
    desktop: cms.asset_url(imageId, { width: 1200 })
  }))

  return optimizedUrls
}

// Run the demo
demonstrateFieldExtraction().catch(console.error)

export { buildBlogListing, buildSearchIndex, optimizeImageAssets }