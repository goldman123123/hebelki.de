import { NextRequest, NextResponse } from 'next/server'
import {
  getBusinessBySlug,
  getServiceById,
  getStaffById,
  getOrCreateCustomer,
} from '@/lib/db/queries'
import { isSlotAvailable, getAvailableSlotsWithStaff } from '@/lib/availability'
import { db } from '@/lib/db'
import { bookings } from '@/lib/db/schema'
import { emitEventStandalone } from '@/modules/core/events'
import { processEvents } from '@/modules/core/events/processor'
import { bookingLimiter } from '@/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Rate limiting: 5 bookings per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') || 'unknown'
    try {
      await bookingLimiter.check(ip, 5)
    } catch {
      return NextResponse.json(
        { error: 'Zu viele Buchungen. Bitte versuchen Sie es später erneut.' },
        { status: 429 }
      )
    }

    const { slug } = await params
    const body = await request.json()

    const {
      serviceId,
      staffId,
      startsAt,
      customerName,
      customerEmail,
      customerPhone,
      notes,
    } = body

    // Validate required fields
    if (!serviceId || !startsAt || !customerName || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get business
    const business = await getBusinessBySlug(slug)
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Get service
    const service = await getServiceById(serviceId, business.id)
    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    // Verify slot is still available (with capacity check)
    const config = {
      businessId: business.id,
      serviceId,
      staffId,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes || 0,
      minBookingNoticeHours: business.minBookingNoticeHours || 24,
      maxAdvanceBookingDays: business.maxAdvanceBookingDays || 60,
      timezone: business.timezone || 'Europe/Berlin',
      capacity: service.capacity || 1, // Add capacity to config
    }

    const slotStart = new Date(startsAt)
    const available = await isSlotAvailable(config, slotStart)

    if (!available) {
      return NextResponse.json(
        { error: 'This time slot is no longer available. Please select another time.' },
        { status: 409 }
      )
    }

    // Additional capacity check: Query existing bookings for this specific slot and service
    const slotEnd = new Date(slotStart.getTime() + service.durationMinutes * 60 * 1000)
    const { bookings: existingSlotBookings } = await import('@/lib/db/schema')
    const { eq, and, gte, lt } = await import('drizzle-orm')

    const conflictingBookings = await db
      .select()
      .from(existingSlotBookings)
      .where(
        and(
          eq(existingSlotBookings.businessId, business.id),
          eq(existingSlotBookings.serviceId, serviceId),
          gte(existingSlotBookings.startsAt, slotStart),
          lt(existingSlotBookings.startsAt, slotEnd)
        )
      )

    // If staff is specified, check staff availability
    if (staffId) {
      const staffBookings = conflictingBookings.filter(b => b.staffId === staffId)
      if (staffBookings.length > 0) {
        return NextResponse.json(
          { error: 'Staff member is busy at this time. Please select another time or staff member.' },
          { status: 409 }
        )
      }
    } else {
      // Check service capacity
      const serviceCapacity = service.capacity || 1
      if (conflictingBookings.length >= serviceCapacity) {
        return NextResponse.json(
          { error: 'This time slot is fully booked. Please select another time.' },
          { status: 409 }
        )
      }
    }

    // Auto-assign staff when none specified: find recommended staff for this slot
    let assignedStaffId: string | undefined = staffId
    if (!staffId) {
      const slotsWithStaff = await getAvailableSlotsWithStaff(config, slotStart)
      const matchingSlot = slotsWithStaff.find(s => {
        const diff = Math.abs(s.start.getTime() - slotStart.getTime())
        return diff <= 60 * 1000 && s.available && s.recommendedStaffId
      })
      if (matchingSlot?.recommendedStaffId) {
        assignedStaffId = matchingSlot.recommendedStaffId
      }
    }

    // Get or create customer
    const customer = await getOrCreateCustomer(
      business.id,
      customerEmail,
      customerName,
      customerPhone
    )

    // Calculate end time
    const endsAt = new Date(slotStart.getTime() + service.durationMinutes * 60 * 1000)

    // Get staff name if assigned
    let staffName: string | undefined
    if (assignedStaffId) {
      const staffMember = await getStaffById(assignedStaffId, business.id)
      staffName = staffMember?.name
    }

    // Create booking
    const inserted = await db
      .insert(bookings)
      .values({
        businessId: business.id,
        serviceId,
        staffId: assignedStaffId,
        customerId: customer.id,
        startsAt: slotStart,
        endsAt,
        price: service.price || undefined,
        notes,
        source: 'web',
        status: business.requireEmailConfirmation
          ? 'unconfirmed'
          : business.requireApproval
            ? 'pending'
            : 'confirmed',
      })
      .returning()

    const booking = inserted[0]

    // Emit booking.created event (async email processing)
    await emitEventStandalone(business.id, 'booking.created', {
      bookingId: booking.id,
      customerEmail,
      customerName,
      customerPhone,
      serviceName: service.name,
      businessName: business.name,
      businessEmail: business.email || undefined,
      staffName,
      startsAt: slotStart.toISOString(),
      endsAt: endsAt.toISOString(),
      price: service.price ? parseFloat(service.price) : undefined,
      currency: business.currency || 'EUR',
      confirmationToken: booking.confirmationToken || booking.id,
      notes,
      bookingStatus: booking.status || 'pending',
      requireEmailConfirmation: business.requireEmailConfirmation ?? false,
    })

    // Process events immediately (send emails right away)
    // This runs in background - if it fails, booking is already saved
    try {
      await processEvents(10) // Process up to 10 pending events
    } catch (emailError) {
      console.error('Error processing events after booking creation:', emailError)
      // Don't fail the booking if email processing fails
    }

    return NextResponse.json({
      id: booking.id,
      confirmationToken: booking.confirmationToken,
      status: booking.status,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
    })
  } catch (error) {
    console.error('Error creating booking:', error)

    // Handle double-booking constraint violation
    if (error && typeof error === 'object' && 'constraint' in error) {
      if ((error as { constraint?: string }).constraint === 'no_overlapping_bookings') {
        return NextResponse.json(
          { error: 'Dieser Zeitslot ist nicht mehr verfügbar. Bitte wählen Sie eine andere Zeit.' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
