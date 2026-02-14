/**
 * Support Conversation Messages API
 *
 * GET /api/chatbot/support/conversations/[id]/messages
 *
 * Get messages for a conversation. Optional `since` param for polling.
 * Auth-protected: requires business membership.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { chatbotConversations, chatbotMessages } from '@/lib/db/schema'
import { eq, and, gt, ne } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:chatbot:support:conversations:id:messages')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireBusinessAuth()
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { id: conversationId } = await params
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')

    // Verify conversation belongs to business
    const conversation = await db
      .select()
      .from(chatbotConversations)
      .where(and(
        eq(chatbotConversations.id, conversationId),
        eq(chatbotConversations.businessId, authResult.business.id)
      ))
      .limit(1)
      .then(rows => rows[0])

    if (!conversation) {
      return NextResponse.json({ error: 'Gespräch nicht gefunden' }, { status: 404 })
    }

    // Build conditions
    const conditions = [
      eq(chatbotMessages.conversationId, conversationId),
      ne(chatbotMessages.role, 'tool'), // Filter out tool messages
    ]

    if (since) {
      conditions.push(gt(chatbotMessages.createdAt, new Date(since)))
    }

    const messages = await db
      .select()
      .from(chatbotMessages)
      .where(and(...conditions))
      .orderBy(chatbotMessages.createdAt)

    return NextResponse.json({
      success: true,
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        metadata: m.metadata,
        createdAt: m.createdAt?.toISOString(),
      })),
      conversationStatus: conversation.status,
    })
  } catch (error) {
    log.error('Error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Nachrichten' },
      { status: 500 }
    )
  }
}
