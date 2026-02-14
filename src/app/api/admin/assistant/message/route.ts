/**
 * Virtual Assistant API
 *
 * POST /api/admin/assistant/message
 *
 * Authenticated endpoint for the internal business assistant.
 * Uses handleChatMessage with isAssistant=true for dedicated prompt, model, and tools.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { handleChatMessage } from '@/modules/chatbot/lib/conversation'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:admin:assistant:message')

export async function POST(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { message, conversationId, attachedFiles } = body as {
      message: string
      conversationId?: string
      attachedFiles?: Array<{
        documentId: string
        versionId: string
        r2Key: string
        filename: string
        contentType: string
        fileSize: number
      }>
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({ error: 'Nachricht darf nicht leer sein' }, { status: 400 })
    }

    const result = await handleChatMessage({
      businessId: authResult.business.id,
      conversationId,
      message: message.trim(),
      channel: 'assistant',
      adminContext: {
        userId: authResult.userId,
        role: 'owner',
        isAdmin: true,
      },
      isAssistant: true,
      attachedFiles,
    })

    return NextResponse.json({
      success: true,
      conversationId: result.conversationId,
      response: result.response,
      metadata: result.metadata,
    })
  } catch (error) {
    log.error('Error:', error)
    return NextResponse.json(
      { error: 'Assistent-Fehler' },
      { status: 500 }
    )
  }
}
