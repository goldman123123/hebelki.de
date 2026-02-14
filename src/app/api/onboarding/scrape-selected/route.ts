/**
 * API Route: Scrape Selected Pages (Protected)
 *
 * Creates a worker job for URL scraping instead of doing it in-app.
 * The fly.io worker handles the actual scraping, chunking, and extraction.
 *
 * Security:
 * - Requires authentication (Clerk)
 * - Verifies business access
 * - Rate limited: 10 scrapes per hour per user
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { ingestionJobs, businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireBusinessAccess } from '@/lib/auth-helpers'
import { scrapingLimiter } from '@/lib/rate-limit'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:onboarding:scrape-selected')

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    // 2. Rate limiting - 10 scrapes per hour per user
    try {
      await scrapingLimiter.check(userId, 10)
    } catch (rateLimitError) {
      const message = rateLimitError instanceof Error ? rateLimitError.message : 'Rate limit exceeded'
      return NextResponse.json(
        { error: message },
        { status: 429 }
      )
    }

    // 3. Validate request body
    const { businessId, urls, businessType } = await request.json()

    if (!businessId || !urls || urls.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId and urls are required' },
        { status: 400 }
      )
    }

    // 4. Verify user has access to this business
    try {
      await requireBusinessAccess(businessId)
    } catch (accessError) {
      const message = accessError instanceof Error ? accessError.message : 'Access denied'
      return NextResponse.json(
        { error: message },
        { status: 403 }
      )
    }

    log.info(`User ${userId} starting scrape for business ${businessId} with ${urls.length} URLs`)

    // 5. Create worker job
    const scrapeConfig = {
      audience: 'public' as const,
      scopeType: 'global' as const,
      dataClass: 'knowledge',
      businessType: businessType || 'general',
    }

    const [job] = await db.insert(ingestionJobs).values({
      businessId,
      sourceType: 'url',
      sourceUrl: urls[0], // Use first URL as source
      discoveredUrls: urls,
      scrapeConfig,
      extractServices: true, // Enable service detection for onboarding
      status: 'queued',
      stage: 'discovering',
      attempts: 0,
      maxAttempts: 3,
    }).returning({ id: ingestionJobs.id })

    log.info(`Created job ${job.id} for ${urls.length} URLs`)

    // 6. Update business onboarding state
    const currentBusiness = await db.query.businesses.findFirst({
      where: eq(businesses.id, businessId)
    })

    const currentOnboardingState = (currentBusiness?.onboardingState as Record<string, unknown>) || {}

    await db.update(businesses)
      .set({
        onboardingState: {
          ...currentOnboardingState,
          scrapeJobId: job.id,
          scrapeStartedAt: new Date().toISOString(),
          scrapedPagesCount: urls.length,
        }
      })
      .where(eq(businesses.id, businessId))

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: 'queued',
      urlCount: urls.length,
    })
  } catch (error) {
    log.error('Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start scraping' },
      { status: 500 }
    )
  }
}
