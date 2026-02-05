'use client'

import { WeeklyScheduleEditor } from '@/components/availability/WeeklyScheduleEditor'
import { Label } from '@/components/ui/label'

interface TimeSlot {
  startTime: string
  endTime: string
}

interface WeeklySchedule {
  [key: number]: TimeSlot[]
}

interface ScheduleSectionProps {
  useDefaultHours: boolean
  schedule: WeeklySchedule
  businessSchedule: WeeklySchedule
  onUseDefaultChange: (checked: boolean) => void
  onScheduleChange: (schedule: WeeklySchedule) => void
  disabled?: boolean
}

export function ScheduleSection({
  useDefaultHours,
  schedule,
  businessSchedule,
  onUseDefaultChange,
  onScheduleChange,
  disabled,
}: ScheduleSectionProps) {
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4 bg-gray-50">
      <div>
        <Label className="text-base font-semibold">Schedule</Label>
        <p className="text-sm text-gray-500 mt-1">
          Set custom availability for this staff member
        </p>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useDefaultHours}
            onChange={(e) => onUseDefaultChange(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium">Use default business hours</span>
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-6">
          Uncheck to set custom availability for this staff member
        </p>
      </div>

      {!useDefaultHours && (
        <div className="mt-4">
          <WeeklyScheduleEditor
            schedule={schedule}
            onChange={onScheduleChange}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}
