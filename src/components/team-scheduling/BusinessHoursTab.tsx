'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WeeklyScheduleEditor } from '@/components/availability/WeeklyScheduleEditor'
import { Loader2, Save } from 'lucide-react'

interface TimeSlot {
  startTime: string
  endTime: string
}

interface WeeklySchedule {
  [key: number]: TimeSlot[]
}

interface Template {
  id: string
  name: string
  isDefault: boolean
  staffId: string | null
  slots: {
    dayOfWeek: number
    startTime: string
    endTime: string
  }[]
}

interface BusinessHoursTabProps {
  businessTemplate: Template | null
  businessSchedule: WeeklySchedule
  onBusinessTemplateChange: (template: Template) => void
  onBusinessScheduleChange: (schedule: WeeklySchedule) => void
}

export function BusinessHoursTab({
  businessTemplate,
  businessSchedule,
  onBusinessTemplateChange,
  onBusinessScheduleChange,
}: BusinessHoursTabProps) {
  const [saving, setSaving] = useState(false)

  function scheduleToSlots(schedule: WeeklySchedule): { dayOfWeek: number; startTime: string; endTime: string }[] {
    const slots: { dayOfWeek: number; startTime: string; endTime: string }[] = []
    Object.entries(schedule).forEach(([day, daySlots]) => {
      daySlots.forEach((slot: TimeSlot) => {
        slots.push({
          dayOfWeek: parseInt(day),
          startTime: slot.startTime,
          endTime: slot.endTime,
        })
      })
    })
    return slots
  }

  async function handleSaveBusinessHours() {
    setSaving(true)
    try {
      if (!businessTemplate) {
        // Create new template
        const createRes = await fetch('/api/admin/availability/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Business Hours', isDefault: true }),
        })
        const data = await createRes.json()
        onBusinessTemplateChange(data.template)

        // Save slots
        await fetch(`/api/admin/availability/templates/${data.template.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slots: scheduleToSlots(businessSchedule) }),
        })
      } else {
        // Update existing
        await fetch(`/api/admin/availability/templates/${businessTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slots: scheduleToSlots(businessSchedule) }),
        })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default Business Hours</CardTitle>
        <CardDescription>
          Set your regular weekly schedule. Individual staff can override these.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <WeeklyScheduleEditor
          schedule={businessSchedule}
          onChange={onBusinessScheduleChange}
        />
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveBusinessHours} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
