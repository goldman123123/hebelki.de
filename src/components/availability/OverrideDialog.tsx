'use client'

import { useState } from 'react'
import { FormDialog } from '@/components/forms'
import { FormInput, FormTextarea, FormCheckbox } from '@/components/forms/FormField'
import { Label } from '@/components/ui/label'

interface Staff {
  id: string
  name: string
}

interface OverrideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    date: string
    isAvailable: boolean
    startTime?: string
    endTime?: string
    reason?: string
    staffId?: string
  }) => Promise<void>
  staff: Staff[]
}

export function OverrideDialog({
  open,
  onOpenChange,
  onSubmit,
  staff,
}: OverrideDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [date, setDate] = useState('')
  const [isAvailable, setIsAvailable] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [reason, setReason] = useState('')
  const [staffId, setStaffId] = useState('')

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      await onSubmit({
        date,
        isAvailable,
        startTime: isAvailable && startTime ? startTime : undefined,
        endTime: isAvailable && endTime ? endTime : undefined,
        reason: reason || undefined,
        staffId: staffId || undefined,
      })
      // Reset form
      setDate('')
      setIsAvailable(false)
      setStartTime('')
      setEndTime('')
      setReason('')
      setStaffId('')
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Time Off / Holiday"
      description="Block off a specific date or set custom hours"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Add Override"
    >
      <FormInput
        label="Date"
        name="date"
        type="date"
        required
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <div className="space-y-2">
        <Label>Staff Member</Label>
        <select
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Staff (Business-wide)</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500">
          Leave empty to apply to all staff members
        </p>
      </div>

      <FormCheckbox
        label="Custom Hours"
        description="Check to set special hours instead of closing"
        name="isAvailable"
        checked={isAvailable}
        onChange={(e) => setIsAvailable(e.target.checked)}
      />

      {isAvailable && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Open From"
            name="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <FormInput
            label="Open Until"
            name="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      )}

      <FormTextarea
        label="Reason (optional)"
        name="reason"
        placeholder="e.g., Holiday, Staff vacation, Special event"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
      />
    </FormDialog>
  )
}
