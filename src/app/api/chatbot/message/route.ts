/**
 * Chatbot Message API
 *
 * POST /api/chatbot/message
 *
 * Handles incoming chat messages and returns AI responses.
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleChatMessage } from '@/modules/chatbot/lib/conversation'
import { db } from '@/lib/db'
import { businesses, chatbotConversations, chatbotMessages, businessMembers, customers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import {
  detectOptOutKeyword,
  detectOptInKeyword,
  handleOptOut,
  handleOptIn,
  handleImplicitOptIn,
  verifyOptInStatus,
  getOptOutConfirmation,
  getOptInConfirmation,
} from '@/lib/whatsapp-compliance'
import { chatbotLimiter } from '@/lib/rate-limit'
import { sql } from 'drizzle-orm'

// ============================================
// HELPER FUNCTIONS: Contact Info Validation
// ============================================

// Email validation regex
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

// Phone validation (basic - accepts German and international formats)
function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  return /^\+?[0-9]{8,15}$/.test(cleaned)
}

// Extract contact info from message
function extractContactInfo(message: string): { email?: string; phone?: string } {
  const trimmed = message.trim()

  if (isValidEmail(trimmed)) {
    return { email: trimmed.toLowerCase() }
  }

  if (isValidPhone(trimmed)) {
    return { phone: trimmed }
  }

  return {}
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { businessId, conversationId, message, channel, customerId } = body

    // ============================================
    // RATE LIMITING: Prevent abuse and DoS attacks
    // ============================================
    // For WhatsApp, rate limit by customer ID (more accurate)
    // For web, rate limit by IP address
    const identifier = channel === 'whatsapp'
      ? customerId || 'unknown-whatsapp'
      : request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown'

    try {
      await chatbotLimiter.check(identifier, 10) // 10 messages per minute
    } catch (error) {
      console.warn(`[CHATBOT-RATE-LIMIT] ${identifier} exceeded rate limit`)
      return NextResponse.json(
        {
          error: channel === 'whatsapp'
            ? 'Zu viele Nachrichten. Bitte warten Sie einen Moment.'
            : 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
          retryAfter: 60
        },
        { status: 429 }
      )
    }

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
      .select({ id: businesses.id, name: businesses.name, email: businesses.email, settings: businesses.settings })
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

    const businessSettings = business.settings as Record<string, unknown> | null
    const liveChatEnabled = (businessSettings?.liveChatEnabled as boolean) || false

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

    // ============================================
    // LIVE CHAT / ESCALATION INTERCEPTION
    // Must run BEFORE AI literacy check — no AI involved
    // ============================================
    if (conversationId) {
      // Fetch conversation to check metadata and status
      const conversation = await db.select()
        .from(chatbotConversations)
        .where(eq(chatbotConversations.id, conversationId))
        .limit(1)
        .then(rows => rows[0])

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      const metadata = (conversation.metadata as Record<string, unknown>) || {}

      // If conversation is in live_queue or live_active, save message without AI
      if (conversation.status === 'live_queue' || conversation.status === 'live_active') {
        // Save user message to DB directly
        await db.insert(chatbotMessages).values({
          conversationId,
          role: 'user',
          content: message.trim(),
        })

        await db.update(chatbotConversations)
          .set({ updatedAt: new Date() })
          .where(eq(chatbotConversations.id, conversationId))

        return NextResponse.json({
          success: true,
          conversationId,
          response: null, // No AI response — staff will reply
          metadata: { liveChatMode: true },
        })
      }

      // Check if awaiting contact info (legacy escalation flow — only when live chat is OFF)
      if (metadata.awaitingContactInfo && !liveChatEnabled) {
        const contactInfo = extractContactInfo(message)

        if (!contactInfo.email && !contactInfo.phone) {
          // Invalid contact info provided
          return NextResponse.json({
            success: true,
            conversationId,
            response: "Bitte geben Sie eine gültige E-Mail-Adresse oder Telefonnummer an.",
          })
        }

        // Create or update customer record
        let customerId = conversation.customerId

        if (!customerId) {
          // Create new customer
          const [newCustomer] = await db.insert(customers).values({
            businessId: conversation.businessId,
            email: contactInfo.email || null,
            phone: contactInfo.phone || null,
            name: contactInfo.email ? contactInfo.email.split('@')[0] : 'Kunde',
            source: channel === 'whatsapp' ? 'whatsapp' : 'chatbot_escalation',
          }).returning()

          customerId = newCustomer.id
        } else {
          // Update existing customer
          await db.update(customers)
            .set({
              email: contactInfo.email || sql`email`,
              phone: contactInfo.phone || sql`phone`,
            })
            .where(eq(customers.id, customerId))
        }

        // Update conversation: link customer, mark as escalated, clear flag
        await db.update(chatbotConversations)
          .set({
            customerId,
            status: 'escalated',
            metadata: {
              ...metadata,
              awaitingContactInfo: false,
              contactInfoProvidedAt: new Date().toISOString(),
              contactInfo,
            },
            updatedAt: new Date(),
          })
          .where(eq(chatbotConversations.id, conversationId))

        console.log(`[ESCALATION] Contact info collected for conversation ${conversationId}`)

        // Return confirmation (skip AI processing)
        return NextResponse.json({
          success: true,
          conversationId,
          response: "Vielen Dank! Ein Mitarbeiter wird sich in Kürze bei Ihnen melden.",
          metadata: { escalated: true },
        })
      }
    }

    // ============================================
    // LIVE-FIRST MODE: Route to queue instead of AI
    // Must run BEFORE AI literacy check — no AI involved
    // ============================================
    const chatDefaultMode = (businessSettings?.chatDefaultMode as string) || 'ai'

    if (liveChatEnabled && chatDefaultMode === 'live' && !conversationId) {
      // First message in live-first mode: check if staff is online before queuing
      const { isAnyStaffOnline } = await import('@/lib/staff-online')
      const staffOnline = await isAnyStaffOnline(businessId)

      if (staffOnline) {
        // Staff is online — queue for live chat
        const [newConv] = await db.insert(chatbotConversations).values({
          businessId,
          channel: channel || 'web',
          status: 'live_queue',
          metadata: {
            liveQueuedAt: new Date().toISOString(),
          },
        }).returning()

        await db.insert(chatbotMessages).values({
          conversationId: newConv.id,
          role: 'user',
          content: message.trim(),
        })

        // Emit event to notify owner
        if (business.email) {
          const { emitEventStandalone } = await import('@/modules/core/events')
          await emitEventStandalone(businessId, 'chat.live_requested', {
            conversationId: newConv.id,
            businessName: business.name,
            ownerEmail: business.email,
            firstMessage: message.trim(),
            dashboardUrl: `https://www.hebelki.de/support-chat`,
          })
        }

        return NextResponse.json({
          success: true,
          conversationId: newConv.id,
          response: "Ihre Nachricht wurde empfangen. Ein Mitarbeiter wird sich in Kürze melden.",
          metadata: { liveChatMode: true },
        })
      }
      // No staff online — fall through to AI processing below
    }

    // ============================================
    // EU AI Act Compliance: Only needed for AI processing
    // ============================================
    const AI_LITERACY_VERSION = '1.0'
    const aiLiteracyAcknowledged = businessSettings?.aiLiteracyAcknowledgedAt &&
      businessSettings?.aiLiteracyVersion === AI_LITERACY_VERSION

    if (!aiLiteracyAcknowledged) {
      console.warn('[Chatbot API] AI literacy not acknowledged for business:', businessId)
      return NextResponse.json({
        success: true,
        conversationId: conversationId || null,
        response: 'Der KI-Assistent ist derzeit nicht verfügbar. Bitte kontaktieren Sie uns direkt per Telefon oder E-Mail.',
        metadata: { aiDisabled: true },
      })
    }

    // Public chatbot is customer-only (admin features moved to /tools/assistant)
    const adminContext = undefined

    // ============================================
    // WHATSAPP COMPLIANCE: STOP/START DETECTION
    // CRITICAL: Must be processed BEFORE AI
    // ============================================
    if (channel === 'whatsapp' && customerId) {
      const trimmedMessage = message.trim()

      // Handle STOP keywords (opt-out)
      if (detectOptOutKeyword(trimmedMessage)) {
        await handleOptOut(customerId, trimmedMessage)
        console.log('[WHATSAPP-COMPLIANCE] Opt-out processed for customer:', customerId)

        return NextResponse.json({
          success: true,
          conversationId,
          response: getOptOutConfirmation(),
          metadata: { optOut: true },
        })
      }

      // Handle START keywords (opt-in)
      if (detectOptInKeyword(trimmedMessage)) {
        await handleOptIn(customerId, trimmedMessage)
        console.log('[WHATSAPP-COMPLIANCE] Opt-in processed for customer:', customerId)

        return NextResponse.json({
          success: true,
          conversationId,
          response: getOptInConfirmation(),
          metadata: { optIn: true },
        })
      }

      // Verify customer has opted in before processing message
      const hasOptedIn = await verifyOptInStatus(customerId)

      if (!hasOptedIn) {
        // First message - grant implicit opt-in
        await handleImplicitOptIn(customerId, trimmedMessage)
        console.log('[WHATSAPP-COMPLIANCE] Implicit opt-in granted for customer:', customerId)
      }
    }

    // ============================================
    // Continue with normal AI processing
    // ============================================

    // Public chatbot always uses customer access context
    const accessContext = {
      actorType: 'customer' as const,
      actorId: customerId,
    }

    // Process the message
    const result = await handleChatMessage({
      businessId,
      conversationId,
      message: message.trim(),
      channel,
      customerId,
      adminContext,
      accessContext,
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
        message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
      },
      { status: 500 }
    )
  }
}
