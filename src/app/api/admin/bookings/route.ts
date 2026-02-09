import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import {
  getBookingsByStatus,
  getServiceById,
  getStaffById,
  getOrCreateCustomer,
  verifyServiceOwnership,
  verifyStaffOwnership,
} from '@/lib/db/queries'
import { isSlotAvailable } from '@/lib/availability'
import { db } from '@/lib/db'
import { bookings, customers } from '@/lib/db/schema'
import { emitEventStandalone } from '@/modules/core/events'
import { processEvents } from '@/modules/core/events/processor'
import { eq, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'

  const bookingsList = await getBookingsByStatus(authResult.business.id, status)

  return NextResponse.json({ bookings: bookingsList })
}

/**
 * POST /api/admin/bookings
 * Create a new booking from the admin dashboard
 */
export async function POST(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const business = authResult.business

  try {
    const body = await request.json()

    const {
      // Customer: either existing ID or new customer data
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      // Booking details
      serviceId,
      staffId,
      startsAt,
      // Admin options
      skipAvailabilityCheck = false,
      sendConfirmationEmail = true,
      customPrice,
      customerNotes,
      internalNotes,
    } = body

    // Validate required fields
    if (!serviceId || !startsAt) {
      return NextResponse.json(
        { error: 'Service und Startzeit sind erforderlich' },
        { status: 400 }
      )
    }

    // Must have either customerId or customer details
    if (!customerId && !customerEmail && !customerName) {
      return NextResponse.json(
        { error: 'Kunde ist erforderlich (ID oder Name/E-Mail)' },
        { status: 400 }
      )
    }

    // Verify service belongs to this business
    const serviceOwned = await verifyServiceOwnership(serviceId, business.id)
    if (!serviceOwned) {
      return NextResponse.json(
        { error: 'Dienstleistung nicht gefunden' },
        { status: 404 }
      )
    }

    // Get service details
    const service = await getServiceById(serviceId, business.id)
    if (!service) {
      return NextResponse.json(
        { error: 'Dienstleistung nicht gefunden' },
        { status: 404 }
      )
    }

    // Verify staff if provided
    let staffMember = null
    if (staffId) {
      const staffOwned = await verifyStaffOwnership(staffId, business.id)
      if (!staffOwned) {
        return NextResponse.json(
          { error: 'Mitarbeiter nicht gefunden' },
          { status: 404 }
        )
      }
      staffMember = await getStaffById(staffId, business.id)
    }

    // Parse start time
    const slotStart = new Date(startsAt)
    if (isNaN(slotStart.getTime())) {
      return NextResponse.json(
        { error: 'Ungültige Startzeit' },
        { status: 400 }
      )
    }

    // Check availability (unless admin overrides)
    if (!skipAvailabilityCheck) {
      const config = {
        businessId: business.id,
        serviceId,
        staffId,
        durationMinutes: service.durationMinutes,
        bufferMinutes: service.bufferMinutes || 0,
        minBookingNoticeHours: 0, // Admin bypasses notice requirement
        maxAdvanceBookingDays: 365, // Admin can book far in advance
        timezone: business.timezone || 'Europe/Berlin',
        capacity: service.capacity || 1,
      }

      const available = await isSlotAvailable(config, slotStart)
      if (!available) {
        return NextResponse.json(
          { error: 'Dieser Zeitslot ist nicht verfügbar. Aktivieren Sie "Verfügbarkeit überschreiben" um trotzdem zu buchen.' },
          { status: 409 }
        )
      }
    }

    // Get or create customer
    let customer
    if (customerId) {
      // Verify customer belongs to business
      const existingCustomer = await db
        .select()
        .from(customers)
        .where(and(
          eq(customers.id, customerId),
          eq(customers.businessId, business.id)
        ))
        .limit(1)

      if (!existingCustomer[0]) {
        return NextResponse.json(
          { error: 'Kunde nicht gefunden' },
          { status: 404 }
        )
      }
      customer = existingCustomer[0]
    } else {
      // Create new customer or get existing by email
      if (customerEmail) {
        customer = await getOrCreateCustomer(
          business.id,
          customerEmail,
          customerName,
          customerPhone
        )
      } else {
        // Create customer with just name (no email)
        const inserted = await db
          .insert(customers)
          .values({
            businessId: business.id,
            name: customerName,
            phone: customerPhone,
            source: 'admin',
          })
          .returning()
        customer = inserted[0]
      }
    }

    // Calculate end time
    const endsAt = new Date(slotStart.getTime() + service.durationMinutes * 60 * 1000)

    // Determine price
    const price = customPrice !== undefined && customPrice !== null && customPrice !== ''
      ? customPrice.toString()
      : (service.price || undefined)

    // Create booking
    const inserted = await db
      .insert(bookings)
      .values({
        businessId: business.id,
        serviceId,
        staffId: staffId || null,
        customerId: customer.id,
        startsAt: slotStart,
        endsAt,
        price,
        notes: customerNotes || null,
        internalNotes: internalNotes || null,
        source: 'admin',
        status: 'confirmed', // Admin bookings are auto-confirmed
        confirmedAt: new Date(),
      })
      .returning()

    const booking = inserted[0]

    // Emit booking.created event for email notification (if enabled)
    if (sendConfirmationEmail && customer.email) {
      await emitEventStandalone(business.id, 'booking.created', {
        bookingId: booking.id,
        customerEmail: customer.email,
        customerName: customer.name || 'Kunde',
        customerPhone: customer.phone || undefined,
        serviceName: service.name,
        businessName: business.name,
        businessEmail: business.email || undefined,
        staffName: staffMember?.name,
        startsAt: slotStart.toISOString(),
        endsAt: endsAt.toISOString(),
        price: price ? parseFloat(price) : undefined,
        currency: business.currency || 'EUR',
        confirmationToken: booking.confirmationToken || booking.id,
        notes: customerNotes,
      })
    }

    // Process events immediately (send emails)
    if (sendConfirmationEmail && customer.email) {
      try {
        await processEvents(10)
      } catch (emailError) {
        console.error('Error processing events after admin booking creation:', emailError)
        // Don't fail the booking if email processing fails
      }
    }

    return NextResponse.json({
      id: booking.id,
      status: booking.status,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
      service: {
        id: service.id,
        name: service.name,
      },
      staff: staffMember ? {
        id: staffMember.id,
        name: staffMember.name,
      } : null,
    })
  } catch (error) {
    console.error('Error creating admin booking:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Buchung' },
      { status: 500 }
    )
  }
}
