/**
 * Chatbot Conversation History API
 *
 * GET /api/chatbot/conversations/[id]
 * Gets the message history for a specific conversation.
 *
 * DELETE /api/chatbot/conversations/[id]
 * Deletes a conversation and all associated messages (GDPR Right to Be Forgotten)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConversationHistory } from '@/modules/chatbot/lib/conversation'
import { db } from '@/lib/db'
import { chatbotConversations, chatbotMessages } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireBusinessAccess } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const conversationId = id

    const messages = await getConversationHistory(conversationId)

    return NextResponse.json({
      success: true,
      conversationId,
      messages,
    })
  } catch (error) {
    console.error('[Chatbot API] Error:', error)

    return NextResponse.json(
      {
        error: 'Fehler beim Abrufen des Verlaufs',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get conversation to verify business ownership
    const conversation = await db
      .select()
      .from(chatbotConversations)
      .where(eq(chatbotConversations.id, id))
      .limit(1)
      .then(rows => rows[0])

    if (!conversation) {
      return NextResponse.json(
        { error: 'Konversation nicht gefunden' },
        { status: 404 }
      )
    }

    // Verify user has access to this business
    await requireBusinessAccess(conversation.businessId)

    // Delete all messages first (FK constraint)
    const deletedMessages = await db
      .delete(chatbotMessages)
      .where(eq(chatbotMessages.conversationId, id))
      .returning()

    // Delete conversation
    await db
      .delete(chatbotConversations)
      .where(eq(chatbotConversations.id, id))

    console.log(`[CONVERSATION-DELETE] Deleted conversation ${id} with ${deletedMessages.length} messages`)

    return NextResponse.json({
      success: true,
      deletedMessages: deletedMessages.length,
    })
  } catch (error) {
    console.error('[Conversation Delete API] Error:', error)

    return NextResponse.json(
      {
        error: 'Löschen fehlgeschlagen',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    )
  }
}
