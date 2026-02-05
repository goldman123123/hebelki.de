'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ServiceMultiSelect } from '@/components/forms/ServiceMultiSelect'
import { ScheduleSection } from './ScheduleSection'
import { Check, X, Loader2 } from 'lucide-react'

interface TimeSlot {
  startTime: string
  endTime: string
}

interface WeeklySchedule {
  [key: number]: TimeSlot[]
}

interface StaffMember {
  id: string
  name: string
  email: string | null
  phone: string | null
  title: string | null
  bio: string | null
  avatarUrl: string | null
  isActive: boolean | null
  serviceIds?: string[]
}

interface Service {
  id: string
  name: string
  category: string | null
}

interface StaffFormData {
  name: string
  email?: string | null
  phone?: string | null
  title?: string | null
  bio?: string | null
  avatarUrl?: string | null
  isActive: boolean
  serviceIds: string[]
  useDefaultHours: boolean
  schedule: WeeklySchedule
}

interface InlineStaffFormProps {
  staff: StaffMember | null // null for create new
  services: Service[]
  businessSchedule: WeeklySchedule
  onSave: (data: StaffFormData) => Promise<void>
  onCancel: () => void
  isSaving: boolean
}

export function InlineStaffForm({
  staff,
  services,
  businessSchedule,
  onSave,
  onCancel,
  isSaving,
}: InlineStaffFormProps) {
  const [formData, setFormData] = useState<StaffFormData>({
    name: staff?.name || '',
    email: staff?.email || '',
    phone: staff?.phone || '',
    title: staff?.title || '',
    bio: staff?.bio || '',
    avatarUrl: staff?.avatarUrl || '',
    isActive: staff?.isActive ?? true,
    serviceIds: staff?.serviceIds || [],
    useDefaultHours: true,
    schedule: {},
  })

  // Load staff schedule if editing existing staff
  useEffect(() => {
    if (staff) {
      async function loadStaffSchedule() {
        const res = await fetch(`/api/admin/availability/templates?staffId=${staff.id}`)
        const data = await res.json()
        const staffTpl = data.templates?.find((t: any) => t.isDefault)

        if (staffTpl && staffTpl.slots.length > 0) {
          // Has custom schedule
          const schedule: WeeklySchedule = {}
          staffTpl.slots.forEach((slot: any) => {
            if (!schedule[slot.dayOfWeek]) {
              schedule[slot.dayOfWeek] = []
            }
            schedule[slot.dayOfWeek].push({
              startTime: slot.startTime,
              endTime: slot.endTime,
            })
          })
          setFormData((prev) => ({
            ...prev,
            useDefaultHours: false,
            schedule,
          }))
        }
      }
      loadStaffSchedule()
    }
  }, [staff])

  async function handleSubmit() {
    if (!formData.name.trim()) return
    await onSave(formData)
  }

  return (
    <div className="rounded-lg border-2 border-blue-200 bg-blue-50/30 p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">
        {staff ? 'Edit Staff Member' : 'New Staff Member'}
      </h3>

      <div className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Full name"
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Email
            </label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Phone
            </label>
            <Input
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+49 123 456789"
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Title/Role
            </label>
            <Input
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Physical Therapist"
              disabled={isSaving}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Bio
          </label>
          <Textarea
            value={formData.bio || ''}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Brief description..."
            rows={2}
            disabled={isSaving}
            className="resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Avatar URL
          </label>
          <Input
            value={formData.avatarUrl || ''}
            onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
            placeholder="https://..."
            disabled={isSaving}
          />
          <p className="text-xs text-gray-500 mt-1">Link to profile photo</p>
        </div>

        {/* Service Assignments */}
        <ServiceMultiSelect
          services={services}
          selectedIds={formData.serviceIds}
          onChange={(serviceIds) => setFormData({ ...formData, serviceIds })}
        />

        {/* Schedule Section */}
        <ScheduleSection
          useDefaultHours={formData.useDefaultHours}
          schedule={formData.schedule}
          businessSchedule={businessSchedule}
          onUseDefaultChange={(checked) =>
            setFormData({
              ...formData,
              useDefaultHours: checked,
              schedule: checked ? {} : { ...businessSchedule },
            })
          }
          onScheduleChange={(schedule) =>
            setFormData({ ...formData, schedule })
          }
          disabled={isSaving}
        />

        {/* Active Status */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              disabled={isSaving}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium">Active</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Inactive staff are hidden from booking
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !formData.name.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {staff ? 'Save Changes' : 'Create Staff'}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
