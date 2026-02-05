'use client'

import { format } from 'date-fns'
import { formatTime } from '@/lib/utils'

interface Booking {
  booking: {
    id: string
    startsAt: Date
    endsAt: Date
    status: string | null
  }
  service: {
    name: string
  } | null
  customer: {
    name: string | null
  } | null
}

interface StaffCalendarViewProps {
  staff: {
    id: string
    name: string
  }
  date: Date
  bookings: Booking[]
  timezone: string
}

export function StaffCalendarView({ staff, date, bookings, timezone }: StaffCalendarViewProps) {
  // Show timeline view for a staff member
  const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8am-8pm

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-4">{staff.name}&apos;s Schedule</h3>

      <div className="space-y-2">
        {hours.map((hour) => {
          const booking = bookings.find((b) => {
            // Get the hour in the business timezone
            const bookingHourStr = formatTime(b.booking.startsAt, timezone)
            const bookingHour = parseInt(bookingHourStr.split(':')[0])
            return bookingHour === hour
          })

          const hourDate = new Date()
          hourDate.setHours(hour, 0, 0, 0)

          return (
            <div key={hour} className="flex items-center gap-4">
              <span className="text-sm text-gray-500 w-20">
                {formatTime(hourDate, timezone)}
              </span>

              {booking ? (
                <div className="flex-1 bg-blue-100 border border-blue-300 rounded p-2">
                  <p className="font-medium text-sm">{booking.service?.name}</p>
                  <p className="text-xs text-gray-600">{booking.customer?.name}</p>
                </div>
              ) : (
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-2">
                  <p className="text-sm text-gray-400">Available</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
