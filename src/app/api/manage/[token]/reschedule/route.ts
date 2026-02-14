import { NextRequest, NextResponse } from 'next/server'
import { getBookingByToken } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { bookings, bookingActions } from '@/lib/db/schema'
import { isSlotAvailable } from '@/lib/availability'
import { emitEventStandalone } from '@/modules/core/events'
import { processEvents } from '@/modules/core/events/processor'
import { bookingLimiter } from '@/lib/rate-limit'
import { eq } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:manage:token:reschedule')

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Rate limiting: 5 per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') || 'unknown'
    try {
      await bookingLimiter.check(`manage-reschedule:${ip}`, 5)
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
        { error: 'Diese Buchung kann nicht mehr umgebucht werden.' },
        { status: 400 }
      )
    }

    // Check booking is in the future
    if (booking.startsAt < new Date()) {
      return NextResponse.json(
        { error: 'Vergangene Buchungen können nicht umgebucht werden.' },
        { status: 400 }
      )
    }

    // Parse body
    const body = await request.json()
    const { newStartsAt } = body

    if (!newStartsAt) {
      return NextResponse.json(
        { error: 'Neuer Zeitpunkt ist erforderlich.' },
        { status: 400 }
      )
    }

    const newStart = new Date(newStartsAt)

    // Validate new time is in the future
    if (newStart < new Date()) {
      return NextResponse.json(
        { error: 'Der neue Termin muss in der Zukunft liegen.' },
        { status: 400 }
      )
    }

    // Check slot availability
    const durationMinutes = service?.durationMinutes || 30
    const config = {
      businessId: booking.businessId,
      serviceId: booking.serviceId || '',
      staffId: booking.staffId || undefined,
      durationMinutes,
      bufferMinutes: service?.bufferMinutes || 0,
      minBookingNoticeHours: business?.minBookingNoticeHours || 24,
      maxAdvanceBookingDays: business?.maxAdvanceBookingDays || 60,
      timezone: business?.timezone || 'Europe/Berlin',
      capacity: service?.capacity || 1,
    }

    const available = await isSlotAvailable(config, newStart)
    if (!available) {
      return NextResponse.json(
        { error: 'Dieser Zeitslot ist nicht mehr verfügbar. Bitte wählen Sie eine andere Zeit.' },
        { status: 409 }
      )
    }

    // Calculate new end time
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000)
    const oldStartsAt = booking.startsAt.toISOString()
    const oldEndsAt = booking.endsAt.toISOString()

    // Update booking
    await db
      .update(bookings)
      .set({
        startsAt: newStart,
        endsAt: newEnd,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id))

    // Insert audit log
    await db.insert(bookingActions).values({
      bookingId: booking.id,
      action: 'rescheduled',
      actorType: 'customer',
      metadata: {
        oldStartsAt,
        oldEndsAt,
        newStartsAt: newStart.toISOString(),
        newEndsAt: newEnd.toISOString(),
        rescheduledVia: 'manage_page',
      },
    })

    // Emit rescheduled event (sends email)
    if (customer?.email) {
      await emitEventStandalone(booking.businessId, 'booking.rescheduled', {
        bookingId: booking.id,
        customerEmail: customer.email,
        customerName: customer.name || 'Kunde',
        serviceName: service?.name || 'Service',
        businessName: business?.name || 'Business',
        staffName: staffMember?.name,
        oldStartsAt,
        oldEndsAt,
        newStartsAt: newStart.toISOString(),
        newEndsAt: newEnd.toISOString(),
        confirmationToken: booking.confirmationToken || booking.id,
      })

      // Process events immediately
      try {
        await processEvents(10)
      } catch {
        // Don't fail reschedule if email fails
      }
    }

    return NextResponse.json({
      success: true,
      startsAt: newStart.toISOString(),
      endsAt: newEnd.toISOString(),
    })
  } catch (error) {
    log.error('Error rescheduling booking:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
