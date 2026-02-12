/**
 * Enhanced sitemap parser with XML-JS support
 * Fetches and parses sitemap.xml to get URLs with metadata
 */
import axios from 'axios'

interface SitemapUrl {
  url: string
  lastmod?: string
  priority?: number
}

export async function fetchSitemap(baseUrl: string): Promise<SitemapUrl[]> {
  try {
    // Normalize base URL
    const url = new URL(baseUrl)
    const sitemapUrl = new URL('/sitemap.xml', url.origin)

    console.log(`🔍 Fetching sitemap from: ${sitemapUrl}`)

    const response = await axios.get(sitemapUrl.toString(), {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HebelkiBot/1.0)'
      }
    })

    if (!response.data) {
      console.log('❌ Sitemap response empty')
      return []
    }

    const xml = response.data

    // Parse XML to extract <loc> URLs (simple regex approach)
    const locMatches = xml.match(/<loc>(.*?)<\/loc>/g)

    if (!locMatches) {
      console.log('❌ No URLs found in sitemap')
      return []
    }

    const urls: SitemapUrl[] = locMatches
      .map((tag: string) => {
        const url = tag.replace(/<\/?loc>/g, '').trim()
        return { url }
      })
      .filter((entry: SitemapUrl) => entry.url.length > 0)

    console.log(`✅ Found ${urls.length} URLs in sitemap`)
    return urls
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.log(`⚠️ No sitemap.xml found: ${message}`)
    return []
  }
}

/**
 * Filters sitemap URLs to get priority pages (impressum, about, services, etc.)
 */
export function getPriorityUrls(sitemapUrls: string[]): string[] {
  const priorityKeywords = [
    'impressum',
    'imprint',
    'about',
    'über',
    'ueber',
    'services',
    'leistungen',
    'angebot',
    'pricing',
    'preis',
    'contact',
    'kontakt',
    'team'
  ]

  return sitemapUrls.filter(url => {
    const lowerUrl = url.toLowerCase()
    return priorityKeywords.some(keyword => lowerUrl.includes(keyword))
  })
}
