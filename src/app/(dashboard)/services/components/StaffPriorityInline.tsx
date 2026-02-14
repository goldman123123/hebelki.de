'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, AlertCircle, GripVertical, User } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface StaffAssignment {
  staffId: string
  name: string
  email: string | null
  sortOrder: number
  isActive: boolean
}

function SortableStaffRow({ assignment, priority, onToggleActive, activeLabel }: {
  assignment: StaffAssignment
  priority: number
  onToggleActive: () => void
  activeLabel: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: assignment.staffId,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-md border bg-white ${
        !assignment.isActive ? 'opacity-50 bg-gray-50' : ''
      }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>

      {/* Staff Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium truncate">{assignment.name}</span>
          <Badge variant="secondary" className="text-xs flex-shrink-0">
            #{priority}
          </Badge>
        </div>
        {assignment.email && (
          <p className="text-xs text-gray-500 truncate ml-5">{assignment.email}</p>
        )}
      </div>

      {/* Active Toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-gray-500">{activeLabel}</span>
        <Switch
          checked={assignment.isActive}
          onCheckedChange={onToggleActive}
        />
      </div>
    </div>
  )
}

export function StaffPriorityInline({ serviceId }: { serviceId: string }) {
  const t = useTranslations('dashboard.services')
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (staff.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-md border border-dashed">
        <p>{t('noStaff')}</p>
        <p className="text-xs mt-1">{t('noStaffHint')}</p>
      </div>
    )
  }

  return (
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
            <SortableStaffRow
              key={assignment.staffId}
              assignment={assignment}
              priority={index + 1}
              onToggleActive={() => toggleActive(assignment.staffId)}
              activeLabel={t('staffActive')}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
