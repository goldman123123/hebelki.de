/**
 * Chatbot Conversations API
 *
 * GET /api/chatbot/conversations
 *
 * Lists conversations for a business.
 */

import { NextRequest, NextResponse } from 'next/server'
import { listConversations } from '@/modules/chatbot/lib/conversation'
import { requireBusinessAccess } from '@/lib/auth-helpers'

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

    // Verify authenticated user has access to this business
    await requireBusinessAccess(businessId)

    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const conversations = await listConversations(businessId, limit)

    return NextResponse.json({
      success: true,
      conversations,
    })
  } catch (error) {
    console.error('[Chatbot API] Error:', error)

    const message = error instanceof Error ? error.message : ''
    if (message.includes('Unauthorized') || message.includes('Access denied')) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Konversationen' },
      { status: 500 }
    )
  }
}
