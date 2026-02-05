'use client'

import { TimeSlotRow } from './TimeSlotRow'

interface TimeSlot {
  startTime: string
  endTime: string
}

interface WeeklySchedule {
  [key: number]: TimeSlot[]
}

interface WeeklyScheduleEditorProps {
  schedule: WeeklySchedule
  onChange: (schedule: WeeklySchedule) => void
  disabled?: boolean
}

const DAYS = [
  { key: 1, label: 'Mon' },
  { key: 2, label: 'Tue' },
  { key: 3, label: 'Wed' },
  { key: 4, label: 'Thu' },
  { key: 5, label: 'Fri' },
  { key: 6, label: 'Sat' },
  { key: 0, label: 'Sun' },
]

export function WeeklyScheduleEditor({
  schedule,
  onChange,
  disabled,
}: WeeklyScheduleEditorProps) {
  function handleDayChange(dayOfWeek: number, slots: TimeSlot[]) {
    onChange({
      ...schedule,
      [dayOfWeek]: slots,
    })
  }

  return (
    <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
      {DAYS.map(({ key, label }, index) => (
        <div
          key={key}
          className={index === 0 ? 'rounded-t-lg' : index === DAYS.length - 1 ? 'rounded-b-lg' : ''}
        >
          <TimeSlotRow
            day={label}
            slots={schedule[key] || []}
            onChange={(slots) => handleDayChange(key, slots)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  )
}
