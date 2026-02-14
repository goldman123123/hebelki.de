/**
 * GET /api/cron/process-documents
 *
 * Cron job to monitor document processing:
 * - Does NOT process jobs (that's the worker's responsibility)
 * - Resets stuck jobs (parsing > 10min)
 * - Alerts if too many failures
 * - Returns health status
 *
 * Call this from Vercel Cron (every 5 minutes)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ingestionJobs, documents, documentVersions } from '@/lib/db/schema'
import { eq, and, lt, sql, inArray } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:cron:process-documents')

// Thresholds
const STUCK_JOB_THRESHOLD_MINUTES = 10
const FAILURE_ALERT_THRESHOLD = 5 // Alert if > 5 failed jobs

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      log.error('CRON_SECRET not configured')
      return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      stuckJobsReset: 0,
      pendingJobs: 0,
      processingJobs: 0,
      failedJobs: 0,
      completedToday: 0,
      alerts: [] as string[],
    }

    // 1. Find and reset stuck jobs (parsing/chunking/embedding > 10 min)
    const stuckThreshold = new Date(Date.now() - STUCK_JOB_THRESHOLD_MINUTES * 60 * 1000)

    const stuckJobs = await db
      .select({ id: ingestionJobs.id })
      .from(ingestionJobs)
      .where(
        and(
          inArray(ingestionJobs.status, ['parsing', 'chunking', 'embedding']),
          lt(ingestionJobs.startedAt, stuckThreshold)
        )
      )

    if (stuckJobs.length > 0) {
      await db
        .update(ingestionJobs)
        .set({
          status: 'retry_ready',
          lastError: `Job stuck for > ${STUCK_JOB_THRESHOLD_MINUTES} minutes, reset by cron`,
          updatedAt: new Date(),
        })
        .where(
          inArray(
            ingestionJobs.id,
            stuckJobs.map(j => j.id)
          )
        )

      results.stuckJobsReset = stuckJobs.length
      log.info(`Reset ${stuckJobs.length} stuck jobs`)
    }

    // 2. Count pending jobs (waiting for worker)
    const pendingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(ingestionJobs)
      .where(inArray(ingestionJobs.status, ['uploaded', 'retry_ready']))
      .then(rows => Number(rows[0].count))

    results.pendingJobs = pendingCount

    // 3. Count currently processing jobs
    const processingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(ingestionJobs)
      .where(inArray(ingestionJobs.status, ['parsing', 'chunking', 'embedding']))
      .then(rows => Number(rows[0].count))

    results.processingJobs = processingCount

    // 4. Count failed jobs (in last 24h)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const failedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(ingestionJobs)
      .where(
        and(
          eq(ingestionJobs.status, 'failed'),
          sql`${ingestionJobs.updatedAt} > ${dayAgo.toISOString()}`
        )
      )
      .then(rows => Number(rows[0].count))

    results.failedJobs = failedCount

    if (failedCount > FAILURE_ALERT_THRESHOLD) {
      results.alerts.push(`High failure rate: ${failedCount} failed jobs in last 24h`)
    }

    // 5. Count completed today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const completedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(ingestionJobs)
      .where(
        and(
          eq(ingestionJobs.status, 'done'),
          sql`${ingestionJobs.completedAt} > ${todayStart.toISOString()}`
        )
      )
      .then(rows => Number(rows[0].count))

    results.completedToday = completedCount

    // 6. Check for documents marked for deletion that need cleanup
    const pendingDeletion = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(eq(documents.status, 'deleted_pending'))
      .then(rows => Number(rows[0].count))

    if (pendingDeletion > 0) {
      results.alerts.push(`${pendingDeletion} documents pending cleanup`)
    }

    log.info('Document processing health check:', results)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    })
  } catch (error) {
    log.error('Error in process-documents:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
