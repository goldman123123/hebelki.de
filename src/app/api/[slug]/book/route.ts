import { NextRequest, NextResponse } from 'next/server'
import {
  getBusinessBySlug,
  getServiceById,
  getOrCreateCustomer,
  createBooking,
} from '@/lib/db/queries'
import { isSlotAvailable } from '@/lib/availability'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
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
    const service = await getServiceById(serviceId)
    if (!service || service.businessId !== business.id) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    // Verify slot is still available
    const config = {
      businessId: business.id,
      serviceId,
      staffId,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes || 0,
      minBookingNoticeHours: business.minBookingNoticeHours || 24,
      maxAdvanceBookingDays: business.maxAdvanceBookingDays || 60,
      timezone: business.timezone || 'Europe/Berlin',
    }

    const slotStart = new Date(startsAt)
    const available = await isSlotAvailable(config, slotStart)

    if (!available) {
      return NextResponse.json(
        { error: 'This time slot is no longer available. Please select another time.' },
        { status: 409 }
      )
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

    // Create booking
    const booking = await createBooking({
      businessId: business.id,
      serviceId,
      staffId,
      customerId: customer.id,
      startsAt: slotStart,
      endsAt,
      price: service.price || undefined,
      notes,
      source: 'web',
    })

    // TODO: Trigger n8n webhook for notifications
    // await triggerWebhook('booking-created', { bookingId: booking.id })

    return NextResponse.json({
      id: booking.id,
      confirmationToken: booking.confirmationToken,
      status: booking.status,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
    })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
