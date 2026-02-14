'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { createLogger } from '@/lib/logger'

const log = createLogger('ui:booking:TimePicker')

interface TimeSlot {
  start: string
  end: string
  available: boolean
  currentBookings?: number
  capacity?: number
}

interface TimePickerProps {
  businessSlug: string
  serviceId: string
  staffId?: string
  date: Date
  onSelect: (time: Date) => void
}

export function TimePicker({
  businessSlug,
  serviceId,
  staffId,
  date,
  onSelect,
}: TimePickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSlots = async () => {
      setIsLoading(true)
      try {
        const yyyy = date.getFullYear()
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        const params = new URLSearchParams({
          serviceId,
          date: `${yyyy}-${mm}-${dd}`,
        })
        if (staffId) {
          params.set('staffId', staffId)
        }

        const response = await fetch(
          `/api/${businessSlug}/availability?${params}`
        )
        if (response.ok) {
          const data = await response.json()
          setSlots(data.slots || [])
        }
      } catch (error) {
        log.error('Failed to fetch time slots:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSlots()
  }, [businessSlug, serviceId, staffId, date])

  const availableSlots = slots.filter((s) => s.available)

  // Group slots by morning, afternoon, evening
  const groupedSlots = {
    morning: availableSlots.filter((s) => {
      const hour = new Date(s.start).getHours()
      return hour >= 6 && hour < 12
    }),
    afternoon: availableSlots.filter((s) => {
      const hour = new Date(s.start).getHours()
      return hour >= 12 && hour < 17
    }),
    evening: availableSlots.filter((s) => {
      const hour = new Date(s.start).getHours()
      return hour >= 17 && hour < 22
    }),
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderSlotButton = (slot: TimeSlot) => {
    const hasCapacity = slot.capacity && slot.capacity > 1
    const remainingSpots = hasCapacity
      ? slot.capacity! - (slot.currentBookings || 0)
      : null

    return (
      <button
        key={slot.start}
        onClick={() => onSelect(new Date(slot.start))}
        className={cn(
          'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium',
          'transition-all hover:border-primary hover:bg-primary/5',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'flex flex-col items-center gap-1'
        )}
      >
        <span>{formatTime(slot.start)}</span>
        {hasCapacity && remainingSpots !== null && (
          <Badge
            variant="secondary"
            className={cn(
              'text-xs px-2 py-0',
              remainingSpots <= 2 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
            )}
          >
            {remainingSpots}/{slot.capacity} spots
          </Badge>
        )}
      </button>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (availableSlots.length === 0) {
    return (
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Wählen Sie eine Uhrzeit
        </h2>
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">
            Keine verfügbaren Zeitfenster für dieses Datum. Bitte wählen Sie ein anderes Datum.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Choose a Time
      </h2>

      <div className="space-y-6">
        {groupedSlots.morning.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-500">Vormittag</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {groupedSlots.morning.map((slot) => renderSlotButton(slot))}
            </div>
          </div>
        )}

        {groupedSlots.afternoon.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-500">Nachmittag</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {groupedSlots.afternoon.map((slot) => renderSlotButton(slot))}
            </div>
          </div>
        )}

        {groupedSlots.evening.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-500">Abend</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {groupedSlots.evening.map((slot) => renderSlotButton(slot))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
