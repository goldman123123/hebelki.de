/**
 * In-memory scrape job manager
 * Tracks scraping progress for SSE streaming
 * For MVP - can be moved to Redis/DB for production
 */
import { ScrapedPage } from './html-to-markdown'
import { db } from '@/lib/db'
import { scrapedPages } from '@/lib/db/schema'

export interface ScrapeJob {
  id: string
  businessId: string
  urls: string[]
  status: 'pending' | 'scraping' | 'extracting' | 'completed' | 'failed'
  scrapedPages: ScrapedPage[]
  failedUrls: { url: string; error: string }[]
  currentIndex: number
  startedAt: Date
  completedAt?: Date
}

// In-memory store (for MVP - can move to Redis/DB later)
const jobs = new Map<string, ScrapeJob>()

export function createJob(businessId: string, urls: string[]): ScrapeJob {
  const id = crypto.randomUUID()
  const job: ScrapeJob = {
    id,
    businessId,
    urls,
    status: 'pending',
    scrapedPages: [],
    failedUrls: [],
    currentIndex: 0,
    startedAt: new Date()
  }
  jobs.set(id, job)
  console.log(`✅ Created scrape job ${id} with ${urls.length} URLs`)
  return job
}

export function getJob(id: string): ScrapeJob | undefined {
  return jobs.get(id)
}

export function updateJob(id: string, updates: Partial<ScrapeJob>): void {
  const job = jobs.get(id)
  if (job) {
    Object.assign(job, updates)
  }
}

export function deleteJob(id: string): void {
  jobs.delete(id)
  console.log(`🗑️ Deleted scrape job ${id}`)
}

// Cleanup old jobs (> 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  for (const [id, job] of jobs.entries()) {
    if (job.startedAt.getTime() < oneHourAgo) {
      jobs.delete(id)
      console.log(`🗑️ Auto-deleted old job ${id}`)
    }
  }
}, 15 * 60 * 1000) // Run every 15 minutes

// Helper function to create content hash
function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(16)
}

// Add scraped page to job and persist to database
export async function addScrapedPage(jobId: string, page: ScrapedPage) {
  const job = jobs.get(jobId)
  if (!job) return

  // Add to in-memory job (for immediate use)
  job.scrapedPages.push(page)

  // Persist to database (for long-term storage)
  try {
    const contentHash = hashContent(page.markdown)
    const wordCount = page.markdown.split(/\s+/).length

    await db.insert(scrapedPages).values({
      businessId: job.businessId,
      scrapeJobId: jobId,
      url: page.url,
      title: page.title || null,
      markdown: page.markdown,
      wordCount,
      contentHash,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    })

    console.log(`✅ [SCRAPER] Saved page to database: ${page.url}`)
  } catch (error) {
    console.error(`❌ [SCRAPER] Failed to save page to DB:`, error)
    // Don't throw - continue scraping even if DB save fails
  }
}
