import { NextRequest, NextResponse } from 'next/server'
import { getBusinessBySlug, getServiceById } from '@/lib/db/queries'
import { getAvailableSlots, getAvailableDates, getAvailableSlotsWithStaff } from '@/lib/availability'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:slug:availability')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('serviceId')
    const staffId = searchParams.get('staffId') || undefined
    const date = searchParams.get('date')
    const month = searchParams.get('month')

    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId is required' },
        { status: 400 }
      )
    }

    const business = await getBusinessBySlug(slug)
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const service = await getServiceById(serviceId, business.id)
    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    const config = {
      businessId: business.id,
      serviceId,
      staffId,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes || 0,
      minBookingNoticeHours: business.minBookingNoticeHours || 24,
      maxAdvanceBookingDays: business.maxAdvanceBookingDays || 60,
      timezone: business.timezone || 'Europe/Berlin',
      capacity: service.capacity || 1,
    }

    // If date is provided, return time slots for that date
    if (date) {
      // Parse date string - just extract year/month/day components
      // The availability function will handle timezone conversion properly
      const [year, month, day] = date.split('-').map(Number)
      const dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))

      // Use staff recommendation if staffId is not specified
      if (!staffId) {
        const slots = await getAvailableSlotsWithStaff(config, dateObj)
        return NextResponse.json({
          slots: slots.map((s) => ({
            start: s.start.toISOString(),
            end: s.end.toISOString(),
            available: s.available,
            recommendedStaffId: s.recommendedStaffId || null,
            recommendedStaffName: s.recommendedStaffName || null,
          })),
        })
      } else {
        // Staff specified - use regular availability check
        const slots = await getAvailableSlots(config, dateObj)
        return NextResponse.json({
          slots: slots.map((s) => ({
            start: s.start.toISOString(),
            end: s.end.toISOString(),
            available: s.available,
          })),
        })
      }
    }

    // If month is provided, return available dates for that month
    if (month) {
      const dates = await getAvailableDates(config, new Date(month))
      return NextResponse.json({
        dates: dates.map((d) => d.toISOString().split('T')[0]),
      })
    }

    // Default: return available dates for current month
    const dates = await getAvailableDates(config, new Date())
    return NextResponse.json({
      dates: dates.map((d) => d.toISOString().split('T')[0]),
    })
  } catch (error) {
    log.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
