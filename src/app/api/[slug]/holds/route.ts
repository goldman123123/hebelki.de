import { NextRequest, NextResponse } from 'next/server'
import { getBusinessBySlug, getServiceById } from '@/lib/db/queries'
import { createHold, cancelHold } from '@/lib/db/holds'
import { isSlotAvailable, getAvailableSlotsWithStaff } from '@/lib/availability'

/**
 * POST /api/{slug}/holds - Create a hold
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { serviceId, staffId, startsAt, holdDurationMinutes, customerTimezone, idempotencyKey } = body

    if (!serviceId || !startsAt) {
      return NextResponse.json({ error: 'serviceId and startsAt required' }, { status: 400 })
    }

    const business = await getBusinessBySlug(slug)
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const service = await getServiceById(serviceId, business.id)
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    // Verify slot available
    const slotStart = new Date(startsAt)
    const config = {
      businessId: business.id,
      serviceId,
      staffId: staffId || undefined,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes || 0,
      minBookingNoticeHours: business.minBookingNoticeHours || 24,
      maxAdvanceBookingDays: business.maxAdvanceBookingDays || 60,
      timezone: business.timezone || 'Europe/Berlin',
      capacity: service.capacity || 1,
    }

    const available = await isSlotAvailable(config, slotStart)
    if (!available) {
      // Log the mismatch for debugging
      console.error('[Holds API] Slot unavailable', {
        requested: slotStart.toISOString(),
        serviceId,
        staffId,
        businessId: business.id,
      })

      return NextResponse.json({
        error: 'Time slot no longer available',
        code: 'SLOT_UNAVAILABLE',
        details: {
          requestedTime: slotStart.toISOString(),
          message: 'Please check availability again for current time slots',
        },
      }, { status: 409 })
    }

    // Auto-assign staff when none specified: find recommended staff for this slot
    let assignedStaffId: string | null = staffId || null
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

    // Create hold
    const slotEnd = new Date(slotStart.getTime() + service.durationMinutes * 60 * 1000)
    const hold = await createHold({
      businessId: business.id,
      serviceId,
      staffId: assignedStaffId,
      startsAt: slotStart,
      endsAt: slotEnd,
      holdDurationMinutes: holdDurationMinutes || 5,
      customerTimezone: customerTimezone || null,
      idempotencyKey: idempotencyKey || null,
      createdBy: 'web',
    })

    return NextResponse.json({
      holdId: hold.holdId,
      expiresAt: hold.expiresAt.toISOString(),
      startsAt: hold.startsAt.toISOString(),
      endsAt: hold.endsAt.toISOString(),
      staffId: assignedStaffId,
    })
  } catch (error) {
    console.error('Error creating hold:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/{slug}/holds?holdId=xxx - Cancel a hold
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const holdId = searchParams.get('holdId')

    if (!holdId) {
      return NextResponse.json({ error: 'holdId required' }, { status: 400 })
    }

    const business = await getBusinessBySlug(slug)
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    await cancelHold(holdId, business.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error canceling hold:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
