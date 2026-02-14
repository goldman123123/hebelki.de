/**
 * Data Retention Cleanup Cron Job
 *
 * GET /api/cron/cleanup-retention
 *
 * Deletes conversations and messages older than each business's configured
 * dataRetentionDays setting. Defaults to 365 days if not configured.
 * Scheduled to run daily via Vercel Cron.
 *
 * GDPR Compliance: Article 5(1)(e) - Storage Limitation
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { businesses, chatbotConversations, chatbotMessages } from '@/lib/db/schema'
import { eq, and, lt, sql, inArray } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:cron:cleanup-retention')

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    log.error('CRON_SECRET not configured')
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    log.warn('Unauthorized access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    log.info('Starting data retention cleanup...')

    // Fetch all businesses with their retention settings
    const allBusinesses = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        settings: businesses.settings,
      })
      .from(businesses)

    let totalDeletedConversations = 0
    let totalDeletedMessages = 0

    for (const business of allBusinesses) {
      const settings = business.settings as Record<string, unknown> | null
      const retentionDays = (settings?.dataRetentionDays as number) || 365

      // Find closed conversations older than retention period for this business
      const expiredConversations = await db
        .select({ id: chatbotConversations.id })
        .from(chatbotConversations)
        .where(
          and(
            eq(chatbotConversations.businessId, business.id),
            eq(chatbotConversations.status, 'closed'),
            lt(
              chatbotConversations.updatedAt,
              sql`NOW() - INTERVAL '1 day' * ${retentionDays}`
            )
          )
        )

      if (expiredConversations.length === 0) continue

      const conversationIds = expiredConversations.map((c) => c.id)

      // Delete messages first (FK constraint)
      const deletedMessages = await db
        .delete(chatbotMessages)
        .where(inArray(chatbotMessages.conversationId, conversationIds))
        .returning({ id: chatbotMessages.id })

      // Delete conversations
      const deletedConversations = await db
        .delete(chatbotConversations)
        .where(inArray(chatbotConversations.id, conversationIds))
        .returning({ id: chatbotConversations.id })

      totalDeletedConversations += deletedConversations.length
      totalDeletedMessages += deletedMessages.length

      log.info(
        `[RETENTION-CRON] Business "${business.name}" (retention: ${retentionDays}d): deleted ${deletedConversations.length} conversations, ${deletedMessages.length} messages`
      )
    }

    log.info(
      `[RETENTION-CRON] Cleanup complete: ${totalDeletedConversations} conversations, ${totalDeletedMessages} messages deleted across ${allBusinesses.length} businesses`
    )

    return NextResponse.json({
      success: true,
      deletedConversations: totalDeletedConversations,
      deletedMessages: totalDeletedMessages,
      businessesProcessed: allBusinesses.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    log.error('Error:', error)

    return NextResponse.json(
      {
        error: 'Retention cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
