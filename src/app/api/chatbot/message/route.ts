/**
 * Chatbot Message API
 *
 * POST /api/chatbot/message
 *
 * Handles incoming chat messages and returns AI responses.
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleChatMessage } from '@/modules/chatbot/lib/conversation'
import { getBusinessMemberRole } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { businesses, chatbotConversations, businessMembers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { businessId, conversationId, message, channel, customerId } = body

    // Validate required fields
    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json(
        { error: 'businessId ist erforderlich und muss ein String sein' },
        { status: 400 }
      )
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'message ist erforderlich' },
        { status: 400 }
      )
    }

    // PHASE 3 FIX: Verify business exists
    const business = await db
      .select({ id: businesses.id, name: businesses.name })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1)
      .then(rows => rows[0])

    if (!business) {
      console.error('[Chatbot API] Business not found:', businessId)
      return NextResponse.json(
        { error: 'Business nicht gefunden' },
        { status: 404 }
      )
    }

    // PHASE 3 FIX: Verify conversationId belongs to businessId
    if (conversationId) {
      const conversation = await db
        .select({ businessId: chatbotConversations.businessId })
        .from(chatbotConversations)
        .where(eq(chatbotConversations.id, conversationId))
        .limit(1)
        .then(rows => rows[0])

      if (conversation && conversation.businessId !== businessId) {
        console.error('[Chatbot API] businessId mismatch:', {
          requestBusinessId: businessId,
          conversationBusinessId: conversation.businessId,
        })
        return NextResponse.json(
          { error: 'businessId stimmt nicht mit Konversation überein' },
          { status: 403 }
        )
      }
    }

    // Detect admin context (optional - doesn't throw if not logged in)
    let adminContext = undefined
    try {
      const memberRole = await getBusinessMemberRole(businessId)
      if (memberRole?.isAdmin) {
        adminContext = memberRole
      }
    } catch (error) {
      // Not logged in or not a member - treat as customer
      console.log('[Chatbot API] User not authenticated or not a member')
    }

    // Process the message
    const result = await handleChatMessage({
      businessId,
      conversationId,
      message: message.trim(),
      channel,
      customerId,
      adminContext,
    })

    return NextResponse.json({
      success: true,
      conversationId: result.conversationId,
      response: result.response,
      metadata: result.metadata,
    })
  } catch (error) {
    console.error('[Chatbot API] Error:', error)

    return NextResponse.json(
      {
        error: 'Chatbot-Fehler',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    )
  }
}
