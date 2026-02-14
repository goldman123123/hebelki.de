/**
 * Demo Message API
 *
 * POST /api/demo/message
 *
 * Handles chat messages for the demo page, supporting both
 * customer and assistant modes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleChatMessage } from '@/modules/chatbot/lib/conversation'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { rateLimit } from '@/lib/rate-limit'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:demo:message')

// Rate limit: 10 messages per IP per minute
const demoMessageLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 2000,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, conversationId, content, mode } = body

    // Validate required fields
    if (!businessId || typeof businessId !== 'string') {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      )
    }

    if (mode && mode !== 'customer' && mode !== 'assistant') {
      return NextResponse.json(
        { error: 'mode must be "customer" or "assistant"' },
        { status: 400 }
      )
    }

    // Rate limit by IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'

    try {
      await demoMessageLimiter.check(ip, 10)
    } catch {
      return NextResponse.json(
        { error: 'Too many messages. Please wait a moment.' },
        { status: 429 }
      )
    }

    // Verify business exists and is a demo business
    const business = await db
      .select({
        id: businesses.id,
        settings: businesses.settings,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1)
      .then(rows => rows[0])

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const settings = business.settings as Record<string, unknown> | null
    if (!settings?.isDemo) {
      return NextResponse.json(
        { error: 'This business is not available for demo' },
        { status: 403 }
      )
    }

    const chatMode = mode || 'customer'

    // Call handleChatMessage with appropriate parameters
    const result = await handleChatMessage({
      businessId,
      conversationId,
      message: content.trim(),
      channel: 'web',
      ...(chatMode === 'assistant'
        ? {
            isAssistant: true,
            accessContext: { actorType: 'owner' as const },
          }
        : {
            accessContext: { actorType: 'customer' as const },
          }),
    })

    log.info(`Demo message processed (${chatMode}): ${result.conversationId}`)

    return NextResponse.json({
      success: true,
      conversationId: result.conversationId,
      response: result.response,
      metadata: result.metadata,
    })
  } catch (error) {
    log.error('Demo message error:', error)

    return NextResponse.json(
      {
        error: 'Failed to process demo message',
        message: 'An error occurred. Please try again.',
      },
      { status: 500 }
    )
  }
}
