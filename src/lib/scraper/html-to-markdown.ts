/**
 * HTML to Markdown converter using Turndown
 * Scrapes web pages and converts them to clean markdown
 */
import TurndownService from 'turndown'
import axios from 'axios'
import * as cheerio from 'cheerio'

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '_'
})

// Remove scripts, styles, nav, footer noise
turndownService.remove(['script', 'style', 'noscript', 'iframe'])

export interface ScrapedPage {
  url: string
  markdown: string
  html: string
  title: string | null
  description: string | null
  size: number  // bytes
}

export async function scrapePageToMarkdown(url: string): Promise<ScrapedPage> {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HebelkiBot/1.0; Website scraper for onboarding)'
      },
      maxContentLength: 5 * 1024 * 1024  // 5MB max
    })

    const html = response.data
    const $ = cheerio.load(html)

    // Extract metadata
    const title = $('title').text().trim() || null
    const description = $('meta[name="description"]').attr('content')?.trim() || null

    // Remove unwanted elements before conversion
    $('nav, header, footer, aside, [role="navigation"], [role="banner"]').remove()
    $('script, style, noscript, iframe').remove()
    $('svg').remove() // Remove SVG elements separately
    $('.cookie-banner, .cookie-notice, #cookie-consent').remove()

    // Get main content (prefer <main> tag)
    let content = $('main').html() || $('article').html() || $('body').html() || html

    // Convert to markdown
    const markdown = turndownService.turndown(content)

    return {
      url,
      markdown,
      html,
      title,
      description,
      size: html.length
    }
  } catch (error: any) {
    throw new Error(`Failed to scrape ${url}: ${error.message}`)
  }
}
