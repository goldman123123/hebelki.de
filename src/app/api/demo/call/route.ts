/**
 * Demo Call API
 *
 * POST /api/demo/call
 *
 * Initiates a Twilio outbound voice call to a prospect for demo purposes.
 */

import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { rateLimit } from '@/lib/rate-limit'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:demo:call')

// Rate limit: 3 calls per IP per hour
const demoCallLimiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
})

// E.164 phone validation: starts with +, 8-15 digits
function isValidE164(phone: string): boolean {
  return /^\+\d{8,15}$/.test(phone)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessSlug, phone, mode } = body

    // Validate required fields
    if (!businessSlug || typeof businessSlug !== 'string') {
      return NextResponse.json(
        { error: 'businessSlug is required' },
        { status: 400 }
      )
    }

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { error: 'phone is required' },
        { status: 400 }
      )
    }

    if (!isValidE164(phone)) {
      return NextResponse.json(
        { error: 'Phone must be in E.164 format (e.g. +491234567890)' },
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
      await demoCallLimiter.check(ip, 3)
    } catch {
      return NextResponse.json(
        { error: 'Too many demo calls. Please try again later.' },
        { status: 429 }
      )
    }

    // Look up business by slug
    const business = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        twilioPhoneNumber: businesses.twilioPhoneNumber,
        settings: businesses.settings,
      })
      .from(businesses)
      .where(eq(businesses.slug, businessSlug))
      .limit(1)
      .then(rows => rows[0])

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Verify business is a demo business
    const settings = business.settings as Record<string, unknown> | null
    if (!settings?.isDemo) {
      return NextResponse.json(
        { error: 'This business is not available for demo' },
        { status: 403 }
      )
    }

    const callMode = mode || 'customer'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.hebelki.de'
    const twimlUrl = `${baseUrl}/api/demo/call/twiml?businessId=${business.id}&mode=${callMode}`

    // Initiate Twilio call
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )

    const call = await client.calls.create({
      to: phone,
      from: business.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER!,
      url: twimlUrl,
    })

    log.info(`Demo call initiated: ${call.sid} to ${phone} for ${business.slug} (${callMode})`)

    return NextResponse.json({
      success: true,
      callSid: call.sid,
    })
  } catch (error) {
    log.error('Demo call error:', error)

    return NextResponse.json(
      { error: 'Failed to initiate demo call' },
      { status: 500 }
    )
  }
}
