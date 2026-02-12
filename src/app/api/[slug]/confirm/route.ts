import { NextRequest, NextResponse } from 'next/server'
import { getBusinessBySlug } from '@/lib/db/queries'
import { confirmHold } from '@/lib/db/holds'
import { processEvents } from '@/modules/core/events/processor'
import { db } from '@/lib/db'
import { bookings, services, staff } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * POST /api/{slug}/confirm - Confirm hold and create booking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { holdId, customerName, customerEmail, customerPhone, customerTimezone, notes, idempotencyKey } = body

    if (!holdId || !customerName || !customerEmail) {
      return NextResponse.json({ error: 'holdId, customerName, customerEmail required' }, { status: 400 })
    }

    const business = await getBusinessBySlug(slug)
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const result = await confirmHold({
      holdId,
      businessId: business.id,
      customerName,
      customerEmail,
      customerPhone,
      customerTimezone,
      notes,
      idempotencyKey: idempotencyKey || `${holdId}-${customerEmail}`,
    })

    // Process events immediately (send emails right away)
    // This runs in background - if it fails, booking is already saved
    try {
      await processEvents(10)
    } catch (emailError) {
      console.error('Error processing events after booking confirmation:', emailError)
      // Don't fail the booking if email processing fails
    }

    // Fetch full booking details including staff info for chatbot
    const bookingDetails = await db
      .select({
        booking: bookings,
        service: services,
        staff: staff,
      })
      .from(bookings)
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(staff, eq(bookings.staffId, staff.id))
      .where(eq(bookings.id, result.bookingId))
      .limit(1)
      .then(rows => rows[0])

    return NextResponse.json({
      bookingId: result.bookingId,
      confirmationToken: result.confirmationToken,
      alreadyExists: result.alreadyExists,
      booking: bookingDetails?.booking,
      service: bookingDetails?.service,
      staff: bookingDetails?.staff,
    })
  } catch (error: unknown) {
    console.error('Error confirming hold:', error)
    const message = error instanceof Error ? error.message : String(error)

    if (message === 'Hold expired. Please select a new time slot.') {
      return NextResponse.json({ error: message, code: 'HOLD_EXPIRED' }, { status: 410 })
    }

    if (message === 'Hold not found') {
      return NextResponse.json({ error: message, code: 'HOLD_NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
