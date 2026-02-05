'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X } from 'lucide-react'

interface TimeSlot {
  startTime: string
  endTime: string
}

interface TimeSlotRowProps {
  day: string
  slots: TimeSlot[]
  onChange: (slots: TimeSlot[]) => void
  disabled?: boolean
}

export function TimeSlotRow({ day, slots, onChange, disabled }: TimeSlotRowProps) {
  function addSlot() {
    // Default to 09:00-17:00 or after last slot
    let newStart = '09:00'
    let newEnd = '17:00'

    if (slots.length > 0) {
      const lastSlot = slots[slots.length - 1]
      const lastEndHour = parseInt(lastSlot.endTime.split(':')[0])
      newStart = `${String(lastEndHour + 1).padStart(2, '0')}:00`
      newEnd = `${String(lastEndHour + 3).padStart(2, '0')}:00`
    }

    onChange([...slots, { startTime: newStart, endTime: newEnd }])
  }

  function updateSlot(index: number, field: 'startTime' | 'endTime', value: string) {
    const updated = [...slots]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  function removeSlot(index: number) {
    onChange(slots.filter((_, i) => i !== index))
  }

  const isClosed = slots.length === 0

  return (
    <div className="flex items-center gap-4 py-4 px-1 hover:bg-gray-50 transition-colors">
      <div className="w-20 font-semibold text-gray-900">{day}</div>

      <div className="flex flex-1 flex-wrap items-center gap-3">
        {isClosed ? (
          <span className="text-gray-400 italic text-sm">Closed</span>
        ) : (
          slots.map((slot, index) => (
            <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
              <Input
                type="time"
                value={slot.startTime}
                onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
                className="w-28 h-9 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                disabled={disabled}
              />
              <span className="text-gray-400 font-medium">→</span>
              <Input
                type="time"
                value={slot.endTime}
                onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
                className="w-28 h-9 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                disabled={disabled}
              />
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSlot(index)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSlot}
          className="shrink-0 h-9 px-4 border-gray-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {isClosed ? 'Add Hours' : 'Add Slot'}
        </Button>
      )}
    </div>
  )
}
