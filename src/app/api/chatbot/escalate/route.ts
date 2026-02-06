/**
 * Chatbot Escalation API
 *
 * POST /api/chatbot/escalate
 *
 * Escalates a conversation to a human agent
 * Changes conversation status to 'escalated'
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatbotConversations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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

    // Update conversation metadata to track awaiting contact info
    await db
      .update(chatbotConversations)
      .set({
        metadata: {
          ...(conversation.metadata as any || {}),
          awaitingContactInfo: true,
          contactInfoRequestedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(chatbotConversations.id, conversationId))

    console.log(`[ESCALATION] Requesting contact info for conversation ${conversationId}`)

    // Return message asking for contact info
    const message = "Um Sie zu kontaktieren, benötigen wir Ihre E-Mail-Adresse oder Telefonnummer. Wie können wir Sie erreichen?"

    return NextResponse.json({
      success: true,
      message,
      awaitingContactInfo: true,
    })
  } catch (error) {
    console.error('[Escalation API] Error:', error)

    return NextResponse.json(
      {
        error: 'Eskalierungs-Fehler',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    )
  }
}
