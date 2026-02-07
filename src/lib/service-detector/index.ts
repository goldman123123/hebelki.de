/**
 * Service Detector Module
 *
 * Detects services from a URL by scraping and using AI extraction.
 * Works directly without going through the worker queue for quick results.
 */

import { scrapePageToMarkdown } from '@/lib/scraper/html-to-markdown'
import { fetchSitemap } from '@/lib/scraper/sitemap-parser'
import { crawlHomepageLinks } from '@/lib/scraper/link-crawler'
import { extractServicesFromContent } from '@/lib/ai-extractor'
import { deduplicateServices } from '@/lib/ai-extractor/deduplicator'
import type { ScrapedPage } from '@/lib/ai-extractor/types'
import type { DetectedService } from '@/lib/ai-extractor/types'

export type { DetectedService }

interface DetectServicesOptions {
  url: string
  businessType: string
  maxPages?: number
  selectedUrls?: string[] // If provided, only scrape these URLs
}

interface DetectServicesResult {
  services: DetectedService[]
  pagesScraped: number
  pagesFailed: number
  source: 'sitemap' | 'homepage'
}

/**
 * Detect services from a URL
 *
 * This does a quick scrape and extraction without using the worker queue.
 * Best for interactive detection on the services page.
 */
export async function detectServicesFromUrl(
  options: DetectServicesOptions
): Promise<DetectServicesResult> {
  const { url, businessType, maxPages = 10, selectedUrls } = options

  console.log(`[Service Detector] Starting detection from: ${url}`)

  let pagesToScrape: string[]
  let source: 'sitemap' | 'homepage' = 'sitemap'

  // If selectedUrls provided, use them directly
  if (selectedUrls && selectedUrls.length > 0) {
    pagesToScrape = selectedUrls.slice(0, maxPages)
    source = 'homepage' // Mark as homepage since we're using user selection
    console.log(`[Service Detector] Using ${pagesToScrape.length} user-selected URLs`)
  } else {
    // Discover pages automatically
    let urlsToScrape: string[] = []

    // Try sitemap first
    const sitemapUrls = await fetchSitemap(url)
    if (sitemapUrls.length > 0) {
      urlsToScrape = sitemapUrls.map(u => u.url)
      source = 'sitemap'
    } else {
      // Fall back to homepage crawling
      const crawledLinks = await crawlHomepageLinks(url)
      urlsToScrape = crawledLinks.map(l => l.url)
      source = 'homepage'
    }

    console.log(`[Service Detector] Discovered ${urlsToScrape.length} URLs via ${source}`)

    // Filter for service-related pages
    const serviceKeywords = [
      'service', 'leistung', 'angebot', 'pricing', 'preis',
      'treatment', 'behandlung', 'product', 'produkt'
    ]

    const priorityUrls = urlsToScrape.filter(u => {
      const lower = u.toLowerCase()
      return serviceKeywords.some(k => lower.includes(k))
    })

    // Use priority URLs first, then fill with others up to maxPages
    pagesToScrape = [
      ...priorityUrls,
      ...urlsToScrape.filter(u => !priorityUrls.includes(u))
    ].slice(0, maxPages)

    console.log(`[Service Detector] Scraping ${pagesToScrape.length} pages (${priorityUrls.length} priority)`)
  }

  // Scrape pages
  const scrapedPages: ScrapedPage[] = []
  let pagesFailed = 0

  for (const pageUrl of pagesToScrape) {
    try {
      const page = await scrapePageToMarkdown(pageUrl)
      scrapedPages.push({
        url: page.url,
        markdown: page.markdown,
        html: page.html,
        metadata: {
          title: page.title || undefined,
          description: page.description || undefined,
        },
      })
    } catch (error) {
      console.warn(`[Service Detector] Failed to scrape ${pageUrl}:`, error)
      pagesFailed++
    }
  }

  console.log(`[Service Detector] Scraped ${scrapedPages.length} pages (${pagesFailed} failed)`)

  if (scrapedPages.length === 0) {
    return {
      services: [],
      pagesScraped: 0,
      pagesFailed,
      source,
    }
  }

  // Extract services using AI
  const rawServices = await extractServicesFromContent(scrapedPages, businessType)
  const services = deduplicateServices(rawServices)

  console.log(`[Service Detector] Detected ${services.length} unique services`)

  return {
    services,
    pagesScraped: scrapedPages.length,
    pagesFailed,
    source,
  }
}
