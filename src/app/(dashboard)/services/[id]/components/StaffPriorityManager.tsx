'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { SortableStaffCard } from './SortableStaffCard'

interface StaffAssignment {
  staffId: string
  name: string
  email: string | null
  sortOrder: number
  isActive: boolean
}

export function StaffPriorityManager({ serviceId }: { serviceId: string }) {
  const [staff, setStaff] = useState<StaffAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    fetchStaff()
  }, [serviceId])

  async function fetchStaff() {
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/staff`)

      if (!res.ok) {
        throw new Error('Failed to fetch staff')
      }

      const data = await res.json()
      setStaff(data.staff || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = staff.findIndex(s => s.staffId === active.id)
    const newIndex = staff.findIndex(s => s.staffId === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(staff, oldIndex, newIndex)

    // Update sortOrder to match new positions (1-indexed)
    const updated = reordered.map((s, index) => ({
      ...s,
      sortOrder: index + 1
    }))

    // Optimistically update UI
    setStaff(updated)

    // Save to backend
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/staff`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffPriority: updated.map(s => ({
            staffId: s.staffId,
            sortOrder: s.sortOrder,
            isActive: s.isActive
          }))
        })
      })

      if (!res.ok) {
        throw new Error('Failed to update priority')
      }
    } catch (err) {
      // Revert on error
      fetchStaff()
      setError(err instanceof Error ? err.message : 'Failed to update priority')
    }
  }

  async function toggleActive(staffId: string) {
    const updated = staff.map(s =>
      s.staffId === staffId ? { ...s, isActive: !s.isActive } : s
    )

    // Optimistically update UI
    setStaff(updated)

    // Save to backend
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/staff`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffPriority: updated.map(s => ({
            staffId: s.staffId,
            sortOrder: s.sortOrder,
            isActive: s.isActive
          }))
        })
      })

      if (!res.ok) {
        throw new Error('Failed to update staff status')
      }
    } catch (err) {
      // Revert on error
      fetchStaff()
      setError(err instanceof Error ? err.message : 'Failed to update staff status')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Priority</CardTitle>
        <CardDescription>
          Drag staff members to set priority order. Top staff are tried first for automatic assignment when customers book via chatbot.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {staff.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No staff assigned to this service yet.</p>
            <p className="text-sm mt-2">Assign staff to this service from the Staff page.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={staff.map(s => s.staffId)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {staff.map((assignment, index) => (
                  <SortableStaffCard
                    key={assignment.staffId}
                    assignment={assignment}
                    priority={index + 1}
                    onToggleActive={() => toggleActive(assignment.staffId)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  )
}
