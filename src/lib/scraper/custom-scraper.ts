/**
 * Custom website scraper with real-time progress streaming
 * Replaces Firecrawl for better control and no rate limits
 */
import { scrapePageToMarkdown, ScrapedPage } from './html-to-markdown'
import { getJob, updateJob, addScrapedPage } from './scrape-job-manager'

export type ScrapeEventType =
  | 'started'
  | 'scraping'
  | 'completed'
  | 'failed'
  | 'pages_complete'
  | 'extracting'
  | 'extraction_progress'
  | 'complete'
  | 'error'

export interface ScrapeEvent {
  type: ScrapeEventType
  data: any
}

/**
 * Async generator that yields scraping events for SSE streaming
 */
export async function* scrapePages(
  jobId: string,
  urls: string[]
): AsyncGenerator<ScrapeEvent> {
  const total = urls.length

  yield {
    type: 'started',
    data: { total, jobId }
  }

  updateJob(jobId, { status: 'scraping' })

  const scrapedPages: ScrapedPage[] = []
  const failedUrls: { url: string; error: string }[] = []

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]

    yield {
      type: 'scraping',
      data: { url, index: i + 1, total }
    }

    try {
      const page = await scrapePageToMarkdown(url)
      scrapedPages.push(page)

      // Persist page to database for long-term storage
      await addScrapedPage(jobId, page)

      updateJob(jobId, {
        currentIndex: i + 1,
        scrapedPages: [...scrapedPages]
      })

      yield {
        type: 'completed',
        data: {
          url,
          index: i + 1,
          total,
          size: `${(page.size / 1024).toFixed(1)}KB`,
          title: page.title
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error'
      failedUrls.push({ url, error: errorMessage })

      updateJob(jobId, { failedUrls: [...failedUrls] })

      yield {
        type: 'failed',
        data: {
          url,
          index: i + 1,
          total,
          error: errorMessage
        }
      }
    }

    // Rate limit: 200ms between requests (5 req/sec)
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  yield {
    type: 'pages_complete',
    data: {
      scrapedCount: scrapedPages.length,
      failedCount: failedUrls.length
    }
  }

  updateJob(jobId, {
    status: 'extracting',
    scrapedPages,
    failedUrls
  })
}
