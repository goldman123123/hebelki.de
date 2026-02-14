/**
 * API: GET /api/data/scrape-url/[jobId]
 *
 * Get the status of a URL scraping job.
 * Used for polling progress.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ingestionJobs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireBusinessAccess } from '@/lib/auth-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:data:scrape-url:jobId')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    // Verify business access
    await requireBusinessAccess(businessId)

    // Get job status
    const [job] = await db
      .select({
        id: ingestionJobs.id,
        status: ingestionJobs.status,
        stage: ingestionJobs.stage,
        errorCode: ingestionJobs.errorCode,
        lastError: ingestionJobs.lastError,
        metrics: ingestionJobs.metrics,
        createdAt: ingestionJobs.createdAt,
        completedAt: ingestionJobs.completedAt,
      })
      .from(ingestionJobs)
      .where(
        and(
          eq(ingestionJobs.id, jobId),
          eq(ingestionJobs.businessId, businessId)
        )
      )

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      stage: job.stage,
      error: job.lastError,
      errorCode: job.errorCode,
      metrics: job.metrics,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    })
  } catch (error) {
    log.error('Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get job status' },
      { status: 500 }
    )
  }
}
