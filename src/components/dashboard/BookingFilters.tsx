'use client'

import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

const tabIds = ['all', 'unconfirmed', 'pending', 'confirmed', 'cancelled', 'completed'] as const

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
  const t = useTranslations('dashboard.bookings.filters')

  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="flex gap-1 rounded-lg border bg-gray-50 p-1 w-max md:w-auto md:flex-wrap">
        {tabIds.map((id) => (
          <button
            key={id}
            onClick={() => onFilterChange(id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              activeFilter === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {t(id)}
            {counts && counts[id] !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs',
                  activeFilter === id
                    ? 'bg-gray-100'
                    : 'bg-gray-200'
                )}
              >
                {counts[id]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
