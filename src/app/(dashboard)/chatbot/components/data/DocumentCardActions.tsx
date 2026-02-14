'use client'

/**
 * DocumentCardActions
 *
 * Dropdown menu with all document actions:
 * - View (open in new tab)
 * - Download
 * - Toggle Knowledge (include/exclude from chatbot)
 * - Change Scope (move between tabs)
 * - Delete
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreVertical,
  Eye,
  Download,
  Bot,
  BotOff,
  ArrowRightLeft,
  Trash2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Document } from './DocumentCard'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard:chatbot:data:DocumentCardActions')

interface DocumentCardActionsProps {
  document: Document
  businessId: string
  onDataClassChange?: () => void
  onScopeChange?: () => void
  onDelete?: () => void
  onOpenChangeScopeModal?: () => void
}

export function DocumentCardActions({
  document: doc,
  businessId,
  onDataClassChange,
  onScopeChange,
  onDelete,
  onOpenChangeScopeModal,
}: DocumentCardActionsProps) {
  const t = useTranslations('dashboard.chatbot.data.actions')
  const [loading, setLoading] = useState<string | null>(null)

  const isKnowledge = doc.dataClass === 'knowledge'

  // Fetch download URL and open/download
  const handleViewOrDownload = async (action: 'view' | 'download') => {
    setLoading(action)

    try {
      const response = await fetch(
        `/api/documents/${doc.id}?businessId=${businessId}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('loadError'))
      }

      if (!data.downloadUrl) {
        throw new Error(t('noDownloadUrl'))
      }

      if (action === 'view') {
        // Open in new tab
        window.open(data.downloadUrl, '_blank')
      } else {
        // Trigger download
        const link = document.createElement('a')
        link.href = data.downloadUrl
        link.download = doc.originalFilename
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      log.error(`${action} error:`, error)
      toast.error(error instanceof Error ? error.message : t('loadError'))
    } finally {
      setLoading(null)
    }
  }

  // Toggle dataClass between knowledge and stored_only
  const handleToggleKnowledge = async () => {
    setLoading('toggle')

    const newDataClass = isKnowledge ? 'stored_only' : 'knowledge'

    try {
      const response = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          dataClass: newDataClass,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('updateError'))
      }

      if (newDataClass === 'knowledge') {
        toast.success(t('indexingDocument'))
      } else {
        toast.success(t('removedFromKnowledge'))
      }

      onDataClassChange?.()
    } catch (error) {
      log.error('Toggle knowledge error:', error)
      toast.error(error instanceof Error ? error.message : t('updateError'))
    } finally {
      setLoading(null)
    }
  }

  const isLoading = loading !== null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={doc.status === 'deleted_pending' || isLoading}
          className="h-8 w-8 p-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
          <span className="sr-only">{t('actionsLabel')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* View */}
        <DropdownMenuItem
          onClick={() => handleViewOrDownload('view')}
          disabled={loading === 'view'}
        >
          {loading === 'view' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Eye className="mr-2 h-4 w-4" />
          )}
          {t('view')}
        </DropdownMenuItem>

        {/* Download */}
        <DropdownMenuItem
          onClick={() => handleViewOrDownload('download')}
          disabled={loading === 'download'}
        >
          {loading === 'download' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {t('download')}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Toggle Knowledge */}
        <DropdownMenuItem
          onClick={handleToggleKnowledge}
          disabled={loading === 'toggle'}
        >
          {loading === 'toggle' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isKnowledge ? (
            <BotOff className="mr-2 h-4 w-4" />
          ) : (
            <Bot className="mr-2 h-4 w-4" />
          )}
          {isKnowledge ? t('removeFromChatbot') : t('useInChatbot')}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Change Scope */}
        <DropdownMenuItem onClick={onOpenChangeScopeModal}>
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          {t('move')}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Delete */}
        <DropdownMenuItem
          onClick={onDelete}
          variant="destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
