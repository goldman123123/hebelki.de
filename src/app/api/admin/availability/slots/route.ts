import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { getServiceById, verifyServiceOwnership, verifyStaffOwnership } from '@/lib/db/queries'
import { getAvailableSlots } from '@/lib/availability'

/**
 * GET /api/admin/availability/slots
 *
 * Returns available time slots for admin booking form.
 * Admin bypasses minBookingNoticeHours restriction (can book same-day).
 *
 * Query params:
 * - serviceId: required - the service to check availability for
 * - date: required - ISO date string (YYYY-MM-DD)
 * - staffId: optional - specific staff member to check
 */
export async function GET(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const business = authResult.business
  const { searchParams } = new URL(request.url)

  const serviceId = searchParams.get('serviceId')
  const dateStr = searchParams.get('date')
  const staffId = searchParams.get('staffId')

  // Validate required params
  if (!serviceId) {
    return NextResponse.json(
      { error: 'serviceId ist erforderlich' },
      { status: 400 }
    )
  }

  if (!dateStr) {
    return NextResponse.json(
      { error: 'date ist erforderlich' },
      { status: 400 }
    )
  }

  // Verify service belongs to business
  const serviceOwned = await verifyServiceOwnership(serviceId, business.id)
  if (!serviceOwned) {
    return NextResponse.json(
      { error: 'Dienstleistung nicht gefunden' },
      { status: 404 }
    )
  }

  // Verify staff if provided
  if (staffId) {
    const staffOwned = await verifyStaffOwnership(staffId, business.id)
    if (!staffOwned) {
      return NextResponse.json(
        { error: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      )
    }
  }

  // Get service details
  const service = await getServiceById(serviceId, business.id)
  if (!service) {
    return NextResponse.json(
      { error: 'Dienstleistung nicht gefunden' },
      { status: 404 }
    )
  }

  // Parse date
  const date = new Date(dateStr + 'T00:00:00Z')
  if (isNaN(date.getTime())) {
    return NextResponse.json(
      { error: 'Ungültiges Datum' },
      { status: 400 }
    )
  }

  // Build availability config
  // Admin bypasses minBookingNoticeHours (set to 0)
  const config = {
    businessId: business.id,
    serviceId,
    staffId: staffId || undefined,
    durationMinutes: service.durationMinutes,
    bufferMinutes: service.bufferMinutes || 0,
    minBookingNoticeHours: 0, // Admin can book immediately
    maxAdvanceBookingDays: 365, // Admin can book far in advance
    timezone: business.timezone || 'Europe/Berlin',
    capacity: service.capacity || 1,
  }

  // Get available slots
  const slots = await getAvailableSlots(config, date)

  // Transform to response format
  const response = slots.map(slot => ({
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    available: slot.available,
    currentBookings: slot.currentBookings,
    capacity: slot.capacity,
  }))

  return NextResponse.json({
    date: dateStr,
    serviceId,
    staffId: staffId || null,
    timezone: business.timezone || 'Europe/Berlin',
    slots: response,
  })
}
