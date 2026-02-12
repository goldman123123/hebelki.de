import {
  getAvailabilityTemplate,
  getAvailabilitySlots,
  getAvailabilityOverrides,
  getBookingsForDateRange
} from './db/queries'
import { getActiveHolds } from './db/holds'
import { fromZonedTime } from 'date-fns-tz'

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
  currentBookings?: number  // Number of existing bookings for this slot
  capacity?: number         // Max capacity for this slot (only for group bookings)
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
  capacity?: number // Service capacity (1 = single booking, >1 = multi-booking)
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
  // Use UTC getters to avoid timezone off-by-one on DST boundaries
  const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
  const override = overrides.find(o => o.date === dateStr)
  if (override && !override.isAvailable) {
    return []
  }

  // Get existing bookings for this date (full day range in UTC)
  // Use UTC getters to avoid timezone issues with local date interpretation
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  const dayStart = fromZonedTime(`${year}-${month}-${day} 00:00:00`, timezone)
  const dayEnd = fromZonedTime(`${year}-${month}-${day} 23:59:59`, timezone)

  const existingBookings = await getBookingsForDateRange(
    businessId,
    dayStart,
    dayEnd,
    staffId
  )

  // Get active holds for this date
  const activeHolds = await getActiveHolds({
    businessId,
    serviceId: config.serviceId,
    staffId,
    startDate: dayStart,
    endDate: dayEnd,
  })

  // Calculate minimum booking time (now + notice hours)
  const minBookingTime = new Date()
  minBookingTime.setHours(minBookingTime.getHours() + minBookingNoticeHours)

  // Generate all possible slots
  const allSlots: TimeSlot[] = []
  const totalDuration = durationMinutes + bufferMinutes

  for (const daySlot of daySlots) {
    // Parse start and end times - interpret in business timezone, then convert to UTC
    const [startHour, startMin] = daySlot.startTime.split(':').map(Number)
    const [endHour, endMin] = daySlot.endTime.split(':').map(Number)

    // Build date string in format "YYYY-MM-DD HH:mm" for the business timezone
    // Use UTC getters to avoid timezone issues with local date interpretation
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')

    const startTimeStr = `${year}-${month}-${day} ${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`
    const endTimeStr = `${year}-${month}-${day} ${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`

    // Convert from business timezone to UTC
    let slotStart = fromZonedTime(startTimeStr, timezone)
    let slotEnd = fromZonedTime(endTimeStr, timezone)

    // If override has custom hours, use those instead
    if (override && override.isAvailable && override.startTime && override.endTime) {
      const [overrideStartHour, overrideStartMin] = override.startTime.split(':').map(Number)
      const [overrideEndHour, overrideEndMin] = override.endTime.split(':').map(Number)

      const overrideStartStr = `${year}-${month}-${day} ${String(overrideStartHour).padStart(2, '0')}:${String(overrideStartMin).padStart(2, '0')}`
      const overrideEndStr = `${year}-${month}-${day} ${String(overrideEndHour).padStart(2, '0')}:${String(overrideEndMin).padStart(2, '0')}`

      slotStart = fromZonedTime(overrideStartStr, timezone)
      slotEnd = fromZonedTime(overrideEndStr, timezone)
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

      // Track conflicting bookings count for capacity info (declared here for scope)
      let conflictingBookingsCount = 0

      // Check for conflicts with existing bookings and holds (capacity-aware)
      if (available) {
        // Slot end time with buffer for cleanup/transition time
        const slotWithBuffer = new Date(currentSlotEnd.getTime() + bufferMinutes * 60 * 1000)

        // Helper function: Correct overlap test (a_start < b_end AND a_end > b_start)
        const overlaps = (a_start: Date, a_end: Date, b_start: Date, b_end: Date) => {
          return a_start < b_end && a_end > b_start
        }

        // Count bookings that overlap with this slot for this service
        const conflictingBookings = existingBookings.filter(booking => {
          const bookingStart = new Date(booking.startsAt)
          const bookingEnd = new Date(booking.endsAt)

          // Check if this booking overlaps with the current slot (including buffer)
          return (
            booking.serviceId === config.serviceId &&
            overlaps(currentSlotStart, slotWithBuffer, bookingStart, bookingEnd)
          )
        })

        // Count holds that overlap with this slot
        const conflictingHolds = activeHolds.filter(hold => {
          const holdStart = new Date(hold.startsAt)
          const holdEnd = new Date(hold.endsAt)

          // Check if this hold overlaps with the current slot (including buffer)
          return overlaps(currentSlotStart, slotWithBuffer, holdStart, holdEnd)
        })

        // If staff is specified, check if staff member is busy (staff can only handle 1 booking at a time)
        if (staffId) {
          const staffBookings = conflictingBookings.filter(b => b.staffId === staffId)
          const staffHolds = conflictingHolds.filter(h => h.staffId === staffId)
          if (staffBookings.length > 0 || staffHolds.length > 0) {
            available = false
          }
        } else {
          // No staff specified - check service capacity (bookings + holds)
          const serviceCapacity = config.capacity || 1
          const totalOccupied = conflictingBookings.length + conflictingHolds.length
          available = totalOccupied < serviceCapacity
          // Track for capacity display
          conflictingBookingsCount = conflictingBookings.length
        }
      }

      // Build slot object with capacity info (only for group bookings)
      const slot: TimeSlot = {
        start: new Date(currentSlotStart),
        end: currentSlotEnd,
        available,
      }

      // Add capacity info for group bookings (capacity > 1, no staff assigned)
      if (!staffId && config.capacity && config.capacity > 1) {
        slot.currentBookings = conflictingBookingsCount
        slot.capacity = config.capacity
      }

      allSlots.push(slot)

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
    const dateStr = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(currentDate.getUTCDate()).padStart(2, '0')}`

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
 * Includes tolerance window to handle timestamp reconstruction issues
 */
export async function isSlotAvailable(
  config: AvailabilityConfig,
  slotStart: Date,
  toleranceMinutes: number = 1 // Allow 1-minute tolerance for timestamp matching
): Promise<boolean> {
  const slots = await getAvailableSlots(config, slotStart)

  const requestedTime = slotStart.getTime()
  const tolerance = toleranceMinutes * 60 * 1000 // Convert to milliseconds

  return slots.some(s => {
    const slotTime = s.start.getTime()
    const diff = Math.abs(slotTime - requestedTime)

    // Match if within tolerance window AND slot is available
    return diff <= tolerance && s.available
  })
}

/**
 * Extended time slot interface with staff recommendation
 */
export interface TimeSlotWithStaff extends TimeSlot {
  recommendedStaffId?: string | null
  recommendedStaffName?: string | null
  priority?: number
}

/**
 * Get available time slots with recommended staff assignments
 * Uses priority-based assignment: tries staff in order until one is available
 */
export async function getAvailableSlotsWithStaff(
  config: AvailabilityConfig,
  date: Date
): Promise<TimeSlotWithStaff[]> {
  const { db } = await import('./db')
  const { staffServices, staff } = await import('./db/schema')
  const { eq, and, asc, isNull } = await import('drizzle-orm')

  // Get base available slots (no staff filter)
  const baseSlots = await getAvailableSlots(
    { ...config, staffId: undefined },
    date
  )

  // Get staff for this service (ordered by priority)
  const staffList = await db
    .select({
      id: staff.id,
      name: staff.name,
      sortOrder: staffServices.sortOrder,
    })
    .from(staffServices)
    .innerJoin(staff, eq(staff.id, staffServices.staffId))
    .where(and(
      eq(staffServices.serviceId, config.serviceId),
      eq(staffServices.isActive, true),
      eq(staff.isActive, true),
      eq(staff.businessId, config.businessId),
      isNull(staff.deletedAt)
    ))
    .orderBy(asc(staffServices.sortOrder), asc(staff.name))

  // If no staff assigned to service, return base slots without recommendations
  if (staffList.length === 0) {
    return baseSlots.map(slot => ({
      ...slot,
      recommendedStaffId: null,
      recommendedStaffName: null,
    }))
  }

  // For each slot, find first available staff member
  const slotsWithStaff = await Promise.all(
    baseSlots.map(async (slot) => {
      if (!slot.available) {
        return {
          ...slot,
          recommendedStaffId: null,
          recommendedStaffName: null,
        }
      }

      // Try staff in priority order
      for (const staffMember of staffList) {
        const staffConfig = { ...config, staffId: staffMember.id }

        // Check if this staff member is available at this specific time
        const isAvailable = await isSlotAvailable(staffConfig, slot.start)

        if (isAvailable) {
          return {
            ...slot,
            recommendedStaffId: staffMember.id,
            recommendedStaffName: staffMember.name,
            priority: staffMember.sortOrder,
          }
        }
      }

      // No staff available for this slot
      return {
        ...slot,
        recommendedStaffId: null,
        recommendedStaffName: null,
      }
    })
  )

  return slotsWithStaff
}
