'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, X, CheckSquare, Square, Trash2 } from 'lucide-react'

interface ServiceToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  filteredCount: number
  totalCount: number
  allSelected: boolean
  selectedCount: number
  onSelectAll: () => void
  onBulkDelete: () => void
}

export function ServiceToolbar({
  searchQuery,
  onSearchChange,
  filteredCount,
  totalCount,
  allSelected,
  selectedCount,
  onSelectAll,
  onBulkDelete,
}: ServiceToolbarProps) {
  const t = useTranslations('dashboard.services')
  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Selection Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            className="gap-2"
          >
            {allSelected ? (
              <>
                <Square className="h-4 w-4" />
                <span className="hidden sm:inline">{t('deselectAll')}</span>
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">{t('selectAll')}</span>
                <span className="sm:hidden">{filteredCount}</span>
                <span className="hidden sm:inline">({filteredCount})</span>
              </>
            )}
          </Button>

          {selectedCount > 0 && (
            <span className="text-sm text-gray-600">
              {t('selected', { count: selectedCount })}
            </span>
          )}
        </div>

        {selectedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {t('deleteSelected', { count: selectedCount })}
          </Button>
        )}
      </div>

      {/* Search Results Info */}
      {searchQuery && (
        <div className="text-sm text-gray-600">
          {t('searchResults', { count: filteredCount })}
          {filteredCount < totalCount && (
            <span className="text-gray-400"> {t('searchResultsOf', { total: totalCount })}</span>
          )}
        </div>
      )}
    </div>
  )
}
