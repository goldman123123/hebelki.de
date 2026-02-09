/**
 * Chatbot Poll API
 *
 * GET /api/chatbot/poll?conversationId=xxx&since=ISO_TIMESTAMP
 *
 * Customer-facing endpoint to poll for new staff messages.
 * Also checks for timeout and triggers email fallback.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatbotConversations, chatbotMessages, businesses } from '@/lib/db/schema'
import { eq, and, gt, ne } from 'drizzle-orm'
import { emitEventStandalone } from '@/modules/core/events'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const since = searchParams.get('since')

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
    }

    // Fetch conversation
    const conversation = await db
      .select()
      .from(chatbotConversations)
      .where(eq(chatbotConversations.id, conversationId))
      .limit(1)
      .then(rows => rows[0])

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const metadata = (conversation.metadata as Record<string, unknown>) || {}

    // Check timeout for live_queue conversations
    if (conversation.status === 'live_queue' && metadata.liveQueuedAt && !metadata.timeoutEmailSent) {
      const business = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, conversation.businessId))
        .limit(1)
        .then(rows => rows[0])

      const settings = (business?.settings as Record<string, unknown>) || {}
      const timeoutMinutes = (settings.liveChatTimeoutMinutes as number) || 5
      const chatDefaultMode = (settings.chatDefaultMode as string) || 'ai'
      const queuedAt = new Date(metadata.liveQueuedAt as string)
      const timeoutAt = new Date(queuedAt.getTime() + timeoutMinutes * 60 * 1000)

      if (new Date() > timeoutAt) {
        // Timeout reached — no staff responded
        console.log(`[POLL] Timeout reached for conversation ${conversationId}`)

        // Mark timeout email as sent to avoid duplicates
        await db
          .update(chatbotConversations)
          .set({
            metadata: { ...metadata, timeoutEmailSent: true },
            updatedAt: new Date(),
          })
          .where(eq(chatbotConversations.id, conversationId))

        // Get conversation summary for email
        const messages = await db
          .select({ role: chatbotMessages.role, content: chatbotMessages.content })
          .from(chatbotMessages)
          .where(eq(chatbotMessages.conversationId, conversationId))
          .limit(10)

        const summary = messages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => `${m.role === 'user' ? 'Kunde' : 'Assistent'}: ${m.content}`)
          .join('\n')

        // Emit escalated event
        if (business?.email) {
          await emitEventStandalone(conversation.businessId, 'chat.escalated', {
            conversationId,
            businessName: business.name,
            ownerEmail: business.email,
            conversationSummary: summary || 'Keine Nachrichten verfügbar',
            dashboardUrl: `https://www.hebelki.de/support-chat`,
          })
        }

        if (chatDefaultMode === 'live') {
          // Live-first mode: revert to AI
          await db
            .update(chatbotConversations)
            .set({
              status: 'active',
              metadata: { ...metadata, timeoutEmailSent: true, revertedToAi: true },
              updatedAt: new Date(),
            })
            .where(eq(chatbotConversations.id, conversationId))

          return NextResponse.json({
            success: true,
            messages: [],
            status: 'active',
            systemMessage: 'Unser KI-Assistent hilft Ihnen gerne weiter.',
          })
        } else {
          // AI-first mode: tell customer about email follow-up
          return NextResponse.json({
            success: true,
            messages: [],
            status: 'live_queue',
            systemMessage: 'Leider ist gerade kein Mitarbeiter verfügbar. Ein Mitarbeiter wird sich per E-Mail bei Ihnen melden.',
          })
        }
      }
    }

    // Fetch new messages since timestamp
    const conditions = [eq(chatbotMessages.conversationId, conversationId)]

    // Only fetch staff/system messages (not user's own messages)
    // We include staff and system messages, and also assistant messages that came via AI fallback
    if (since) {
      conditions.push(gt(chatbotMessages.createdAt, new Date(since)))
    }

    const newMessages = await db
      .select()
      .from(chatbotMessages)
      .where(and(...conditions))
      .orderBy(chatbotMessages.createdAt)

    // Filter to only return staff, assistant, and system messages (not user's own)
    const staffMessages = newMessages.filter(m =>
      m.role === 'staff' || m.role === 'system' || m.role === 'assistant'
    )

    return NextResponse.json({
      success: true,
      messages: staffMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        metadata: m.metadata,
        createdAt: m.createdAt?.toISOString(),
      })),
      status: conversation.status,
    })
  } catch (error) {
    console.error('[Poll API] Error:', error)
    return NextResponse.json(
      { error: 'Poll-Fehler', message: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    )
  }
}
