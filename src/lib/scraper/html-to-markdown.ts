/**
 * HTML to Markdown converter using Turndown
 * Scrapes web pages and converts them to clean markdown
 *
 * Encoding detection priority:
 * 1. BOM (Byte Order Mark) - definitive if present
 * 2. Content-Type header charset
 * 3. Meta charset tag (scanned from raw bytes)
 * 4. Default to UTF-8
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

/**
 * Detect character encoding from bytes and headers
 */
function detectEncoding(bytes: Uint8Array, contentType: string | null): string {
  // 1. Check BOM (Byte Order Mark)
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return 'utf-8'
  }
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return 'utf-16be'
  }
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return 'utf-16le'
  }

  // 2. Check Content-Type header
  if (contentType) {
    const match = contentType.match(/charset=["']?([^"'\s;]+)/i)
    if (match) {
      return normalizeEncoding(match[1])
    }
  }

  // 3. Check meta charset in raw bytes (ASCII-safe scan)
  const metaEncoding = scanMetaCharset(bytes)
  if (metaEncoding) {
    return normalizeEncoding(metaEncoding)
  }

  // 4. Default to UTF-8
  return 'utf-8'
}

/**
 * Scan first 1024 bytes for meta charset tag
 * Safe because charset declaration must be ASCII
 */
function scanMetaCharset(bytes: Uint8Array): string | null {
  // Only scan first 1024 bytes (charset must be declared early)
  const scanLength = Math.min(bytes.length, 1024)
  const ascii = new TextDecoder('ascii').decode(bytes.slice(0, scanLength))

  // Match: <meta charset="utf-8"> or <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  const match = ascii.match(/<meta[^>]+charset=["']?([^"'\s>]+)/i) ||
                ascii.match(/<meta[^>]+content=["'][^"']*charset=([^"'\s;]+)/i)

  return match ? match[1] : null
}

/**
 * Normalize encoding names to what TextDecoder accepts
 */
function normalizeEncoding(encoding: string): string {
  const normalized = encoding.toLowerCase().replace(/['"]/g, '').trim()

  const aliases: Record<string, string> = {
    'iso-8859-1': 'windows-1252',  // Windows-1252 is superset, more compatible
    'latin1': 'windows-1252',
    'latin-1': 'windows-1252',
    'iso_8859-1': 'windows-1252',
    'ascii': 'utf-8',              // ASCII is subset of UTF-8
    'us-ascii': 'utf-8',
  }

  return aliases[normalized] || normalized
}

export async function scrapePageToMarkdown(url: string): Promise<ScrapedPage> {
  try {
    // Get raw bytes to detect encoding properly
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HebelkiBot/1.0; Website scraper for onboarding)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Charset': 'utf-8',
      },
      maxContentLength: 5 * 1024 * 1024,  // 5MB max
      responseType: 'arraybuffer',  // Get raw bytes
    })

    const bytes = new Uint8Array(response.data)
    const contentType = response.headers['content-type'] || null

    // Detect encoding BEFORE decoding
    const encoding = detectEncoding(bytes, contentType)

    // Decode ONCE with correct encoding
    const html = new TextDecoder(encoding, { fatal: false }).decode(bytes)

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
