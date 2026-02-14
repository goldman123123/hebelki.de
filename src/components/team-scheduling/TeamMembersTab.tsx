'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/forms'
import { StaffCard } from './StaffCard'
import { InlineStaffForm } from './InlineStaffForm'
import { Plus, Loader2, Shield } from 'lucide-react'
import Link from 'next/link'

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

interface TeamMembersTabProps {
  staffMembers: StaffMember[]
  services: Service[]
  businessSchedule: WeeklySchedule
  onRefresh: () => void
}

export function TeamMembersTab({
  staffMembers,
  services,
  businessSchedule,
  onRefresh,
}: TeamMembersTabProps) {
  const [creatingNew, setCreatingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [deleteStaff, setDeleteStaff] = useState<StaffMember | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  async function fetchStaffWithServices(staffId: string): Promise<StaffMember | null> {
    const res = await fetch(`/api/admin/staff/${staffId}`)
    const data = await res.json()
    return data.staff
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

  async function handleCreate(data: StaffFormData) {
    setIsSaving(true)
    try {
      // Create staff
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          title: data.title,
          bio: data.bio,
          avatarUrl: data.avatarUrl,
          isActive: data.isActive,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        const staffId = result.staff.id

        // Assign services
        if (data.serviceIds && data.serviceIds.length > 0) {
          await fetch(`/api/admin/staff/${staffId}/services`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceIds: data.serviceIds }),
          })
        }

        // Create schedule if custom
        if (!data.useDefaultHours && Object.keys(data.schedule).length > 0) {
          const createRes = await fetch('/api/admin/availability/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Staff Schedule',
              staffId: staffId,
              isDefault: true,
            }),
          })
          const templateData = await createRes.json()

          await fetch(`/api/admin/availability/templates/${templateData.template.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slots: scheduleToSlots(data.schedule) }),
          })
        }

        setCreatingNew(false)
        onRefresh()
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleEdit(data: StaffFormData) {
    if (!editingStaff) return

    setIsSaving(true)
    try {
      // Update staff basic info
      const res = await fetch(`/api/admin/staff/${editingStaff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          title: data.title,
          bio: data.bio,
          avatarUrl: data.avatarUrl,
          isActive: data.isActive,
        }),
      })

      if (res.ok) {
        // Update services
        await fetch(`/api/admin/staff/${editingStaff.id}/services`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceIds: data.serviceIds || [] }),
        })

        // Update schedule
        const templatesRes = await fetch(`/api/admin/availability/templates?staffId=${editingStaff.id}`)
        const templatesData = await templatesRes.json()
        const staffTemplate = templatesData.templates?.find((t: { isDefault: boolean; id: string }) => t.isDefault)

        if (data.useDefaultHours) {
          // Delete staff-specific template if exists
          if (staffTemplate) {
            await fetch(`/api/admin/availability/templates/${staffTemplate.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slots: [] }),
            })
          }
        } else {
          // Create or update custom schedule
          if (!staffTemplate) {
            const createRes = await fetch('/api/admin/availability/templates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: 'Staff Schedule',
                staffId: editingStaff.id,
                isDefault: true,
              }),
            })
            const templateData = await createRes.json()

            await fetch(`/api/admin/availability/templates/${templateData.template.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slots: scheduleToSlots(data.schedule) }),
            })
          } else {
            await fetch(`/api/admin/availability/templates/${staffTemplate.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slots: scheduleToSlots(data.schedule) }),
            })
          }
        }

        setEditingId(null)
        setEditingStaff(null)
        onRefresh()
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteStaff) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/staff/${deleteStaff.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setDeleteStaff(null)
        onRefresh()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleToggleActive(member: StaffMember) {
    await fetch(`/api/admin/staff/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !member.isActive }),
    })
    onRefresh()
  }

  async function handleEditClick(member: StaffMember) {
    const staffWithServices = await fetchStaffWithServices(member.id)
    if (staffWithServices) {
      setEditingId(member.id)
      setEditingStaff(staffWithServices)
    }
  }

  return (
    <div>
      <div className="mb-6 flex justify-end gap-2">
        <Link href="/team-scheduling/capabilities">
          <Button variant="outline">
            <Shield className="mr-2 h-4 w-4" />
            KI-Berechtigungen
          </Button>
        </Link>
        <Button
          onClick={() => setCreatingNew(true)}
          disabled={creatingNew || editingId !== null}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Staff
        </Button>
      </div>

      {/* New Staff Form */}
      {creatingNew && (
        <InlineStaffForm
          staff={null}
          services={services}
          businessSchedule={businessSchedule}
          onSave={handleCreate}
          onCancel={() => setCreatingNew(false)}
          isSaving={isSaving}
        />
      )}

      {/* Staff List */}
      {staffMembers.length === 0 && !creatingNew ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
          <p className="text-gray-500 mb-4">No staff members configured yet.</p>
          <Button onClick={() => setCreatingNew(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Team Member
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staffMembers.map((member) => (
            <div key={member.id}>
              {editingId === member.id && editingStaff ? (
                <InlineStaffForm
                  staff={editingStaff}
                  services={services}
                  businessSchedule={businessSchedule}
                  onSave={handleEdit}
                  onCancel={() => {
                    setEditingId(null)
                    setEditingStaff(null)
                  }}
                  isSaving={isSaving}
                />
              ) : (
                <StaffCard
                  staff={member}
                  services={services}
                  onEdit={() => handleEditClick(member)}
                  onDelete={() => setDeleteStaff(member)}
                  onToggleActive={() => handleToggleActive(member)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteStaff}
        onOpenChange={(open) => !open && setDeleteStaff(null)}
        title="Delete Staff Member"
        description={`Are you sure you want to delete "${deleteStaff?.name}"? This will hide them from booking but preserve historical data.`}
        onConfirm={handleDelete}
        isConfirming={isDeleting}
        confirmLabel="Delete"
      />
    </div>
  )
}
