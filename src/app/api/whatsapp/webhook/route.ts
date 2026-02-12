/**
 * WhatsApp Webhook Receiver
 *
 * Receives messages from Twilio, routes by TO phone number (BYOT),
 * processes through chatbot, sends reply.
 *
 * Flow:
 * 1. Parse form data (before validation — need TO number first)
 * 2. Look up business by TO phone number
 * 3. Validate signature with that business's auth token
 * 4. Find or create customer (direct DB, no self-fetch)
 * 5. Owner handoff detection (if enabled)
 * 6. Compliance check (STOP/START keywords)
 * 7. Forward to chatbot
 * 8. Send reply via per-tenant Twilio client
 *
 * POST /api/whatsapp/webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateTwilioWebhook, sendWhatsAppMessage, getTwilioCredentials } from '@/lib/twilio-client'
import { findOrCreateWhatsAppCustomer } from '@/lib/whatsapp-customer'
import { formatE164Phone } from '@/lib/whatsapp-phone-formatter'
import { getOwnerWhatsAppNumber } from '@/lib/whatsapp-owner'
import { isAnyStaffOnline } from '@/lib/staff-online'
import { handleChatMessage } from '@/modules/chatbot/lib/conversation'
import { db } from '@/lib/db'
import { businesses, customers, chatbotConversations, chatbotMessages } from '@/lib/db/schema'
import { eq, and, ne, sql, desc } from 'drizzle-orm'

// STOP/START keywords for WhatsApp compliance (case-insensitive)
const STOP_KEYWORDS = ['stop', 'unsubscribe', 'cancel', 'end', 'quit', 'stopp', 'abmelden']
const START_KEYWORDS = ['start', 'subscribe', 'anmelden']

export async function POST(request: NextRequest) {
  try {
    // 1. PARSE: Extract data from Twilio (before validation — need TO number)
    const formData = await request.formData()
    const params: Record<string, any> = {}
    formData.forEach((value, key) => {
      params[key] = value
    })

    const from = params.From as string           // "whatsapp:+4915123456789"
    const to = params.To as string               // "whatsapp:+14155238886"
    const body = (params.Body as string || '').trim()
    const messageSid = params.MessageSid as string

    console.log('[WhatsApp Webhook] Received:', {
      from,
      to,
      messageSid,
      bodyPreview: body.slice(0, 50),
    })

    // 2. SECURITY: Verify Twilio signature
    const signature = request.headers.get('X-Twilio-Signature') || request.headers.get('x-twilio-signature')

    if (!signature) {
      console.error('[WhatsApp Webhook] Missing Twilio signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 403 })
    }

    // 3. ROUTE: Find business by TO phone number
    const toPhone = formatE164Phone(to)
    let businessRow = await findBusinessByWhatsAppNumber(toPhone)

    // Fallback: try prefix routing for sandbox testing ("SLUG message")
    let message = body
    if (!businessRow) {
      const match = body.match(/^([A-Z]+)\s+(.+)$/i)
      if (match) {
        const slug = match[1].toLowerCase()
        message = match[2]
        businessRow = await db
          .select({ id: businesses.id, slug: businesses.slug, settings: businesses.settings, phone: businesses.phone, name: businesses.name })
          .from(businesses)
          .where(eq(businesses.slug, slug))
          .limit(1)
          .then(rows => rows[0])
      }
    }

    if (!businessRow) {
      console.error('[WhatsApp Webhook] No business found for TO number:', toPhone)
      // Use global credentials for error reply
      await sendWhatsAppMessage({
        to: from,
        body: 'Entschuldigung, diese Nummer ist keinem Unternehmen zugeordnet.',
      })
      return NextResponse.json({ error: 'Business not found' }, { status: 200 })
    }

    const businessId = businessRow.id
    const businessSettings = (businessRow.settings as Record<string, unknown>) || {}

    // 4. VALIDATE SIGNATURE: Use business's auth token
    const creds = await getTwilioCredentials(businessId)
    // Use canonical webhook URL (Vercel proxy mismatch fix)
    const webhookUrl = process.env.TWILIO_WEBHOOK_URL || request.url

    const isValid = validateTwilioWebhook(creds.authToken, signature, webhookUrl, params)

    if (!isValid) {
      // Also try global auth token (sandbox may use global)
      const globalToken = process.env.TWILIO_AUTH_TOKEN || ''
      const isValidGlobal = validateTwilioWebhook(globalToken, signature, webhookUrl, params)

      if (!isValidGlobal) {
        console.error('[WhatsApp Webhook] Invalid Twilio signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    // 5. PHONE NORMALIZATION
    const phoneNumber = formatE164Phone(from)

    // 6. OWNER HANDOFF DETECTION
    const whatsappHandoffEnabled = businessSettings.whatsappHandoffEnabled === true
    const whatsappRoutingMode = (businessSettings.whatsappRoutingMode as string) || 'owner'

    if (whatsappHandoffEnabled) {
      const ownerPhone = await getOwnerWhatsAppNumber(businessId)

      if (ownerPhone) {
        // Check if sender IS the owner
        if (phoneNumber === ownerPhone) {
          const result = await handleOwnerReply({
            businessId,
            ownerPhone,
            senderFrom: from,
            message,
          })
          if (result) return result
          // If no pending conversation found, fall through to normal processing
        } else if (whatsappRoutingMode === 'owner') {
          // Customer message — route to owner handoff
          // First, find or create customer
          const { customerId } = await findOrCreateWhatsAppCustomer(phoneNumber, businessId)

          return await handleOwnerForward({
            businessId,
            businessName: businessRow.name || businessRow.slug,
            customerId,
            customerPhone: phoneNumber,
            customerFrom: from,
            ownerPhone,
            message,
            timeoutSeconds: (businessSettings.ownerHandoffTimeoutSeconds as number) || 120,
          })
        } else if (whatsappRoutingMode === 'live') {
          // Route to live chat queue if staff online, else AI
          const staffOnline = await isAnyStaffOnline(businessId)
          if (staffOnline) {
            const { customerId } = await findOrCreateWhatsAppCustomer(phoneNumber, businessId)

            // Find existing conversation
            const existingConv = await db
              .select({ id: chatbotConversations.id, status: chatbotConversations.status })
              .from(chatbotConversations)
              .where(and(
                eq(chatbotConversations.businessId, businessId),
                eq(chatbotConversations.customerId, customerId),
                eq(chatbotConversations.channel, 'whatsapp'),
                ne(chatbotConversations.status, 'closed'),
              ))
              .orderBy(desc(chatbotConversations.updatedAt))
              .limit(1)
              .then(rows => rows[0])

            if (existingConv && (existingConv.status === 'live_queue' || existingConv.status === 'live_active')) {
              // Already in live mode, save message
              await db.insert(chatbotMessages).values({
                conversationId: existingConv.id,
                role: 'user',
                content: message,
              })
              await db.update(chatbotConversations)
                .set({ updatedAt: new Date() })
                .where(eq(chatbotConversations.id, existingConv.id))

              return NextResponse.json({ success: true, action: 'live_queue_message' })
            }

            // Create new live queue conversation
            const [newConv] = await db.insert(chatbotConversations).values({
              businessId,
              customerId,
              channel: 'whatsapp',
              status: 'live_queue',
              metadata: { liveQueuedAt: new Date().toISOString() },
            }).returning()

            await db.insert(chatbotMessages).values({
              conversationId: newConv.id,
              role: 'user',
              content: message,
            })

            await sendWhatsAppMessage(
              { to: from, body: 'Ihre Nachricht wurde empfangen. Ein Mitarbeiter wird sich in Kürze melden.' },
              businessId
            )

            return NextResponse.json({ success: true, action: 'live_queue_created' })
          }
          // No staff online — fall through to AI
        }
      }
    }

    // 7. COMPLIANCE: Handle STOP/START keywords
    const bodyLower = body.toLowerCase().trim()

    if (STOP_KEYWORDS.includes(bodyLower)) {
      // Update customer opt-out status
      await db
        .update(customers)
        .set({ whatsappOptInStatus: 'OPTED_OUT', whatsappOptOutAt: new Date() })
        .where(eq(customers.phone, phoneNumber))

      // Twilio handles STOP automatically, but we record it
      console.log('[WhatsApp Webhook] Customer opted out:', phoneNumber)
      return NextResponse.json({ success: true, action: 'opted_out' })
    }

    if (START_KEYWORDS.includes(bodyLower)) {
      await db
        .update(customers)
        .set({ whatsappOptInStatus: 'OPTED_IN', whatsappOptInAt: new Date() })
        .where(eq(customers.phone, phoneNumber))

      console.log('[WhatsApp Webhook] Customer opted in:', phoneNumber)

      await sendWhatsAppMessage(
        { to: from, body: 'Willkommen zurück! Sie erhalten wieder Nachrichten von uns.' },
        businessId
      )
      return NextResponse.json({ success: true, action: 'opted_in' })
    }

    // 7b. VOICE MESSAGE: Transcribe audio via Whisper
    const numMedia = parseInt(params.NumMedia as string || '0', 10)
    const mediaContentType = (params.MediaContentType0 as string || '')

    if (numMedia > 0 && mediaContentType.startsWith('audio/')) {
      const mediaUrl = params.MediaUrl0 as string

      if (!mediaUrl) {
        console.error('[WhatsApp Webhook] Voice message with no MediaUrl0')
        await sendWhatsAppMessage(
          { to: from, body: 'Entschuldigung, die Sprachnachricht konnte nicht verarbeitet werden.' },
          businessId
        )
        return NextResponse.json({ error: 'Missing media URL' }, { status: 200 })
      }

      const openaiKey = process.env.OPENAI_API_KEY
      if (!openaiKey) {
        console.error('[WhatsApp Webhook] OPENAI_API_KEY not configured')
        await sendWhatsAppMessage(
          { to: from, body: 'Entschuldigung, Sprachnachrichten werden derzeit nicht unterstützt.' },
          businessId
        )
        return NextResponse.json({ error: 'Transcription not configured' }, { status: 200 })
      }

      try {
        // Download audio from Twilio (requires Basic Auth)
        const authHeader = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64')
        const audioResponse = await fetch(mediaUrl, {
          headers: { Authorization: `Basic ${authHeader}` },
        })

        if (!audioResponse.ok) {
          throw new Error(`Twilio media download failed: ${audioResponse.status}`)
        }

        const audioBuffer = await audioResponse.arrayBuffer()
        const audioSize = audioBuffer.byteLength

        // 10MB size check
        if (audioSize > 10 * 1024 * 1024) {
          await sendWhatsAppMessage(
            { to: from, body: 'Entschuldigung, die Sprachnachricht ist zu groß (max 10MB).' },
            businessId
          )
          return NextResponse.json({ error: 'Audio too large' }, { status: 200 })
        }

        // Determine file extension from content type
        const ext = mediaContentType.includes('ogg') ? 'ogg'
          : mediaContentType.includes('mp4') ? 'mp4'
          : mediaContentType.includes('mpeg') ? 'mp3'
          : mediaContentType.includes('wav') ? 'wav'
          : 'ogg'

        // Send to OpenAI Whisper
        const whisperForm = new FormData()
        whisperForm.append('file', new Blob([audioBuffer], { type: mediaContentType }), `voice.${ext}`)
        whisperForm.append('model', 'whisper-1')
        whisperForm.append('response_format', 'json')

        const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openaiKey}` },
          body: whisperForm,
        })

        if (!whisperResponse.ok) {
          const errData = await whisperResponse.json().catch(() => ({}))
          throw new Error(`Whisper API error ${whisperResponse.status}: ${JSON.stringify(errData)}`)
        }

        const whisperResult = await whisperResponse.json()
        const transcribedText = (whisperResult.text || '').trim()

        if (!transcribedText) {
          await sendWhatsAppMessage(
            { to: from, body: 'Entschuldigung, ich konnte die Sprachnachricht nicht verstehen. Bitte versuchen Sie es erneut oder senden Sie eine Textnachricht.' },
            businessId
          )
          return NextResponse.json({ error: 'Empty transcription' }, { status: 200 })
        }

        console.log('[WhatsApp Webhook] Voice message transcribed:', {
          audioSize,
          textLength: transcribedText.length,
          preview: transcribedText.slice(0, 80),
        })

        // Combine: if Body (caption) exists, prepend it
        message = message ? `${message}\n\n[Sprachnachricht]: ${transcribedText}` : transcribedText

      } catch (transcribeError: unknown) {
        console.error('[WhatsApp Webhook] Transcription failed:', transcribeError instanceof Error ? transcribeError.message : transcribeError)
        await sendWhatsAppMessage(
          { to: from, body: 'Entschuldigung, die Sprachnachricht konnte nicht verarbeitet werden. Bitte senden Sie eine Textnachricht.' },
          businessId
        )
        return NextResponse.json({ error: 'Transcription failed' }, { status: 200 })
      }
    }

    // 8. FIND/CREATE CUSTOMER (direct DB, no self-fetch)
    const { customerId } = await findOrCreateWhatsAppCustomer(phoneNumber, businessId)

    // 8b. FIND EXISTING CONVERSATION for this customer + business (WhatsApp continuity)
    // Without this, every WhatsApp message creates a new conversation and history is lost.
    const existingConversation = await db
      .select({ id: chatbotConversations.id })
      .from(chatbotConversations)
      .where(and(
        eq(chatbotConversations.businessId, businessId),
        eq(chatbotConversations.customerId, customerId),
        eq(chatbotConversations.channel, 'whatsapp'),
        ne(chatbotConversations.status, 'closed'),
      ))
      .orderBy(desc(chatbotConversations.updatedAt))
      .limit(1)
      .then(rows => rows[0])

    const conversationId = existingConversation?.id

    // 9. CHATBOT: Process through chatbot directly (no self-fetch)
    let reply: string
    try {
      const chatbotResult = await handleChatMessage({
        businessId,
        conversationId,
        customerId,
        message,
        channel: 'whatsapp',
        accessContext: { actorType: 'customer', actorId: customerId },
      })
      reply = chatbotResult.response
    } catch (chatbotError) {
      console.error('[WhatsApp Webhook] Chatbot error:', chatbotError)
      await sendWhatsAppMessage(
        { to: from, body: 'Entschuldigung, es gab einen technischen Fehler. Bitte versuchen Sie es später erneut.' },
        businessId
      )
      return NextResponse.json({ error: 'Chatbot error' }, { status: 200 })
    }

    // 10. SEND REPLY via per-tenant Twilio client
    const sendResult = await sendWhatsAppMessage(
      { to: from, body: reply },
      businessId
    )

    if (!sendResult.success) {
      console.error('[WhatsApp Webhook] Failed to send reply:', sendResult.error)
      return NextResponse.json({ error: 'Failed to send reply' }, { status: 200 })
    }

    console.log('[WhatsApp Webhook] Success:', {
      business: businessRow.slug,
      customerId,
      messageSid: sendResult.sid,
    })

    // Always return 200 to Twilio
    return NextResponse.json({ success: true, messageSid: sendResult.sid })

  } catch (error: unknown) {
    console.error('[WhatsApp Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 200 } // Always 200 for Twilio
    )
  }
}

// ============================================
// OWNER HANDOFF: Forward customer message to owner
// ============================================

async function handleOwnerForward(params: {
  businessId: string
  businessName: string
  customerId: string
  customerPhone: string
  customerFrom: string
  ownerPhone: string
  message: string
  timeoutSeconds: number
}): Promise<NextResponse> {
  const { businessId, businessName, customerId, customerPhone, customerFrom, ownerPhone, message, timeoutSeconds } = params

  // Find existing pending conversation for this customer
  const existingConv = await db
    .select({ id: chatbotConversations.id, metadata: chatbotConversations.metadata })
    .from(chatbotConversations)
    .where(and(
      eq(chatbotConversations.businessId, businessId),
      eq(chatbotConversations.customerId, customerId),
      eq(chatbotConversations.channel, 'whatsapp'),
      ne(chatbotConversations.status, 'closed'),
    ))
    .orderBy(desc(chatbotConversations.updatedAt))
    .limit(1)
    .then(rows => rows[0])

  // Check if previous handoff timed out
  if (existingConv) {
    const metadata = (existingConv.metadata as Record<string, unknown>) || {}
    if (metadata.handoffStatus === 'pending_owner' && metadata.ownerNotifiedAt) {
      const notifiedAt = new Date(metadata.ownerNotifiedAt as string).getTime()
      const timeout = ((metadata.ownerTimeoutSeconds as number) || timeoutSeconds) * 1000
      if (Date.now() > notifiedAt + timeout) {
        // Timeout — switch to AI
        console.log('[WhatsApp Owner Handoff] Timeout reached, switching to AI')
        await db.update(chatbotConversations)
          .set({
            status: 'active',
            metadata: { ...metadata, handoffStatus: 'ai_takeover', timeoutAt: new Date().toISOString() },
            updatedAt: new Date(),
          })
          .where(eq(chatbotConversations.id, existingConv.id))

        // Process through AI directly
        try {
          const chatbotResult = await handleChatMessage({
            businessId,
            conversationId: existingConv.id,
            customerId,
            message,
            channel: 'whatsapp',
            accessContext: { actorType: 'customer', actorId: customerId },
          })
          if (chatbotResult.response) {
            await sendWhatsAppMessage(
              { to: customerFrom, body: chatbotResult.response },
              businessId
            )
          }
        } catch (err) {
          console.error('[WhatsApp Owner Handoff] AI takeover failed:', err)
        }

        // Notify owner
        await sendWhatsAppMessage(
          { to: `whatsapp:${ownerPhone}`, body: `Wartezeit abgelaufen. KI-Assistent übernimmt für ${customerPhone}.` },
          businessId
        )

        return NextResponse.json({ success: true, action: 'ai_takeover_timeout' })
      }
    }

    // Existing conversation still pending or active with owner — add message
    if (metadata.handoffStatus === 'pending_owner' || metadata.handoffStatus === 'owner_active') {
      await db.insert(chatbotMessages).values({
        conversationId: existingConv.id,
        role: 'user',
        content: message,
      })
      await db.update(chatbotConversations)
        .set({ updatedAt: new Date() })
        .where(eq(chatbotConversations.id, existingConv.id))

      // Forward to owner
      await sendWhatsAppMessage(
        { to: `whatsapp:${ownerPhone}`, body: `Neue Nachricht von ${customerPhone}:\n\n${message}` },
        businessId
      )

      return NextResponse.json({ success: true, action: 'owner_forward_followup' })
    }
  }

  // Create new conversation for handoff
  const [newConv] = await db.insert(chatbotConversations).values({
    businessId,
    customerId,
    channel: 'whatsapp',
    status: 'live_queue',
    metadata: {
      handoffStatus: 'pending_owner',
      ownerNotifiedAt: new Date().toISOString(),
      customerPhone,
      ownerTimeoutSeconds: timeoutSeconds,
    },
  }).returning()

  // Save user message
  await db.insert(chatbotMessages).values({
    conversationId: newConv.id,
    role: 'user',
    content: message,
  })

  // Forward to owner
  await sendWhatsAppMessage(
    {
      to: `whatsapp:${ownerPhone}`,
      body: `Neue Nachricht von ${customerPhone}:\n\n${message}\n\n---\nAntworten Sie direkt oder senden Sie "KI".`,
    },
    businessId
  )

  // Confirm to customer
  await sendWhatsAppMessage(
    { to: customerFrom, body: 'Ihre Nachricht wurde empfangen. Wir melden uns in Kürze bei Ihnen.' },
    businessId
  )

  console.log('[WhatsApp Owner Handoff] Forwarded to owner:', {
    business: businessId,
    customer: customerPhone,
    conversationId: newConv.id,
  })

  return NextResponse.json({ success: true, action: 'owner_forward_new' })
}

// ============================================
// OWNER HANDOFF: Process owner's reply
// ============================================

async function handleOwnerReply(params: {
  businessId: string
  ownerPhone: string
  senderFrom: string
  message: string
}): Promise<NextResponse | null> {
  const { businessId, message, senderFrom } = params

  // Find most recent pending/active owner handoff conversation
  const pendingConv = await db
    .select({
      id: chatbotConversations.id,
      customerId: chatbotConversations.customerId,
      metadata: chatbotConversations.metadata,
    })
    .from(chatbotConversations)
    .where(and(
      eq(chatbotConversations.businessId, businessId),
      eq(chatbotConversations.channel, 'whatsapp'),
      ne(chatbotConversations.status, 'closed'),
      sql`${chatbotConversations.metadata}->>'handoffStatus' IN ('pending_owner', 'owner_active')`,
    ))
    .orderBy(desc(chatbotConversations.updatedAt))
    .limit(1)
    .then(rows => rows[0])

  if (!pendingConv) {
    // No pending handoff — let it fall through to normal processing
    return null
  }

  const metadata = (pendingConv.metadata as Record<string, unknown>) || {}
  const customerPhone = metadata.customerPhone as string

  if (!customerPhone) {
    console.error('[WhatsApp Owner Reply] No customer phone in metadata')
    return null
  }

  const messageTrimmed = message.trim()
  const isAICommand = /^(ai|ki)$/i.test(messageTrimmed)

  if (isAICommand) {
    // Owner delegates to AI
    console.log('[WhatsApp Owner Reply] Owner requested AI takeover')

    await db.update(chatbotConversations)
      .set({
        status: 'active',
        metadata: { ...metadata, handoffStatus: 'ai_takeover', aiTakeoverAt: new Date().toISOString() },
        updatedAt: new Date(),
      })
      .where(eq(chatbotConversations.id, pendingConv.id))

    // Get the last user message to process through AI
    const lastUserMsg = await db
      .select({ content: chatbotMessages.content })
      .from(chatbotMessages)
      .where(and(
        eq(chatbotMessages.conversationId, pendingConv.id),
        eq(chatbotMessages.role, 'user'),
      ))
      .orderBy(desc(chatbotMessages.createdAt))
      .limit(1)
      .then(rows => rows[0])

    if (lastUserMsg) {
      // Process through AI directly
      try {
        const chatbotResult = await handleChatMessage({
          businessId,
          conversationId: pendingConv.id,
          customerId: pendingConv.customerId || undefined,
          message: lastUserMsg.content,
          channel: 'whatsapp',
          accessContext: { actorType: 'customer', actorId: pendingConv.customerId || undefined },
        })
        if (chatbotResult.response) {
          await sendWhatsAppMessage(
            { to: `whatsapp:${customerPhone}`, body: chatbotResult.response },
            businessId
          )
        }
      } catch (err) {
        console.error('[WhatsApp Owner Reply] AI takeover failed:', err)
      }
    }

    // Confirm to owner
    await sendWhatsAppMessage(
      { to: senderFrom, body: 'KI-Assistent übernimmt.' },
      businessId
    )

    return NextResponse.json({ success: true, action: 'ai_takeover' })
  }

  // Owner replies with content — relay to customer
  console.log('[WhatsApp Owner Reply] Relaying owner message to customer')

  // Save as staff message
  await db.insert(chatbotMessages).values({
    conversationId: pendingConv.id,
    role: 'staff',
    content: messageTrimmed,
    metadata: { staffName: 'Inhaber', viaWhatsApp: true },
  })

  // Update conversation status
  await db.update(chatbotConversations)
    .set({
      status: 'live_active',
      metadata: { ...metadata, handoffStatus: 'owner_active' },
      updatedAt: new Date(),
    })
    .where(eq(chatbotConversations.id, pendingConv.id))

  // Relay to customer
  await sendWhatsAppMessage(
    { to: `whatsapp:${customerPhone}`, body: messageTrimmed },
    businessId
  )

  return NextResponse.json({ success: true, action: 'owner_reply' })
}

// ============================================
// HELPER: Look up business by WhatsApp phone number
// ============================================

async function findBusinessByWhatsAppNumber(phone: string) {
  const results = await db
    .select({
      id: businesses.id,
      slug: businesses.slug,
      settings: businesses.settings,
      phone: businesses.phone,
      name: businesses.name,
    })
    .from(businesses)
    .where(sql`${businesses.settings}->>'twilioWhatsappNumber' = ${phone}`)
    .limit(1)

  return results[0] || null
}
