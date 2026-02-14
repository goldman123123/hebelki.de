/**
 * Demo TwiML API
 *
 * POST /api/demo/call/twiml
 *
 * Returns TwiML XML for Twilio to execute during a demo call.
 * Connects the call to the voice relay server with demo parameters.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:demo:call:twiml')

// Escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const mode = searchParams.get('mode') || 'customer'

    if (!businessId) {
      log.error('Missing businessId in TwiML request')
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="de-DE" voice="Polly.Vicki">Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.</Say>
</Response>`
      return new NextResponse(errorTwiml, {
        headers: { 'Content-Type': 'application/xml' },
      })
    }

    // Look up business name
    const business = await db
      .select({ name: businesses.name })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1)
      .then(rows => rows[0])

    const businessName = business?.name || 'Hebelki Demo'
    const voiceRelayHost = process.env.VOICE_RELAY_HOST || 'voice.hebelki.de'

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="de-DE" voice="Polly.Vicki">Willkommen bei ${escapeXml(businessName)}. Einen Moment bitte...</Say>
  <Connect>
    <Stream url="wss://${escapeXml(voiceRelayHost)}/twilio">
      <Parameter name="businessId" value="${escapeXml(businessId)}" />
      <Parameter name="demoMode" value="${escapeXml(mode)}" />
    </Stream>
  </Connect>
</Response>`

    log.info(`TwiML generated for business ${businessId} (mode: ${mode})`)

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'application/xml' },
    })
  } catch (error) {
    log.error('TwiML generation error:', error)

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="de-DE" voice="Polly.Vicki">Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.</Say>
</Response>`

    return new NextResponse(errorTwiml, {
      headers: { 'Content-Type': 'application/xml' },
    })
  }
}
