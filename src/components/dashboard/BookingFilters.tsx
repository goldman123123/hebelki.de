'use client'

import { cn } from '@/lib/utils'

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'completed', label: 'Completed' },
]

interface BookingFiltersProps {
  activeFilter: string
  onFilterChange: (filter: string) => void
  counts?: Record<string, number>
}

export function BookingFilters({
  activeFilter,
  onFilterChange,
  counts,
}: BookingFiltersProps) {
  return (
    <div className="flex gap-1 rounded-lg border bg-gray-50 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onFilterChange(tab.id)}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            activeFilter === tab.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          {tab.label}
          {counts && counts[tab.id] !== undefined && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-xs',
                activeFilter === tab.id
                  ? 'bg-gray-100'
                  : 'bg-gray-200'
              )}
            >
              {counts[tab.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
