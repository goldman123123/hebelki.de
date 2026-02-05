/**
 * API Route: Discover Pages
 * Finds all pages on a website via sitemap or link crawling
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchSitemap } from '@/lib/scraper/sitemap-parser'
import { crawlHomepageLinks } from '@/lib/scraper/link-crawler'
import { categorizePages, CategorizedPage } from '@/lib/scraper/page-categorizer'

export async function POST(request: NextRequest) {
  try {
    const { websiteUrl } = await request.json()

    if (!websiteUrl) {
      return NextResponse.json({ error: 'Website URL required' }, { status: 400 })
    }

    // Normalize URL
    let normalizedUrl = websiteUrl.trim()
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    console.log(`🔍 Discovering pages for: ${normalizedUrl}`)

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
  } catch (error: any) {
    console.error('❌ Failed to discover pages:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to discover pages' },
      { status: 500 }
    )
  }
}
