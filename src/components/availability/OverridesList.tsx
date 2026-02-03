'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateShort } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

interface Override {
  id: string
  date: string
  isAvailable: boolean | null
  startTime: string | null
  endTime: string | null
  reason: string | null
  staffName?: string | null
}

interface OverridesListProps {
  overrides: Override[]
  onDelete: (id: string) => void
  isDeleting?: string | null
}

export function OverridesList({ overrides, onDelete, isDeleting }: OverridesListProps) {
  if (overrides.length === 0) {
    return (
      <p className="py-8 text-center text-gray-500">
        No time off or holidays scheduled.
      </p>
    )
  }

  // Sort by date
  const sorted = [...overrides].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Filter to only show future dates
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcoming = sorted.filter(o => new Date(o.date) >= today)
  const past = sorted.filter(o => new Date(o.date) < today)

  return (
    <div className="divide-y rounded-lg border">
      {upcoming.map((override) => (
        <div
          key={override.id}
          className="flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-4">
            <div className="min-w-[100px]">
              <p className="font-medium">{formatDateShort(override.date)}</p>
              <p className="text-sm text-gray-500">
                {new Date(override.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
            </div>
            <div>
              {override.isAvailable ? (
                <Badge className="bg-yellow-100 text-yellow-800">
                  {override.startTime} - {override.endTime}
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">
                  Closed
                </Badge>
              )}
              {override.staffName && (
                <Badge variant="outline" className="ml-2">
                  {override.staffName}
                </Badge>
              )}
              {override.reason && (
                <p className="mt-1 text-sm text-gray-500">{override.reason}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(override.id)}
            disabled={isDeleting === override.id}
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {past.length > 0 && (
        <div className="bg-gray-50 p-4">
          <p className="mb-2 text-xs font-medium uppercase text-gray-500">
            Past ({past.length})
          </p>
          <div className="space-y-2 text-sm text-gray-400">
            {past.slice(-5).map((override) => (
              <div key={override.id} className="flex items-center gap-2">
                <span>{formatDateShort(override.date)}</span>
                <span>-</span>
                <span>{override.reason || (override.isAvailable ? 'Custom hours' : 'Closed')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
