/**
 * Scraper library exports
 * Centralized exports for all scraper functionality
 *
 * Note: The actual scraping now happens on the fly.io documents-worker.
 * These utilities are used for page discovery and categorization in the app.
 */

// Page discovery
export { fetchSitemap, getPriorityUrls } from './sitemap-parser'
export { crawlHomepageLinks } from './link-crawler'
export type { CrawledLink } from './link-crawler'

// Page categorization
export { categorizePage, categorizePages } from './page-categorizer'
export type { CategorizedPage, PageCategory, PagePriority } from './page-categorizer'

// HTML to markdown conversion (for service detection)
export { scrapePageToMarkdown } from './html-to-markdown'
export type { ScrapedPage } from './html-to-markdown'

// HTML to clean text (for chunking)
export { htmlToCleanText, extractMainContentFromHtml } from './html-to-clean-text'
