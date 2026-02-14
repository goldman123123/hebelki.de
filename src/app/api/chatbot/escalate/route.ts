/**
 * Chatbot Escalation API
 *
 * POST /api/chatbot/escalate
 *
 * Escalates a conversation to a human agent.
 * If liveChatEnabled: sets status to live_queue (skip contact info collection).
 * Otherwise: collects contact info then marks as escalated.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatbotConversations, chatbotMessages, businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { emitEventStandalone } from '@/modules/core/events'
import { escalationLimiter } from '@/lib/rate-limit'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:chatbot:escalate')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId } = body

    // Validate required fields
    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json(
        { error: 'conversationId ist erforderlich' },
        { status: 400 }
      )
    }

    // Rate limiting: 5 escalations per minute per conversationId
    try {
      await escalationLimiter.check(conversationId, 5)
    } catch {
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' },
        { status: 429 }
      )
    }

    // Verify conversation exists
    const conversation = await db
      .select()
      .from(chatbotConversations)
      .where(eq(chatbotConversations.id, conversationId))
      .limit(1)
      .then(rows => rows[0])

    if (!conversation) {
      return NextResponse.json(
        { error: 'Konversation nicht gefunden' },
        { status: 404 }
      )
    }

    // Fetch business settings
    const business = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, conversation.businessId))
      .limit(1)
      .then(rows => rows[0])

    const settings = (business?.settings as Record<string, unknown>) || {}
    const liveChatEnabled = settings.liveChatEnabled === true

    if (liveChatEnabled) {
      // Live chat mode: skip contact info, queue for staff
      await db
        .update(chatbotConversations)
        .set({
          status: 'live_queue',
          metadata: {
            ...((conversation.metadata as Record<string, unknown>) || {}),
            liveQueuedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(chatbotConversations.id, conversationId))

      log.info(`Conversation ${conversationId} moved to live_queue`)

      // Get first user message for email notification
      const firstMessage = await db
        .select({ content: chatbotMessages.content })
        .from(chatbotMessages)
        .where(eq(chatbotMessages.conversationId, conversationId))
        .limit(1)
        .then(rows => rows[0]?.content || '')

      // Emit event to notify owner
      if (business?.email) {
        await emitEventStandalone(conversation.businessId, 'chat.live_requested', {
          conversationId,
          businessName: business.name,
          ownerEmail: business.email,
          firstMessage,
          dashboardUrl: `https://www.hebelki.de/support-chat`,
        })
      }

      const message = "Einen Moment bitte, ein Mitarbeiter wird sich in Kürze melden..."

      return NextResponse.json({
        success: true,
        message,
        liveChatMode: true,
      })
    }

    // Legacy flow: collect contact info
    await db
      .update(chatbotConversations)
      .set({
        metadata: {
          ...((conversation.metadata as Record<string, unknown>) || {}),
          awaitingContactInfo: true,
          contactInfoRequestedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(chatbotConversations.id, conversationId))

    log.info(`Requesting contact info for conversation ${conversationId}`)

    const message = "Um Sie zu kontaktieren, benötigen wir Ihre E-Mail-Adresse oder Telefonnummer. Wie können wir Sie erreichen?"

    return NextResponse.json({
      success: true,
      message,
      awaitingContactInfo: true,
    })
  } catch (error) {
    log.error('Error:', error)

    return NextResponse.json(
      { error: 'Eskalierungs-Fehler' },
      { status: 500 }
    )
  }
}
