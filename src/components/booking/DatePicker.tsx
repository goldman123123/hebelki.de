'use client'

import { useEffect, useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Loader2 } from 'lucide-react'

interface DatePickerProps {
  businessSlug: string
  serviceId: string
  staffId?: string
  maxAdvanceBookingDays: number
  onSelect: (date: Date) => void
}

export function DatePicker({
  businessSlug,
  serviceId,
  staffId,
  maxAdvanceBookingDays,
  onSelect,
}: DatePickerProps) {
  const [availableDates, setAvailableDates] = useState<Date[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())

  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          serviceId,
          month: currentMonth.toISOString(),
        })
        if (staffId) {
          params.set('staffId', staffId)
        }

        const response = await fetch(
          `/api/${businessSlug}/availability?${params}`
        )
        if (response.ok) {
          const data = await response.json()
          setAvailableDates(data.dates.map((d: string) => new Date(d)))
        }
      } catch (error) {
        console.error('Failed to fetch availability:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAvailability()
  }, [businessSlug, serviceId, staffId, currentMonth])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + maxAdvanceBookingDays)

  const isDateAvailable = (date: Date) => {
    return availableDates.some(
      (d) => d.toDateString() === date.toDateString()
    )
  }

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month)
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Wählen Sie ein Datum
      </h2>

      <div className="flex justify-center">
        <div className="relative">
          {/* Loading overlay - don't unmount the calendar */}
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 rounded-md">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          <Calendar
            mode="single"
            month={currentMonth}
            onMonthChange={handleMonthChange}
            onSelect={(date) => date && onSelect(date)}
            disabled={(date) => {
              // Disable dates in the past
              if (date < today) return true
              // Disable dates beyond max advance booking
              if (date > maxDate) return true
              // Disable dates that aren't available
              if (!isDateAvailable(date)) return true
              return false
            }}
            modifiers={{
              available: (date) => isDateAvailable(date),
            }}
            modifiersClassNames={{
              available: 'bg-green-50 text-green-900 hover:bg-green-100',
            }}
            fromDate={today}
            toDate={maxDate}
            className="rounded-md border"
          />
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-gray-500">
        Verfügbare Termine sind grün markiert
      </p>
    </div>
  )
}
