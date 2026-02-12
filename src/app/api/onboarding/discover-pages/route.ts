/**
 * API Route: Discover Pages
 * Finds all pages on a website via sitemap or link crawling
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { fetchSitemap } from '@/lib/scraper/sitemap-parser'
import { crawlHomepageLinks } from '@/lib/scraper/link-crawler'
import { categorizePages, CategorizedPage } from '@/lib/scraper/page-categorizer'

export async function POST(request: NextRequest) {
  try {
    // Require authentication to prevent SSRF abuse
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    const { websiteUrl } = await request.json()

    if (!websiteUrl) {
      return NextResponse.json({ error: 'Website URL required' }, { status: 400 })
    }

    // Normalize URL
    let normalizedUrl = websiteUrl.trim()
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    // SSRF prevention: validate URL before fetching
    try {
      const parsed = new URL(normalizedUrl)

      // Only allow http/https protocols
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are allowed' }, { status: 400 })
      }

      // Block private/internal hostnames and IP ranges
      const hostname = parsed.hostname.toLowerCase()
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        /^10\./.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
        /^192\.168\./.test(hostname) ||
        /^169\.254\./.test(hostname)
      ) {
        return NextResponse.json({ error: 'Internal URLs are not allowed' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    console.log(`Discovering pages for: ${normalizedUrl}`)

    // Try sitemap first
    let pages: CategorizedPage[] = []
    const sitemapUrls = await fetchSitemap(normalizedUrl)

    if (sitemapUrls.length > 0) {
      console.log(`✅ Found ${sitemapUrls.length} URLs in sitemap`)
      pages = categorizePages(
        sitemapUrls.map(s => ({ url: s.url, title: null }))
      )
    } else {
      // Fallback: crawl homepage
      console.log('⚠️ No sitemap found, crawling homepage...')
      const links = await crawlHomepageLinks(normalizedUrl)
      console.log(`✅ Found ${links.length} links on homepage`)
      pages = categorizePages(links)
    }

    // Sort by priority (high first)
    pages.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    return NextResponse.json({
      success: true,
      pages,
      source: sitemapUrls.length > 0 ? 'sitemap' : 'homepage',
      count: pages.length
    })
  } catch (error) {
    console.error('Failed to discover pages:', error)
    return NextResponse.json(
      { error: 'Failed to discover pages' },
      { status: 500 }
    )
  }
}
