/**
 * API: POST /api/data/discover-pages
 *
 * Discovers pages from a URL using sitemap or homepage crawling.
 * Returns categorized pages with priority and default selection.
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchSitemap } from '@/lib/scraper/sitemap-parser'
import { crawlHomepageLinks } from '@/lib/scraper/link-crawler'
import { categorizePages, type CategorizedPage } from '@/lib/scraper/page-categorizer'
import { requireBusinessAccess } from '@/lib/auth-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:data:discover-pages')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, businessId } = body

    if (!url || !businessId) {
      return NextResponse.json(
        { error: 'URL and businessId are required' },
        { status: 400 }
      )
    }

    // Verify business access
    await requireBusinessAccess(businessId)

    // Normalize URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    // Validate URL
    try {
      new URL(normalizedUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      )
    }

    let pages: CategorizedPage[] = []
    let source: 'sitemap' | 'homepage' = 'sitemap'

    // Try sitemap first
    log.info(`Trying sitemap for: ${normalizedUrl}`)
    const sitemapUrls = await fetchSitemap(normalizedUrl)

    if (sitemapUrls.length > 0) {
      const links = sitemapUrls.map(u => ({ url: u.url, title: null }))
      pages = categorizePages(links)
      source = 'sitemap'
      log.info(`Found ${pages.length} pages via sitemap`)
    } else {
      // Fall back to homepage crawling
      log.info(`Falling back to homepage crawl`)
      const crawledLinks = await crawlHomepageLinks(normalizedUrl)
      pages = categorizePages(crawledLinks)
      source = 'homepage'
      log.info(`Found ${pages.length} pages via homepage crawl`)
    }

    // Limit to 100 pages max
    if (pages.length > 100) {
      pages = pages.slice(0, 100)
    }

    return NextResponse.json({
      pages,
      source,
      total: pages.length,
    })
  } catch (error) {
    log.error('Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Discovery failed' },
      { status: 500 }
    )
  }
}
