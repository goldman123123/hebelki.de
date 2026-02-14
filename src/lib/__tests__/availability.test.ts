import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all DB dependencies before importing the module under test
vi.mock('../db/queries', () => ({
  getAvailabilityTemplate: vi.fn(),
  getAvailabilitySlots: vi.fn(),
  getAvailabilityOverrides: vi.fn(),
  getBookingsForDateRange: vi.fn(),
}))

vi.mock('../db/holds', () => ({
  getActiveHolds: vi.fn(),
}))

import { getAvailableSlots, isSlotAvailable, type AvailabilityConfig } from '../availability'
import {
  getAvailabilityTemplate,
  getAvailabilitySlots,
  getAvailabilityOverrides,
  getBookingsForDateRange,
} from '../db/queries'
import { getActiveHolds } from '../db/holds'

const baseConfig: AvailabilityConfig = {
  businessId: 'biz-1',
  serviceId: 'svc-1',
  durationMinutes: 60,
  bufferMinutes: 0,
  minBookingNoticeHours: 0,
  maxAdvanceBookingDays: 30,
  timezone: 'UTC',
}

// The code uses date.getDay() for local day-of-week but date.getUTCDate() etc for
// constructing date strings. We use a Wednesday (2026-02-18) at midnight UTC.
// getDay() at UTC midnight returns the correct day when TZ offset is 0 or positive.
// To be safe, we also set the system time to well before the test date.

describe('getAvailableSlots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  it('returns empty when no template exists', async () => {
    vi.mocked(getAvailabilityTemplate).mockResolvedValue(null as never)

    const date = new Date('2026-02-18T00:00:00Z')
    const slots = await getAvailableSlots(baseConfig, date)

    expect(slots).toEqual([])
  })

  it('returns empty when no slots for the day of week', async () => {
    vi.mocked(getAvailabilityTemplate).mockResolvedValue({ id: 'tmpl-1' } as never)

    const date = new Date('2026-02-18T00:00:00Z')
    const dayOfWeek = date.getDay() // local day-of-week

    // Set up slots for a DIFFERENT day
    const otherDay = (dayOfWeek + 1) % 7
    vi.mocked(getAvailabilitySlots).mockResolvedValue([
      { dayOfWeek: otherDay, startTime: '09:00', endTime: '17:00' },
    ] as never)
    vi.mocked(getAvailabilityOverrides).mockResolvedValue([])
    vi.mocked(getBookingsForDateRange).mockResolvedValue([])
    vi.mocked(getActiveHolds).mockResolvedValue([])

    const slots = await getAvailableSlots(baseConfig, date)
    expect(slots).toEqual([])
  })

  it('generates slots based on service duration', async () => {
    vi.mocked(getAvailabilityTemplate).mockResolvedValue({ id: 'tmpl-1' } as never)

    const date = new Date('2026-02-18T00:00:00Z')
    const dayOfWeek = date.getDay()

    // 3 hours of availability = 3 one-hour slots
    vi.mocked(getAvailabilitySlots).mockResolvedValue([
      { dayOfWeek, startTime: '09:00', endTime: '12:00' },
    ] as never)
    vi.mocked(getAvailabilityOverrides).mockResolvedValue([])
    vi.mocked(getBookingsForDateRange).mockResolvedValue([])
    vi.mocked(getActiveHolds).mockResolvedValue([])

    const config = { ...baseConfig, durationMinutes: 60, bufferMinutes: 0 }
    const slots = await getAvailableSlots(config, date)

    // 09:00-10:00, 10:00-11:00, 11:00-12:00 = 3 slots
    expect(slots).toHaveLength(3)
    expect(slots.every(s => s.available)).toBe(true)
  })

  it('marks slots as unavailable when conflicting bookings exist', async () => {
    vi.mocked(getAvailabilityTemplate).mockResolvedValue({ id: 'tmpl-1' } as never)

    const date = new Date('2026-02-18T00:00:00Z')
    const dayOfWeek = date.getDay()

    vi.mocked(getAvailabilitySlots).mockResolvedValue([
      { dayOfWeek, startTime: '09:00', endTime: '12:00' },
    ] as never)
    vi.mocked(getAvailabilityOverrides).mockResolvedValue([])

    // Booking that conflicts with the 10:00-11:00 slot
    vi.mocked(getBookingsForDateRange).mockResolvedValue([
      {
        serviceId: 'svc-1',
        staffId: 'staff-1',
        startsAt: new Date('2026-02-18T10:00:00Z'),
        endsAt: new Date('2026-02-18T11:00:00Z'),
      },
    ] as never)
    vi.mocked(getActiveHolds).mockResolvedValue([])

    const config = { ...baseConfig, staffId: 'staff-1' }
    const slots = await getAvailableSlots(config, date)

    // 09:00-10:00 available, 10:00-11:00 unavailable, 11:00-12:00 available
    expect(slots).toHaveLength(3)
    expect(slots[0].available).toBe(true)
    expect(slots[1].available).toBe(false)
    expect(slots[2].available).toBe(true)
  })

  it('returns empty when date override marks day unavailable', async () => {
    vi.mocked(getAvailabilityTemplate).mockResolvedValue({ id: 'tmpl-1' } as never)

    const date = new Date('2026-02-18T00:00:00Z')
    const dayOfWeek = date.getDay()

    vi.mocked(getAvailabilitySlots).mockResolvedValue([
      { dayOfWeek, startTime: '09:00', endTime: '17:00' },
    ] as never)
    vi.mocked(getAvailabilityOverrides).mockResolvedValue([
      { date: '2026-02-18', isAvailable: false },
    ] as never)
    vi.mocked(getBookingsForDateRange).mockResolvedValue([])
    vi.mocked(getActiveHolds).mockResolvedValue([])

    const slots = await getAvailableSlots(baseConfig, date)
    expect(slots).toEqual([])
  })
})

describe('isSlotAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  it('returns true when slot exists and is available', async () => {
    const date = new Date('2026-02-18T09:00:00Z')
    const dayOfWeek = date.getDay()

    vi.mocked(getAvailabilityTemplate).mockResolvedValue({ id: 'tmpl-1' } as never)
    vi.mocked(getAvailabilitySlots).mockResolvedValue([
      { dayOfWeek, startTime: '09:00', endTime: '12:00' },
    ] as never)
    vi.mocked(getAvailabilityOverrides).mockResolvedValue([])
    vi.mocked(getBookingsForDateRange).mockResolvedValue([])
    vi.mocked(getActiveHolds).mockResolvedValue([])

    const result = await isSlotAvailable(baseConfig, date)
    expect(result).toBe(true)
  })

  it('returns false when slot is booked', async () => {
    const date = new Date('2026-02-18T09:00:00Z')
    const dayOfWeek = date.getDay()

    vi.mocked(getAvailabilityTemplate).mockResolvedValue({ id: 'tmpl-1' } as never)
    vi.mocked(getAvailabilitySlots).mockResolvedValue([
      { dayOfWeek, startTime: '09:00', endTime: '12:00' },
    ] as never)
    vi.mocked(getAvailabilityOverrides).mockResolvedValue([])
    vi.mocked(getBookingsForDateRange).mockResolvedValue([
      {
        serviceId: 'svc-1',
        staffId: 'staff-1',
        startsAt: new Date('2026-02-18T09:00:00Z'),
        endsAt: new Date('2026-02-18T10:00:00Z'),
      },
    ] as never)
    vi.mocked(getActiveHolds).mockResolvedValue([])

    const config = { ...baseConfig, staffId: 'staff-1' }
    const result = await isSlotAvailable(config, date)
    expect(result).toBe(false)
  })

  it('uses tolerance for timestamp matching', async () => {
    const date = new Date('2026-02-18T09:00:00Z')
    const dayOfWeek = date.getDay()

    vi.mocked(getAvailabilityTemplate).mockResolvedValue({ id: 'tmpl-1' } as never)
    vi.mocked(getAvailabilitySlots).mockResolvedValue([
      { dayOfWeek, startTime: '09:00', endTime: '12:00' },
    ] as never)
    vi.mocked(getAvailabilityOverrides).mockResolvedValue([])
    vi.mocked(getBookingsForDateRange).mockResolvedValue([])
    vi.mocked(getActiveHolds).mockResolvedValue([])

    // Request slot 30 seconds off from the exact time -- within 1-minute default tolerance
    const slotStart = new Date('2026-02-18T09:00:30Z')
    const result = await isSlotAvailable(baseConfig, slotStart)
    expect(result).toBe(true)
  })
})
