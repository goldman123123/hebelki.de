import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredHolds } from '@/lib/db/holds'

/**
 * Cron job to cleanup expired holds
 * Runs every minute via Vercel Cron
 *
 * GET /api/cron/cleanup-holds
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET not configured')
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Cron] Invalid or missing authorization header')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[Cron] Starting expired holds cleanup...')
    const count = await cleanupExpiredHolds()
    console.log(`[Cron] Cleanup complete: ${count} holds deleted`)

    return NextResponse.json({
      success: true,
      deletedCount: count,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Cron] Error cleaning up holds:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
