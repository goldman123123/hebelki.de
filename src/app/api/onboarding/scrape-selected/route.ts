/**
 * API Route: Scrape Selected Pages (Protected)
 * Scrapes selected pages with real-time SSE progress streaming
 * Then extracts knowledge and services using AI
 *
 * Security:
 * - Requires authentication (Clerk)
 * - Verifies business access
 * - Rate limited: 10 scrapes per hour per user
 */
import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createJob, getJob } from '@/lib/scraper/scrape-job-manager'
import { scrapePages } from '@/lib/scraper/custom-scraper'
import { extractKnowledgeFromContent, extractServicesFromContent } from '@/lib/ai-extractor'
import { deduplicateServices } from '@/lib/ai-extractor/deduplicator'
import { db } from '@/lib/db'
import { businesses, chatbotKnowledge } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireBusinessAccess } from '@/lib/auth-helpers'
import { scrapingLimiter } from '@/lib/rate-limit'
import type { ScrapedPage } from '@/lib/ai-extractor/types'

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const { userId } = await auth()
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Please sign in' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. Rate limiting - 10 scrapes per hour per user
    try {
      await scrapingLimiter.check(userId, 10)
    } catch (rateLimitError) {
      const message = rateLimitError instanceof Error ? rateLimitError.message : 'Rate limit exceeded'
      return new Response(
        JSON.stringify({ error: message }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 3. Validate request body
    const { businessId, urls, businessType } = await request.json()

    if (!businessId || !urls || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: businessId and urls are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 4. Verify user has access to this business
    try {
      await requireBusinessAccess(businessId)
    } catch (accessError) {
      const message = accessError instanceof Error ? accessError.message : 'Access denied'
      return new Response(
        JSON.stringify({ error: message }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🚀 [User: ${userId}] Starting scrape job for business ${businessId} with ${urls.length} URLs`)

    // Create job
    const job = createJob(businessId, urls)

    // Setup SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Helper to send SSE event
        const sendEvent = (event: any) => {
          const data = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(data))
        }

        try {
          // Phase 1: Scrape pages
          console.log(`📄 Scraping ${urls.length} pages...`)
          for await (const event of scrapePages(job.id, urls)) {
            sendEvent(event)
          }

          // Get scraped pages from job
          const updatedJob = getJob(job.id)
          if (!updatedJob) {
            throw new Error('Job not found')
          }

          const scrapedPagesRaw = updatedJob.scrapedPages

          // Convert to AI extractor format
          const scrapedPages: ScrapedPage[] = scrapedPagesRaw.map(page => ({
            url: page.url,
            markdown: page.markdown,
            html: page.html,
            metadata: {
              title: page.title || undefined,
              description: page.description || undefined
            }
          }))

          console.log(`✅ Scraped ${scrapedPages.length} pages, failed ${updatedJob.failedUrls.length}`)

          if (scrapedPages.length === 0) {
            throw new Error('No pages were successfully scraped')
          }

          // Phase 1.5: Semantic chunking of scraped pages
          sendEvent({
            type: 'chunking',
            data: { stage: 'semantic_chunking', pagesCount: scrapedPages.length }
          })

          console.log(`🔪 Chunking ${scrapedPages.length} pages into semantic chunks...`)

          // Import chunking utilities
          const { processScrapedPageToChunks } = await import('@/lib/chunking/semantic-chunker')
          const { generateEmbeddings } = await import('@/lib/embeddings')
          const { extractMainContentFromHtml } = await import('@/lib/scraper/html-to-clean-text')

          // Process each page into chunks
          const allChunks: Array<{
            businessId: string
            source: 'website'
            title: string
            content: string
            category: null
            metadata: Record<string, unknown>
            embedding: number[]
            isActive: boolean
          }> = []

          for (const page of scrapedPages) {
            const pageTitle = page.metadata?.title || 'Untitled'

            // Convert HTML to clean text (removes navigation, footer, etc.)
            const cleanText = page.html
              ? extractMainContentFromHtml(page.html)
              : page.markdown // Fallback to markdown if no HTML

            console.log(`[Scraper] Converted ${page.url} to clean text: ${cleanText.length} chars`)

            const chunks = await processScrapedPageToChunks(
              page.url,
              pageTitle,
              cleanText, // Use clean text instead of raw markdown
              {
                maxChunkSize: 1000,
                minChunkSize: 200,
                overlapSize: 100,
              }
            )

            // Generate embeddings for all chunks from this page
            const chunkTexts = chunks.map(chunk => chunk.content)
            const embeddings = await generateEmbeddings(chunkTexts)

            // Prepare knowledge entries for each chunk
            for (let i = 0; i < chunks.length; i++) {
              const chunk = chunks[i]
              allChunks.push({
                businessId,
                source: 'website' as const,
                title: `${pageTitle} (Teil ${chunk.chunkIndex + 1}/${chunk.totalChunks})`,
                content: chunk.content,
                category: null,
                metadata: {
                  url: chunk.url,
                  pageTitle: chunk.pageTitle,
                  chunkIndex: chunk.chunkIndex,
                  totalChunks: chunk.totalChunks,
                  heading: chunk.metadata?.heading,
                  chunkingMethod: 'semantic',
                },
                embedding: embeddings[i],
                isActive: true,
              })
            }
          }

          // Store chunked knowledge entries
          if (allChunks.length > 0) {
            await db.insert(chatbotKnowledge).values(allChunks)
            console.log(`💾 Saved ${allChunks.length} semantic chunks with embeddings to database`)
          }

          sendEvent({
            type: 'chunking_complete',
            data: { chunksCreated: allChunks.length }
          })

          // Phase 2: Extract knowledge with AI (in addition to chunks)
          sendEvent({
            type: 'extracting',
            data: { stage: 'knowledge' }
          })

          console.log(`🧠 Extracting knowledge from ${scrapedPages.length} pages...`)
          const knowledgeEntries = await extractKnowledgeFromContent(
            scrapedPages,
            businessType || 'business'
          )

          console.log(`✅ Extracted ${knowledgeEntries.length} knowledge entries`)

          // Insert knowledge into database with embeddings
          if (knowledgeEntries.length > 0) {
            // Import embedding function (dynamic import to avoid issues)
            const { generateEmbeddings } = await import('@/lib/embeddings')

            // Generate embeddings for all entries (batch processing)
            console.log(`🤖 Generating embeddings for ${knowledgeEntries.length} entries...`)
            const texts = knowledgeEntries.map(entry =>
              `${entry.title}\n${entry.content}`.trim()
            )
            const embeddings = await generateEmbeddings(texts)
            console.log(`✅ Embeddings generated successfully`)

            // Insert with embeddings
            await db.insert(chatbotKnowledge).values(
              knowledgeEntries.map((entry, i) => ({
                businessId,
                source: 'website' as const,
                content: entry.content,
                title: entry.title || '',
                category: entry.category,
                metadata: { confidence: entry.confidence },
                isActive: true,
                embedding: embeddings[i]  // Add embedding vector
              }))
            )
            console.log(`💾 Saved ${knowledgeEntries.length} knowledge entries with embeddings to database`)
          }

          sendEvent({
            type: 'extraction_progress',
            data: { stage: 'knowledge', count: knowledgeEntries.length }
          })

          // Phase 3: Extract services
          sendEvent({
            type: 'extracting',
            data: { stage: 'services' }
          })

          console.log(`🛠️ Extracting services from ${scrapedPages.length} pages...`)
          const services = await extractServicesFromContent(
            scrapedPages,
            businessType || 'business'
          )

          const uniqueServices = deduplicateServices(services)
          console.log(`✅ Extracted ${uniqueServices.length} unique services (from ${services.length} total)`)

          sendEvent({
            type: 'extraction_progress',
            data: { stage: 'services', count: uniqueServices.length }
          })

          // Store services for review (don't auto-insert)
          const currentBusiness = await db.query.businesses.findFirst({
            where: eq(businesses.id, businessId)
          })

          const currentOnboardingState = (currentBusiness?.onboardingState as any) || {}

          await db.update(businesses)
            .set({
              onboardingState: {
                ...currentOnboardingState,
                extractionComplete: true,
                knowledgeEntriesCreated: knowledgeEntries.length,
                semanticChunksCreated: allChunks.length,
                totalKnowledgeEntries: knowledgeEntries.length + allChunks.length,
                servicesForReview: uniqueServices,
                scrapedPagesCount: scrapedPages.length,
                failedPagesCount: updatedJob.failedUrls.length,
                scrapeCompletedAt: new Date().toISOString()
              }
            })
            .where(eq(businesses.id, businessId))

          console.log(`💾 Updated business onboarding state`)

          // Complete
          sendEvent({
            type: 'complete',
            data: {
              knowledgeCount: knowledgeEntries.length,
              chunksCount: allChunks.length,
              totalKnowledgeEntries: knowledgeEntries.length + allChunks.length,
              servicesCount: uniqueServices.length,
              pagesScraped: scrapedPages.length,
              pagesFailed: updatedJob.failedUrls.length
            }
          })

          console.log(`🎉 Scrape job completed successfully!`)

          controller.close()
        } catch (error: any) {
          console.error(`❌ Scrape job failed:`, error)
          sendEvent({
            type: 'error',
            data: { message: error.message }
          })
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
      }
    })
  } catch (error: any) {
    console.error(`❌ Failed to start scrape job:`, error)
    return new Response(error.message, { status: 500 })
  }
}
