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
 * 5. Compliance check (STOP/START keywords)
 * 6. Forward to chatbot
 * 7. Send reply via per-tenant Twilio client
 *
 * POST /api/whatsapp/webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateTwilioWebhook, sendWhatsAppMessage, getTwilioCredentials } from '@/lib/twilio-client'
import { findOrCreateWhatsAppCustomer } from '@/lib/whatsapp-customer'
import { formatE164Phone } from '@/lib/whatsapp-phone-formatter'
import { db } from '@/lib/db'
import { businesses, customers } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

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
          .select({ id: businesses.id, slug: businesses.slug, settings: businesses.settings })
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

    // 6. COMPLIANCE: Handle STOP/START keywords
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

    // 6b. VOICE MESSAGE: Transcribe audio via Whisper
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

      } catch (transcribeError: any) {
        console.error('[WhatsApp Webhook] Transcription failed:', transcribeError.message)
        await sendWhatsAppMessage(
          { to: from, body: 'Entschuldigung, die Sprachnachricht konnte nicht verarbeitet werden. Bitte senden Sie eine Textnachricht.' },
          businessId
        )
        return NextResponse.json({ error: 'Transcription failed' }, { status: 200 })
      }
    }

    // 7. FIND/CREATE CUSTOMER (direct DB, no self-fetch)
    const { customerId } = await findOrCreateWhatsAppCustomer(phoneNumber, businessId)

    // 8. CHATBOT: Forward to chatbot API
    const chatbotUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.hebelki.de'}/api/chatbot/message`

    const chatbotResponse = await fetch(chatbotUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        customerId,
        message,
        channel: 'whatsapp',
      }),
    })

    if (!chatbotResponse.ok) {
      console.error('[WhatsApp Webhook] Chatbot error:', await chatbotResponse.text())
      await sendWhatsAppMessage(
        { to: from, body: 'Entschuldigung, es gab einen technischen Fehler. Bitte versuchen Sie es später erneut.' },
        businessId
      )
      return NextResponse.json({ error: 'Chatbot error' }, { status: 200 })
    }

    const chatbotData = await chatbotResponse.json()
    const reply = chatbotData.response

    // 9. SEND REPLY via per-tenant Twilio client
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

  } catch (error: any) {
    console.error('[WhatsApp Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal error', details: error.message },
      { status: 200 } // Always 200 for Twilio
    )
  }
}

/**
 * Look up business by WhatsApp phone number stored in settings JSONB.
 */
async function findBusinessByWhatsAppNumber(phone: string) {
  const results = await db
    .select({
      id: businesses.id,
      slug: businesses.slug,
      settings: businesses.settings,
    })
    .from(businesses)
    .where(sql`${businesses.settings}->>'twilioWhatsappNumber' = ${phone}`)
    .limit(1)

  return results[0] || null
}
