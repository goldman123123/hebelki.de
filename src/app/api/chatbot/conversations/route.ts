/**
 * Chatbot Conversations API
 *
 * GET /api/chatbot/conversations
 *
 * Lists conversations for a business.
 */

import { NextRequest, NextResponse } from 'next/server'
import { listConversations } from '@/modules/chatbot/lib/conversation'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId ist erforderlich' },
        { status: 400 }
      )
    }

    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const conversations = await listConversations(businessId, limit)

    return NextResponse.json({
      success: true,
      conversations,
    })
  } catch (error) {
    console.error('[Chatbot API] Error:', error)

    return NextResponse.json(
      {
        error: 'Fehler beim Abrufen der Konversationen',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    )
  }
}
