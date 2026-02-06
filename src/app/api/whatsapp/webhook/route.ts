/**
 * WhatsApp Webhook Receiver
 *
 * Receives messages from Twilio, processes through chatbot, sends reply
 *
 * POST /api/whatsapp/webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateTwilioWebhook, sendWhatsAppMessage } from '@/lib/twilio-client'
import { formatE164Phone } from '@/lib/whatsapp-phone-formatter'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    // 1. SECURITY: Verify Twilio signature
    const signature = request.headers.get('X-Twilio-Signature') || request.headers.get('x-twilio-signature')

    if (!signature) {
      console.error('[WhatsApp Webhook] Missing Twilio signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 403 })
    }

    // Get full URL for signature verification
    const url = request.url

    // Parse FormData (Twilio sends application/x-www-form-urlencoded)
    const formData = await request.formData()
    const params: Record<string, any> = {}
    formData.forEach((value, key) => {
      params[key] = value
    })

    // Verify signature
    const isValid = validateTwilioWebhook(
      process.env.TWILIO_AUTH_TOKEN!,
      signature,
      url,
      params
    )

    if (!isValid) {
      console.error('[WhatsApp Webhook] Invalid Twilio signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    // 2. PARSE: Extract data from Twilio webhook
    const from = params.From as string           // "whatsapp:+5926964488"
    const to = params.To as string               // "whatsapp:+14155238886"
    const body = params.Body as string           // User message
    const messageSid = params.MessageSid as string

    console.log('[WhatsApp Webhook] Received message:', {
      from,
      to,
      messageSid,
      bodyPreview: body.slice(0, 50)
    })

    // 3. PHONE NORMALIZATION: Extract phone number
    const phoneNumber = formatE164Phone(from)  // Remove "whatsapp:" and normalize

    // 4. BUSINESS ROUTING: Extract business slug from message
    // Format: "DEMO Hello, I want to book" → business=demo, message="Hello, I want to book"
    // Or default to "demo" business for testing
    let businessSlug = 'demo'
    let message = body

    const match = body.match(/^([A-Z]+)\s+(.+)$/i)
    if (match) {
      businessSlug = match[1].toLowerCase()
      message = match[2]
    }

    // 5. FIND CUSTOMER: Check if customer exists or create new one
    const customerResponse = await fetch(
      `${request.nextUrl.origin}/api/whatsapp/customer?phone=${encodeURIComponent(phoneNumber)}&business=${businessSlug}`,
      { method: 'GET' }
    )

    let customerId: string
    let businessId: string

    if (customerResponse.ok) {
      const customerData = await customerResponse.json()
      customerId = customerData.customerId
      businessId = customerData.businessId
    } else {
      // Customer not found, create new one
      const business = await db
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.slug, businessSlug))
        .limit(1)
        .then(rows => rows[0])

      if (!business) {
        console.error(`[WhatsApp Webhook] Business not found: ${businessSlug}`)

        // Send user-friendly error message
        await sendWhatsAppMessage({
          to: from,
          body: `Entschuldigung, das Unternehmen "${businessSlug}" wurde nicht gefunden. Bitte überprüfen Sie Ihre Nachricht.`
        })

        return NextResponse.json({ error: 'Business not found' }, { status: 404 })
      }

      const createCustomerResponse = await fetch(
        `${request.nextUrl.origin}/api/whatsapp/customer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phoneNumber,
            businessId: business.id,
            name: 'WhatsApp Customer'
          })
        }
      )

      if (!createCustomerResponse.ok) {
        console.error('[WhatsApp Webhook] Failed to create customer')
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
      }

      const newCustomer = await createCustomerResponse.json()
      customerId = newCustomer.customerId
      businessId = newCustomer.businessId
    }

    // 6. CHATBOT: Send message to chatbot API
    const chatbotResponse = await fetch(
      `${request.nextUrl.origin}/api/chatbot/message`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          customerId,
          message,
          channel: 'whatsapp'
        })
      }
    )

    if (!chatbotResponse.ok) {
      console.error('[WhatsApp Webhook] Chatbot API error:', await chatbotResponse.text())

      // Send error message to customer
      await sendWhatsAppMessage({
        to: from,
        body: 'Entschuldigung, es gab einen technischen Fehler. Bitte versuchen Sie es später erneut.'
      })

      return NextResponse.json({ error: 'Chatbot error' }, { status: 500 })
    }

    const chatbotData = await chatbotResponse.json()
    const reply = chatbotData.response

    // 7. SEND REPLY: Send chatbot response back via WhatsApp
    const sendResult = await sendWhatsAppMessage({
      to: from,  // Reply to sender
      body: reply
    })

    if (!sendResult.success) {
      console.error('[WhatsApp Webhook] Failed to send reply:', sendResult.error)
      return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 })
    }

    console.log('[WhatsApp Webhook] Success:', {
      customerId,
      messageSid: sendResult.sid
    })

    // 8. RESPOND: Send 200 OK to Twilio (required to prevent retries)
    return NextResponse.json({ success: true, messageSid: sendResult.sid })

  } catch (error: any) {
    console.error('[WhatsApp Webhook] Error:', error)

    // Always return 200 to Twilio to prevent retries on our errors
    return NextResponse.json(
      { error: 'Internal error', details: error.message },
      { status: 200 }
    )
  }
}
