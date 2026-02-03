'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { WeeklyScheduleEditor } from '@/components/availability/WeeklyScheduleEditor'
import { OverridesList } from '@/components/availability/OverridesList'
import { OverrideDialog } from '@/components/availability/OverrideDialog'
import { Loader2, Plus, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface Override {
  override: {
    id: string
    date: string
    isAvailable: boolean | null
    startTime: string | null
    endTime: string | null
    reason: string | null
    staffId: string | null
  }
  staffMember: { name: string } | null
}

interface Staff {
  id: string
  name: string
}

const tabs = [
  { id: 'business', label: 'Business Hours' },
  { id: 'staff', label: 'Staff Schedules' },
  { id: 'overrides', label: 'Time Off / Holidays' },
]

export default function AvailabilityPage() {
  const [activeTab, setActiveTab] = useState('business')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Business hours
  const [businessTemplate, setBusinessTemplate] = useState<Template | null>(null)
  const [businessSchedule, setBusinessSchedule] = useState<WeeklySchedule>({})

  // Staff
  const [staffMembers, setStaffMembers] = useState<Staff[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [useDefaultHours, setUseDefaultHours] = useState(true)
  const [staffTemplate, setStaffTemplate] = useState<Template | null>(null)
  const [staffSchedule, setStaffSchedule] = useState<WeeklySchedule>({})

  // Overrides
  const [overrides, setOverrides] = useState<Override[]>([])
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [deletingOverride, setDeletingOverride] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [templatesRes, staffRes, overridesRes] = await Promise.all([
        fetch('/api/admin/availability/templates'),
        fetch('/api/admin/staff'),
        fetch('/api/admin/availability/overrides'),
      ])

      const [templatesData, staffData, overridesData] = await Promise.all([
        templatesRes.json(),
        staffRes.json(),
        overridesRes.json(),
      ])

      // Business template
      const businessTpl = templatesData.templates?.find(
        (t: Template) => !t.staffId && t.isDefault
      )
      if (businessTpl) {
        setBusinessTemplate(businessTpl)
        setBusinessSchedule(slotsToSchedule(businessTpl.slots))
      }

      setStaffMembers(staffData.staff?.filter((s: Staff & { isActive: boolean }) => s.isActive) || [])
      setOverrides(overridesData.overrides || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Load staff schedule when staff selected
  useEffect(() => {
    if (!selectedStaffId) {
      setStaffTemplate(null)
      setStaffSchedule({})
      setUseDefaultHours(true)
      return
    }

    async function loadStaffSchedule() {
      const res = await fetch(`/api/admin/availability/templates?staffId=${selectedStaffId}`)
      const data = await res.json()
      const staffTpl = data.templates?.find((t: Template) => t.isDefault)

      if (staffTpl) {
        setStaffTemplate(staffTpl)
        setStaffSchedule(slotsToSchedule(staffTpl.slots))
        setUseDefaultHours(false)
      } else {
        setStaffTemplate(null)
        setStaffSchedule({})
        setUseDefaultHours(true)
      }
    }

    loadStaffSchedule()
  }, [selectedStaffId])

  function slotsToSchedule(slots: { dayOfWeek: number; startTime: string; endTime: string }[]): WeeklySchedule {
    const schedule: WeeklySchedule = {}
    slots.forEach((slot) => {
      if (!schedule[slot.dayOfWeek]) {
        schedule[slot.dayOfWeek] = []
      }
      schedule[slot.dayOfWeek].push({
        startTime: slot.startTime,
        endTime: slot.endTime,
      })
    })
    return schedule
  }

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
        setBusinessTemplate(data.template)

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

  async function handleSaveStaffSchedule() {
    if (!selectedStaffId) return

    setSaving(true)
    try {
      if (useDefaultHours) {
        // Delete staff-specific template if exists
        if (staffTemplate) {
          // Just clear the slots
          await fetch(`/api/admin/availability/templates/${staffTemplate.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slots: [] }),
          })
        }
        setStaffSchedule({})
      } else {
        if (!staffTemplate) {
          // Create new staff template
          const createRes = await fetch('/api/admin/availability/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Staff Schedule',
              staffId: selectedStaffId,
              isDefault: true,
            }),
          })
          const data = await createRes.json()
          setStaffTemplate(data.template)

          // Save slots
          await fetch(`/api/admin/availability/templates/${data.template.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slots: scheduleToSlots(staffSchedule) }),
          })
        } else {
          // Update existing
          await fetch(`/api/admin/availability/templates/${staffTemplate.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slots: scheduleToSlots(staffSchedule) }),
          })
        }
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleAddOverride(data: {
    date: string
    isAvailable: boolean
    startTime?: string
    endTime?: string
    reason?: string
    staffId?: string
  }) {
    await fetch('/api/admin/availability/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    fetchData()
  }

  async function handleDeleteOverride(id: string) {
    setDeletingOverride(id)
    try {
      await fetch(`/api/admin/availability/overrides/${id}`, {
        method: 'DELETE',
      })
      setOverrides(overrides.filter((o) => o.override.id !== id))
    } finally {
      setDeletingOverride(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Availability Settings</h1>
        <p className="text-gray-600">Configure when you're available for bookings</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border bg-gray-50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Business Hours Tab */}
      {activeTab === 'business' && (
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
              onChange={setBusinessSchedule}
            />
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveBusinessHours} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Schedules Tab */}
      {activeTab === 'staff' && (
        <Card>
          <CardHeader>
            <CardTitle>Staff Schedules</CardTitle>
            <CardDescription>
              Set custom availability for individual staff members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {staffMembers.length === 0 ? (
              <p className="py-8 text-center text-gray-500">
                No staff members configured. Add staff first.
              </p>
            ) : (
              <>
                <div className="mb-6 space-y-2">
                  <Label>Select Staff Member</Label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select a staff member...</option>
                    {staffMembers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedStaffId && (
                  <>
                    <div className="mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useDefaultHours}
                          onChange={(e) => {
                            setUseDefaultHours(e.target.checked)
                            if (e.target.checked) {
                              setStaffSchedule({})
                            } else {
                              setStaffSchedule({ ...businessSchedule })
                            }
                          }}
                          className="h-4 w-4 rounded"
                        />
                        <span className="text-sm">Use default business hours</span>
                      </label>
                    </div>

                    {!useDefaultHours && (
                      <WeeklyScheduleEditor
                        schedule={staffSchedule}
                        onChange={setStaffSchedule}
                      />
                    )}

                    <div className="mt-6 flex justify-end">
                      <Button onClick={handleSaveStaffSchedule} disabled={saving}>
                        {saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Time Off / Holidays Tab */}
      {activeTab === 'overrides' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Time Off / Holidays</CardTitle>
              <CardDescription>
                Block off specific dates or set special hours
              </CardDescription>
            </div>
            <Button onClick={() => setShowOverrideDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Time Off
            </Button>
          </CardHeader>
          <CardContent>
            <OverridesList
              overrides={overrides.map((o) => ({
                id: o.override.id,
                date: o.override.date,
                isAvailable: o.override.isAvailable,
                startTime: o.override.startTime,
                endTime: o.override.endTime,
                reason: o.override.reason,
                staffName: o.staffMember?.name,
              }))}
              onDelete={handleDeleteOverride}
              isDeleting={deletingOverride}
            />
          </CardContent>
        </Card>
      )}

      <OverrideDialog
        open={showOverrideDialog}
        onOpenChange={setShowOverrideDialog}
        onSubmit={handleAddOverride}
        staff={staffMembers}
      />
    </div>
  )
}
