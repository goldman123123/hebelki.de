/**
 * Chatbot Conversation History API
 *
 * GET /api/chatbot/conversations/[id]
 *
 * Gets the message history for a specific conversation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConversationHistory } from '@/modules/chatbot/lib/conversation'

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
