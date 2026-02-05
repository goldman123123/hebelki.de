/**
 * Scraper library exports
 * Centralized exports for all scraper functionality
 */

// Core scraper
export { scrapePages } from './custom-scraper'
export type { ScrapeEvent, ScrapeEventType } from './custom-scraper'

// Page discovery
export { fetchSitemap, getPriorityUrls } from './sitemap-parser'
export { crawlHomepageLinks } from './link-crawler'
export type { CrawledLink } from './link-crawler'

// Page categorization
export { categorizePage, categorizePages } from './page-categorizer'
export type { CategorizedPage, PageCategory, PagePriority } from './page-categorizer'

// HTML to markdown conversion
export { scrapePageToMarkdown } from './html-to-markdown'
export type { ScrapedPage } from './html-to-markdown'

// Job management
export {
  createJob,
  getJob,
  updateJob,
  deleteJob
} from './scrape-job-manager'
export type { ScrapeJob } from './scrape-job-manager'
