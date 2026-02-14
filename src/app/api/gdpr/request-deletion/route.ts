/**
 * POST /api/gdpr/request-deletion
 *
 * Public endpoint. Takes { email, businessId }.
 * Finds customer, creates deletion request with random token,
 * sends confirmation email with link. Token expires in 7 days.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { customers, businesses, deletionRequests } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { sendEmail } from '@/lib/email'
import { deletionRequestEmail } from '@/lib/email-templates'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:gdpr:request-deletion')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, businessId } = body

    if (!email || !businessId) {
      return NextResponse.json(
        { error: 'E-Mail und Business-ID sind erforderlich' },
        { status: 400 }
      )
    }

    // Find the business
    const [business] = await db
      .select({ id: businesses.id, name: businesses.name })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1)

    if (!business) {
      // Don't reveal whether business exists
      return NextResponse.json({
        success: true,
        message: 'Falls ein Konto mit dieser E-Mail existiert, erhalten Sie eine Bestätigungs-E-Mail.',
      })
    }

    // Find the customer
    const [customer] = await db
      .select({ id: customers.id, email: customers.email, name: customers.name })
      .from(customers)
      .where(
        and(
          eq(customers.businessId, businessId),
          eq(customers.email, email.toLowerCase().trim())
        )
      )
      .limit(1)

    if (!customer) {
      // Don't reveal whether customer exists (privacy)
      return NextResponse.json({
        success: true,
        message: 'Falls ein Konto mit dieser E-Mail existiert, erhalten Sie eine Bestätigungs-E-Mail.',
      })
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create deletion request
    await db.insert(deletionRequests).values({
      businessId,
      customerId: customer.id,
      customerEmail: email.toLowerCase().trim(),
      token,
      status: 'pending',
      expiresAt,
    })

    // Build confirmation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hebelki.de'
    const confirmUrl = `${baseUrl}/gdpr/confirm/${token}`
    const exportUrl = `${baseUrl}/api/gdpr/export?token=${token}`

    // Send confirmation email
    const emailData = deletionRequestEmail({
      customerName: customer.name || undefined,
      businessName: business.name,
      confirmUrl,
      exportUrl,
      expiresAt,
    })

    await sendEmail({
      to: email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    })

    return NextResponse.json({
      success: true,
      message: 'Falls ein Konto mit dieser E-Mail existiert, erhalten Sie eine Bestätigungs-E-Mail.',
    })
  } catch (error) {
    log.error('[POST /api/gdpr/request-deletion] Error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    )
  }
}
