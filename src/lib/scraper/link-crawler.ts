/**
 * Homepage link crawler - extracts all links from a webpage
 * Used as fallback when sitemap.xml is not available
 */
import axios from 'axios'
import * as cheerio from 'cheerio'

export interface CrawledLink {
  url: string
  title: string | null
  text: string | null  // anchor text
}

export async function crawlHomepageLinks(baseUrl: string): Promise<CrawledLink[]> {
  try {
    console.log(`🔍 Crawling homepage: ${baseUrl}`)

    const response = await axios.get(baseUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HebelkiBot/1.0; Website scraper for onboarding)'
      },
      maxContentLength: 5 * 1024 * 1024  // 5MB max
    })

    const $ = cheerio.load(response.data)
    const links: CrawledLink[] = []
    const seen = new Set<string>()

    // Extract page title
    const pageTitle = $('title').text().trim()

    // Add homepage itself
    const normalizedBase = baseUrl.split('#')[0]
    if (!seen.has(normalizedBase)) {
      seen.add(normalizedBase)
      links.push({
        url: normalizedBase,
        title: pageTitle || 'Home',
        text: 'Home'
      })
    }

    // Extract all links
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href')
      if (!href) return

      // Resolve relative URLs
      let absoluteUrl: string
      try {
        absoluteUrl = new URL(href, baseUrl).toString()
      } catch {
        return // Invalid URL
      }

      // Filter to same domain only
      const baseHost = new URL(baseUrl).host
      const linkHost = new URL(absoluteUrl).host
      if (baseHost !== linkHost) return

      // Remove hash fragments
      absoluteUrl = absoluteUrl.split('#')[0]

      // Skip duplicates
      if (seen.has(absoluteUrl)) return
      seen.add(absoluteUrl)

      // Extract title from anchor text
      const text = $(element).text().trim()

      links.push({
        url: absoluteUrl,
        title: text || null,
        text: text || null
      })
    })

    console.log(`✅ Found ${links.length} unique links on homepage`)
    return links
  } catch (error: any) {
    console.error(`❌ Failed to crawl homepage: ${error.message}`)
    return []
  }
}
