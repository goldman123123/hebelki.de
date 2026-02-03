import {
  getAvailabilityTemplate,
  getAvailabilitySlots,
  getAvailabilityOverrides,
  getBookingsForDateRange
} from './db/queries'

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
}

export interface AvailabilityConfig {
  businessId: string
  serviceId: string
  staffId?: string
  durationMinutes: number
  bufferMinutes: number
  minBookingNoticeHours: number
  maxAdvanceBookingDays: number
  timezone: string
}

/**
 * Get available time slots for a specific date
 */
export async function getAvailableSlots(
  config: AvailabilityConfig,
  date: Date
): Promise<TimeSlot[]> {
  const {
    businessId,
    staffId,
    durationMinutes,
    bufferMinutes,
    minBookingNoticeHours,
    timezone,
  } = config

  // Get the template (staff-specific or business default)
  const template = await getAvailabilityTemplate(businessId, staffId)
  if (!template) {
    return []
  }

  // Get the availability slots for this template
  const slots = await getAvailabilitySlots(template.id)

  // Filter to the day of week for the requested date
  const dayOfWeek = date.getDay() // 0 = Sunday
  const daySlots = slots.filter(s => s.dayOfWeek === dayOfWeek)

  if (daySlots.length === 0) {
    return []
  }

  // Check for date-specific overrides
  const overrides = await getAvailabilityOverrides(
    businessId,
    date,
    date,
    staffId
  )

  // If there's an override marking this day as unavailable, return empty
  const dateStr = date.toISOString().split('T')[0]
  const override = overrides.find(o => o.date === dateStr)
  if (override && !override.isAvailable) {
    return []
  }

  // Get existing bookings for this date
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const existingBookings = await getBookingsForDateRange(
    businessId,
    dayStart,
    dayEnd,
    staffId
  )

  // Calculate minimum booking time (now + notice hours)
  const minBookingTime = new Date()
  minBookingTime.setHours(minBookingTime.getHours() + minBookingNoticeHours)

  // Generate all possible slots
  const allSlots: TimeSlot[] = []
  const totalDuration = durationMinutes + bufferMinutes

  for (const daySlot of daySlots) {
    // Parse start and end times
    const [startHour, startMin] = daySlot.startTime.split(':').map(Number)
    const [endHour, endMin] = daySlot.endTime.split(':').map(Number)

    const slotStart = new Date(date)
    slotStart.setHours(startHour, startMin, 0, 0)

    const slotEnd = new Date(date)
    slotEnd.setHours(endHour, endMin, 0, 0)

    // If override has custom hours, use those instead
    if (override && override.isAvailable && override.startTime && override.endTime) {
      const [overrideStartHour, overrideStartMin] = override.startTime.split(':').map(Number)
      const [overrideEndHour, overrideEndMin] = override.endTime.split(':').map(Number)
      slotStart.setHours(overrideStartHour, overrideStartMin, 0, 0)
      slotEnd.setHours(overrideEndHour, overrideEndMin, 0, 0)
    }

    // Generate slots at interval of service duration
    let currentSlotStart = new Date(slotStart)

    while (currentSlotStart.getTime() + durationMinutes * 60 * 1000 <= slotEnd.getTime()) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + durationMinutes * 60 * 1000)

      // Check if slot is available
      let available = true

      // Check minimum booking notice
      if (currentSlotStart < minBookingTime) {
        available = false
      }

      // Check for conflicts with existing bookings
      if (available) {
        for (const booking of existingBookings) {
          const bookingStart = new Date(booking.startsAt)
          const bookingEnd = new Date(booking.endsAt)

          // Check for overlap (including buffer)
          const slotWithBuffer = new Date(currentSlotEnd.getTime() + bufferMinutes * 60 * 1000)

          if (
            (currentSlotStart >= bookingStart && currentSlotStart < bookingEnd) ||
            (slotWithBuffer > bookingStart && currentSlotStart < bookingStart)
          ) {
            available = false
            break
          }
        }
      }

      allSlots.push({
        start: new Date(currentSlotStart),
        end: currentSlotEnd,
        available,
      })

      // Move to next slot
      currentSlotStart = new Date(currentSlotStart.getTime() + totalDuration * 60 * 1000)
    }
  }

  return allSlots
}

/**
 * Get available dates for a month
 */
export async function getAvailableDates(
  config: AvailabilityConfig,
  month: Date
): Promise<Date[]> {
  const { businessId, staffId, maxAdvanceBookingDays } = config

  // Get template
  const template = await getAvailabilityTemplate(businessId, staffId)
  if (!template) {
    return []
  }

  // Get all slots
  const slots = await getAvailabilitySlots(template.id)
  const availableDays = new Set(slots.map(s => s.dayOfWeek))

  // Get overrides for the month
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const overrides = await getAvailabilityOverrides(businessId, monthStart, monthEnd, staffId)

  // Calculate max booking date
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + maxAdvanceBookingDays)

  const availableDates: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentDate = new Date(Math.max(monthStart.getTime(), today.getTime()))

  while (currentDate <= monthEnd && currentDate <= maxDate) {
    const dayOfWeek = currentDate.getDay()
    const dateStr = currentDate.toISOString().split('T')[0]

    // Check override
    const override = overrides.find(o => o.date === dateStr)

    if (override) {
      // Explicit override
      if (override.isAvailable) {
        availableDates.push(new Date(currentDate))
      }
    } else if (availableDays.has(dayOfWeek)) {
      // Normal schedule
      availableDates.push(new Date(currentDate))
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return availableDates
}

/**
 * Check if a specific slot is still available
 */
export async function isSlotAvailable(
  config: AvailabilityConfig,
  slotStart: Date
): Promise<boolean> {
  const slots = await getAvailableSlots(config, slotStart)
  return slots.some(
    s => s.start.getTime() === slotStart.getTime() && s.available
  )
}
