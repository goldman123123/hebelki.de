'use client'

/**
 * DocumentList
 *
 * Filterable document list with search, type filter, and status filter.
 * Uses DocumentCard for rendering each document.
 * Handles empty states and filter results.
 */

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  X,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DocumentCard, Document } from './DocumentCard'

export type DataPurpose = 'chatbot' | 'intern' | 'kunden' | 'daten'

interface DocumentListProps {
  documents: Document[]
  businessId: string
  purpose: DataPurpose
  loading?: boolean
  onRefresh?: () => void
}

// Empty state icons per purpose
const EMPTY_ICONS: Record<DataPurpose, React.ElementType> = {
  chatbot: FileText,
  intern: FileText,
  kunden: FileText,
  daten: FileSpreadsheet,
}

// Empty state title keys per purpose
const EMPTY_TITLE_KEYS: Record<DataPurpose, string> = {
  chatbot: 'emptyChatbot',
  intern: 'emptyIntern',
  kunden: 'emptyKunden',
  daten: 'emptyDaten',
}

// Empty state description keys per purpose
const EMPTY_DESC_KEYS: Record<DataPurpose, string> = {
  chatbot: 'emptyChatbotDesc',
  intern: 'emptyInternDesc',
  kunden: 'emptyKundenDesc',
  daten: 'emptyDatenDesc',
}

export function DocumentList({
  documents,
  businessId,
  purpose,
  loading,
  onRefresh,
}: DocumentListProps) {
  const t = useTranslations('dashboard.chatbot.data.list')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const typeFilterOptions = purpose === 'daten'
    ? [
        { value: 'all', label: t('allTypes') },
        { value: 'csv', label: 'CSV' },
        { value: 'xlsx,xls', label: 'Excel' },
      ]
    : [
        { value: 'all', label: t('allTypes') },
        { value: 'pdf', label: 'PDF' },
        { value: 'docx,doc', label: 'Word' },
        { value: 'txt', label: 'Text' },
        { value: 'html,htm', label: 'HTML' },
        { value: 'website', label: 'Website' },
      ]

  const statusFilterOptions = [
    { value: 'all', label: t('allStatuses') },
    { value: 'done', label: t('statusIndexed') },
    { value: 'processing', label: t('statusProcessing') },
    { value: 'failed', label: t('statusError') },
  ]

  const showStatusFilter = purpose !== 'daten' // Daten tab has no processing status

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Search filter
      const matchesSearch = !searchQuery.trim() || (
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.customerName && doc.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
      )

      // Type filter
      let matchesType = typeFilter === 'all'
      if (!matchesType) {
        if (typeFilter === 'website') {
          // Website filter: check if originalFilename is a URL
          matchesType = doc.originalFilename.startsWith('http://') || doc.originalFilename.startsWith('https://')
        } else {
          // Extension-based filter
          matchesType = typeFilter.split(',').some(ext =>
            doc.originalFilename.toLowerCase().endsWith(`.${ext}`)
          )
        }
      }

      // Status filter (only for knowledge documents)
      let matchesStatus = true
      if (showStatusFilter && statusFilter !== 'all') {
        const docStatus = doc.processingStatus?.status || 'queued'
        if (statusFilter === 'processing') {
          matchesStatus = ['queued', 'uploaded', 'processing', 'parsing', 'chunking', 'embedding'].includes(docStatus)
        } else {
          matchesStatus = docStatus === statusFilter
        }
      }

      return matchesSearch && matchesType && matchesStatus
    })
  }, [documents, searchQuery, typeFilter, statusFilter, showStatusFilter])

  const hasActiveFilters = searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
  const EmptyIcon = EMPTY_ICONS[purpose]

  // Determine which badges to show based on purpose
  const getBadgeProps = () => {
    switch (purpose) {
      case 'chatbot':
        return { showProcessingBadge: true }
      case 'intern':
        return { showProcessingBadge: true }
      case 'kunden':
        return { showProcessingBadge: true, showScopeBadge: true }
      case 'daten':
        return { showPiiBadge: true, showProcessingBadge: false }
    }
  }

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('loadingDocuments')}</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters (only show if there are documents) */}
      {documents.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder={purpose === 'kunden' ? t('searchByNameOrCustomer') : t('searchDocuments')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Type Filter Dropdown */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 px-3 pr-8 border border-gray-200 rounded-md bg-white text-sm font-medium text-gray-700 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {typeFilterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Status Filter Dropdown (only for knowledge) */}
          {showStatusFilter && (
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 pr-8 border border-gray-200 rounded-md bg-white text-sm font-medium text-gray-700 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {statusFilterOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
      )}

      {/* Results count (when filtering) */}
      {hasActiveFilters && documents.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {t('documentsFound', { count: filteredDocuments.length })}
            {filteredDocuments.length < documents.length && (
              <span className="text-gray-400"> {t('ofTotal', { total: documents.length })}</span>
            )}
          </span>
          <button
            onClick={() => {
              setSearchQuery('')
              setTypeFilter('all')
              setStatusFilter('all')
            }}
            className="text-primary hover:text-primary/80 font-medium"
          >
            {t('resetFilters')}
          </button>
        </div>
      )}

      {/* Document List */}
      {documents.length === 0 ? (
        // No documents at all
        <Card className="p-12 text-center">
          <EmptyIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {t(EMPTY_TITLE_KEYS[purpose])}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {t(EMPTY_DESC_KEYS[purpose])}
          </p>
        </Card>
      ) : filteredDocuments.length === 0 ? (
        // No matches for current filters
        <Card className="p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {t('noMatchingDocuments')}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {t('noMatchingDesc')}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearchQuery('')
              setTypeFilter('all')
              setStatusFilter('all')
            }}
          >
            <X className="mr-2 h-4 w-4" />
            {t('resetFilters')}
          </Button>
        </Card>
      ) : (
        // Show documents
        <div className="space-y-3">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              businessId={businessId}
              onDelete={onRefresh}
              onUpdate={onRefresh}
              {...getBadgeProps()}
            />
          ))}
        </div>
      )}
    </div>
  )
}
