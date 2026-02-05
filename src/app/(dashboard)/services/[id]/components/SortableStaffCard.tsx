'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, User } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface StaffAssignment {
  staffId: string
  name: string
  email: string | null
  sortOrder: number
  isActive: boolean
}

interface SortableStaffCardProps {
  assignment: StaffAssignment
  priority: number
  onToggleActive: () => void
}

export function SortableStaffCard({
  assignment,
  priority,
  onToggleActive
}: SortableStaffCardProps) {
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
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-4 ${!assignment.isActive ? 'opacity-50 bg-muted/50' : ''}`}
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Staff Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium truncate">{assignment.name}</span>
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              Priority {priority}
            </Badge>
          </div>
          {assignment.email && (
            <p className="text-sm text-muted-foreground truncate">
              {assignment.email}
            </p>
          )}
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">Active</span>
          <Switch
            checked={assignment.isActive}
            onCheckedChange={onToggleActive}
          />
        </div>
      </div>
    </Card>
  )
}
