/**
 * Support Close Conversation API
 *
 * POST /api/chatbot/support/conversations/[id]/close
 *
 * Close a conversation and insert a system message.
 * Auth-protected: requires business membership.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { chatbotConversations, chatbotMessages } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:chatbot:support:conversations:id:close')

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireBusinessAuth()
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { id: conversationId } = await params

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

    // Insert system message
    await db.insert(chatbotMessages).values({
      conversationId,
      role: 'system',
      content: 'Das Gespräch wurde vom Support geschlossen.',
    })

    // Update conversation status
    await db
      .update(chatbotConversations)
      .set({
        status: 'closed',
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(chatbotConversations.id, conversationId))

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Schließen des Gesprächs' },
      { status: 500 }
    )
  }
}
