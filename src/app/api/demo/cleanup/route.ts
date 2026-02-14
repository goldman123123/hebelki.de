/**
 * Demo Cleanup API
 *
 * POST /api/demo/cleanup
 *
 * Cron endpoint to reset demo data. Deletes conversations, messages,
 * holds, recent bookings, and recent customers for all demo businesses.
 * Protected by CRON_SECRET bearer token.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  businesses,
  chatbotConversations,
  chatbotMessages,
  bookingHolds,
  bookings,
  customers,
} from '@/lib/db/schema'
import { eq, and, sql, gt, inArray } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:demo:cleanup')

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET authorization
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET

    if (!expectedToken) {
      log.error('CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find all demo businesses
    const demoBusinesses = await db
      .select({ id: businesses.id, name: businesses.name })
      .from(businesses)
      .where(sql`${businesses.settings}->>'isDemo' = 'true'`)

    if (demoBusinesses.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No demo businesses found',
        deleted: {},
      })
    }

    const demoBusinessIds = demoBusinesses.map(b => b.id)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const counts: Record<string, number> = {
      messages: 0,
      conversations: 0,
      bookingHolds: 0,
      bookings: 0,
      customers: 0,
    }

    for (const businessId of demoBusinessIds) {
      // 1. Delete chatbot messages (via conversations)
      const convos = await db
        .select({ id: chatbotConversations.id })
        .from(chatbotConversations)
        .where(eq(chatbotConversations.businessId, businessId))

      if (convos.length > 0) {
        const convoIds = convos.map(c => c.id)

        const messagesResult = await db
          .delete(chatbotMessages)
          .where(inArray(chatbotMessages.conversationId, convoIds))
          .returning({ id: chatbotMessages.id })

        counts.messages += messagesResult.length
      }

      // 2. Delete chatbot conversations
      const convosResult = await db
        .delete(chatbotConversations)
        .where(eq(chatbotConversations.businessId, businessId))
        .returning({ id: chatbotConversations.id })

      counts.conversations += convosResult.length

      // 3. Delete booking holds
      const holdsResult = await db
        .delete(bookingHolds)
        .where(eq(bookingHolds.businessId, businessId))
        .returning({ id: bookingHolds.id })

      counts.bookingHolds += holdsResult.length

      // 4. Delete bookings created after seed (> 1 day ago)
      const bookingsResult = await db
        .delete(bookings)
        .where(
          and(
            eq(bookings.businessId, businessId),
            gt(bookings.createdAt, oneDayAgo)
          )
        )
        .returning({ id: bookings.id })

      counts.bookings += bookingsResult.length

      // 5. Delete customers created after seed (> 1 day ago)
      const customersResult = await db
        .delete(customers)
        .where(
          and(
            eq(customers.businessId, businessId),
            gt(customers.createdAt, oneDayAgo)
          )
        )
        .returning({ id: customers.id })

      counts.customers += customersResult.length
    }

    log.info('Demo cleanup completed:', {
      businesses: demoBusinessIds.length,
      ...counts,
    })

    return NextResponse.json({
      success: true,
      businessCount: demoBusinessIds.length,
      deleted: counts,
    })
  } catch (error) {
    log.error('Demo cleanup error:', error)

    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    )
  }
}
