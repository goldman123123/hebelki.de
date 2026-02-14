/**
 * Conversation Cleanup Cron Job
 *
 * GET /api/cron/cleanup-conversations
 *
 * Automatically deletes old closed conversations based on retention policy
 * Scheduled to run daily at 2 AM via Vercel Cron
 *
 * GDPR Compliance: Article 5(1)(e) - Data Minimization & Storage Limitation
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatbotConversations, chatbotMessages } from '@/lib/db/schema'
import { eq, and, lt, sql } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:cron:cleanup-conversations')

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      log.warn('Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    log.info('Starting conversation cleanup...')

    // Find conversations marked for deletion or past retention period
    // Default retention: 90 days from last update
    const deletionCandidates = await db
      .select({
        id: chatbotConversations.id,
        businessId: chatbotConversations.businessId,
        status: chatbotConversations.status,
        updatedAt: chatbotConversations.updatedAt,
        retentionDays: chatbotConversations.retentionDays,
      })
      .from(chatbotConversations)
      .where(
        and(
          eq(chatbotConversations.status, 'closed'),
          sql`${chatbotConversations.updatedAt} < NOW() - INTERVAL '1 day' * COALESCE(${chatbotConversations.retentionDays}, 90)`
        )
      )

    if (deletionCandidates.length === 0) {
      log.info('No conversations to clean up')
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: 'No conversations to clean up',
      })
    }

    log.info(`Found ${deletionCandidates.length} conversations to delete`)

    // Delete conversations and their messages
    let deletedConversations = 0
    let deletedMessages = 0

    for (const conversation of deletionCandidates) {
      try {
        // Delete messages first (FK constraint)
        const messages = await db
          .delete(chatbotMessages)
          .where(eq(chatbotMessages.conversationId, conversation.id))
          .returning()

        // Delete conversation
        await db
          .delete(chatbotConversations)
          .where(eq(chatbotConversations.id, conversation.id))

        deletedConversations++
        deletedMessages += messages.length

        log.info(
          `[CLEANUP-CRON] Deleted conversation ${conversation.id} (${messages.length} messages)`
        )
      } catch (error) {
        log.error(
          `[CLEANUP-CRON] Error deleting conversation ${conversation.id}:`,
          error
        )
        // Continue with next conversation even if one fails
      }
    }

    log.info(
      `[CLEANUP-CRON] Cleanup complete: ${deletedConversations} conversations, ${deletedMessages} messages deleted`
    )

    return NextResponse.json({
      success: true,
      deletedConversations,
      deletedMessages,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    log.error('Error:', error)

    return NextResponse.json(
      {
        error: 'Cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
