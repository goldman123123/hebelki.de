import { NextRequest, NextResponse } from 'next/server'
import { getBookingByToken, updateBookingStatus } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { bookingActions } from '@/lib/db/schema'
import { emitEventStandalone } from '@/modules/core/events'
import { processEvents } from '@/modules/core/events/processor'
import { bookingLimiter } from '@/lib/rate-limit'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:manage:token:cancel')

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Rate limiting: 5 per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') || 'unknown'
    try {
      await bookingLimiter.check(`manage-cancel:${ip}`, 5)
    } catch {
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' },
        { status: 429 }
      )
    }

    const { token } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(token)) {
      return NextResponse.json({ error: 'Ungültiger Token' }, { status: 400 })
    }

    const result = await getBookingByToken(token)
    if (!result || !result.booking) {
      return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 })
    }

    const { booking, service, staffMember, customer, business } = result

    // Check booking is active
    const activeStatuses = ['unconfirmed', 'pending', 'confirmed']
    if (!activeStatuses.includes(booking.status || '')) {
      return NextResponse.json(
        { error: 'Diese Buchung kann nicht mehr storniert werden.' },
        { status: 400 }
      )
    }

    // Check booking is in the future
    if (booking.startsAt < new Date()) {
      return NextResponse.json(
        { error: 'Vergangene Buchungen können nicht storniert werden.' },
        { status: 400 }
      )
    }

    // Parse optional reason
    let reason: string | undefined
    try {
      const body = await request.json()
      reason = body.reason
    } catch {
      // No body or invalid JSON — that's fine, reason is optional
    }

    // Cancel the booking
    await updateBookingStatus(booking.id, booking.businessId, 'cancelled', {
      cancelledBy: 'customer',
      cancellationReason: reason,
    })

    // Insert audit log
    await db.insert(bookingActions).values({
      bookingId: booking.id,
      action: 'cancelled',
      actorType: 'customer',
      metadata: {
        reason,
        cancelledVia: 'manage_page',
      },
    })

    // Emit cancellation event (sends email)
    if (customer?.email) {
      await emitEventStandalone(booking.businessId, 'booking.cancelled', {
        bookingId: booking.id,
        customerEmail: customer.email,
        customerName: customer.name || 'Kunde',
        serviceName: service?.name || 'Service',
        businessName: business?.name || 'Business',
        staffName: staffMember?.name,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        reason,
        cancelledBy: 'customer',
      })

      // Process events immediately
      try {
        await processEvents(10)
      } catch {
        // Don't fail cancellation if email fails
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Error cancelling booking:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
