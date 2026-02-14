/**
 * Twilio Voice Webhook — POST /api/voice/incoming
 *
 * Called by Twilio when an incoming phone call arrives.
 * Returns TwiML XML that:
 * 1. Plays a brief German greeting
 * 2. Opens a Media Stream WebSocket to the relay server
 *
 * The relay server handles the actual AI conversation via OpenAI Realtime.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:voice:incoming')

const VOICE_RELAY_URL = process.env.VOICE_RELAY_URL || 'wss://localhost:3006/media'

/**
 * Look up business by the Twilio phone number that was called.
 */
async function findBusinessByTwilioNumber(calledNumber: string) {
  const normalized = calledNumber.replace(/\s+/g, '')
  const result = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      settings: businesses.settings,
    })
    .from(businesses)
    .where(eq(businesses.twilioPhoneNumber, normalized))
    .limit(1)
    .then((rows) => rows[0])

  return result
}

export async function POST(request: NextRequest) {
  try {
    // Twilio sends form-encoded POST data
    const formData = await request.formData()
    const calledNumber = formData.get('Called') as string | null
    const callerNumber = formData.get('From') as string | null
    const callSid = formData.get('CallSid') as string | null

    log.info('Incoming call:', {
      called: calledNumber,
      from: callerNumber,
      callSid,
    })

    // Look up business by the number that was called
    let businessId: string | null = null
    let businessName = 'Hebelki'

    if (calledNumber) {
      const business = await findBusinessByTwilioNumber(calledNumber)
      if (business) {
        businessId = business.id
        businessName = business.name

        // Check if voice is enabled for this business
        const settings = business.settings as { voiceEnabled?: boolean } | null
        if (settings && settings.voiceEnabled === false) {
          // Voice disabled — reject the call
          const rejectTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="de-DE" voice="Polly.Vicki">Der Sprachassistent ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns über unsere Website.</Say>
  <Hangup/>
</Response>`

          return new NextResponse(rejectTwiml, {
            status: 200,
            headers: { 'Content-Type': 'text/xml' },
          })
        }
      }
    }

    if (!businessId) {
      log.warn('No business found for number:', calledNumber)
      // Fallback: reject with a message
      const notFoundTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="de-DE" voice="Polly.Vicki">Diese Nummer ist keinem Unternehmen zugeordnet. Bitte versuchen Sie es später erneut.</Say>
  <Hangup/>
</Response>`

      return new NextResponse(notFoundTwiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Build TwiML response:
    // 1. Brief greeting (while relay server connects to OpenAI)
    // 2. Open Media Stream WebSocket to relay server
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="de-DE" voice="Polly.Vicki">Willkommen bei ${escapeXml(businessName)}. Einen Moment bitte, ich verbinde Sie mit unserem Assistenten.</Say>
  <Connect>
    <Stream url="${escapeXml(VOICE_RELAY_URL)}">
      <Parameter name="businessId" value="${escapeXml(businessId)}" />
      <Parameter name="calledNumber" value="${escapeXml(calledNumber || '')}" />
      <Parameter name="callerNumber" value="${escapeXml(callerNumber || '')}" />
    </Stream>
  </Connect>
</Response>`

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    log.error('Error:', error)

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="de-DE" voice="Polly.Vicki">Es ist ein technischer Fehler aufgetreten. Bitte versuchen Sie es später erneut.</Say>
  <Hangup/>
</Response>`

    return new NextResponse(errorTwiml, {
      status: 200, // Always 200 for TwiML — Twilio needs valid XML
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}

/** Escape special characters for safe XML embedding */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
