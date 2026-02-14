'use client'

/**
 * DocumentCard
 *
 * Reusable card component for displaying a document with:
 * - File icon based on type
 * - Title and filename
 * - Badges (audience, scope, processing status)
 * - Metadata (date, size, type, version)
 * - Actions dropdown (view, download, toggle knowledge, change scope, delete)
 */

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Trash2,
  Loader2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  File,
  X,
  Globe,
  Lock,
  Users,
  User,
  AlertTriangle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'
import { DocumentCardActions } from './DocumentCardActions'
import { ChangeScopeModal } from './ChangeScopeModal'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard:chatbot:data:DocumentCard')

export interface Document {
  id: string
  title: string
  originalFilename: string
  status: 'active' | 'deleted_pending' | 'deleted'
  uploadedBy: string | null
  labels: string[]
  audience: string
  scopeType: string
  scopeId: string | null
  dataClass: string
  containsPii: boolean
  customerName?: string | null
  createdAt: string
  updatedAt: string
  latestVersion: {
    id: string
    version: number
    fileSize: number | null
    createdAt: string
  } | null
  processingStatus: {
    id: string
    status: string
    stage?: string | null
    errorCode?: string | null
    attempts: number
    lastError: string | null
    completedAt: string | null
  } | null
}

interface DocumentCardProps {
  document: Document
  businessId: string
  showAudienceBadge?: boolean
  showScopeBadge?: boolean
  showProcessingBadge?: boolean
  showPiiBadge?: boolean
  onDelete?: () => void
  onUpdate?: () => void
}

// Status badge configuration
const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  queued: { label: 'Wartend', color: 'bg-gray-100 text-gray-700', icon: Clock },
  uploaded: { label: 'Hochgeladen', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  processing: { label: 'Verarbeitung...', color: 'bg-yellow-100 text-yellow-700', icon: RefreshCw },
  parsing: { label: 'Analysiert...', color: 'bg-yellow-100 text-yellow-700', icon: RefreshCw },
  chunking: { label: 'Aufteilen...', color: 'bg-yellow-100 text-yellow-700', icon: RefreshCw },
  embedding: { label: 'Indexieren...', color: 'bg-yellow-100 text-yellow-700', icon: RefreshCw },
  done: { label: 'Indexiert', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  failed: { label: 'Fehler', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  retry_ready: { label: 'Wiederholen', color: 'bg-orange-100 text-orange-700', icon: RefreshCw },
  cancelled: { label: 'Abgebrochen', color: 'bg-gray-100 text-gray-700', icon: X },
}

// Check if filename is a URL (scraped website)
function isUrlDocument(filename: string): boolean {
  return filename.startsWith('http://') || filename.startsWith('https://')
}

// Get file icon based on type
function getFileIcon(filename: string) {
  // Scraped website URLs get Globe icon
  if (isUrlDocument(filename)) {
    return <Globe className="h-8 w-8 text-blue-500" />
  }

  const ext = filename.toLowerCase().split('.').pop()
  switch (ext) {
    case 'pdf':
      return <FileText className="h-8 w-8 text-red-500" />
    case 'docx':
    case 'doc':
      return <FileText className="h-8 w-8 text-blue-500" />
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />
    case 'html':
    case 'htm':
      return <FileCode className="h-8 w-8 text-orange-500" />
    case 'txt':
      return <FileText className="h-8 w-8 text-gray-500" />
    default:
      return <File className="h-8 w-8 text-gray-400" />
  }
}

// Get file type label
function getFileTypeLabel(filename: string): string {
  // Scraped website URLs
  if (isUrlDocument(filename)) {
    return 'Website'
  }

  const ext = filename.toLowerCase().split('.').pop()
  const labels: Record<string, string> = {
    pdf: 'PDF',
    docx: 'Word',
    doc: 'Word',
    txt: 'Text',
    csv: 'CSV',
    xlsx: 'Excel',
    xls: 'Excel',
    html: 'HTML',
    htm: 'HTML',
  }
  return labels[ext || ''] || 'Datei'
}

// Format file size
function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let size = bytes
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export function DocumentCard({
  document: doc,
  businessId,
  showAudienceBadge = false,
  showScopeBadge = false,
  showProcessingBadge = true,
  showPiiBadge = false,
  onDelete,
  onUpdate,
}: DocumentCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [changeScopeModalOpen, setChangeScopeModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const status = doc.processingStatus?.status || 'queued'
  const config = statusConfig[status] || statusConfig.queued
  const StatusIcon = config.icon

  const handleDelete = async () => {
    setDeleting(true)

    try {
      const response = await fetch(
        `/api/documents/${doc.id}?businessId=${businessId}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (response.ok) {
        toast.success('Dokument wird gelöscht')
        setDeleteDialogOpen(false)
        onDelete?.()
      } else {
        throw new Error(data.error || 'Fehler beim Löschen')
      }
    } catch (error) {
      log.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler beim Löschen')
    } finally {
      setDeleting(false)
    }
  }

  // Callback for when dataClass or scope changes
  const handleDocumentChange = () => {
    // Both onDelete and onUpdate trigger a refresh
    onUpdate?.() || onDelete?.()
  }

  return (
    <>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0 mt-1">
              {getFileIcon(doc.originalFilename)}
            </div>
            <div className="min-w-0 flex-1">
              {/* Title and badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-gray-900 truncate">
                  {doc.title}
                </h3>

                {/* Website source badge */}
                {isUrlDocument(doc.originalFilename) && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                    <Globe className="h-3 w-3" />
                    Website
                  </span>
                )}

                {/* Audience badge */}
                {showAudienceBadge && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      doc.audience === 'public'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {doc.audience === 'public' ? (
                      <Globe className="h-3 w-3" />
                    ) : (
                      <Lock className="h-3 w-3" />
                    )}
                    {doc.audience === 'public' ? 'Öffentlich' : 'Intern'}
                  </span>
                )}

                {/* Scope badge */}
                {showScopeBadge && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      doc.scopeType === 'customer'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {doc.scopeType === 'customer' ? (
                      <>
                        <User className="h-3 w-3" />
                        {doc.customerName ? doc.customerName : 'Kunde'}
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3" />
                        Global
                      </>
                    )}
                  </span>
                )}

                {/* Processing status badge */}
                {showProcessingBadge && doc.dataClass === 'knowledge' && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
                    <StatusIcon className={`h-3 w-3 ${status.includes('ing') || status === 'retry_ready' ? 'animate-spin' : ''}`} />
                    {config.label}
                  </span>
                )}

                {/* Stored only badge */}
                {doc.dataClass === 'stored_only' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 px-2.5 py-0.5 text-xs font-medium">
                    <Clock className="h-3 w-3" />
                    Gespeichert
                  </span>
                )}

                {/* PII warning badge */}
                {showPiiBadge && doc.containsPii && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    Sensibel
                  </span>
                )}
              </div>

              {/* Filename */}
              <p className="mt-1 text-sm text-gray-500 truncate">
                {doc.originalFilename}
              </p>

              {/* Error message */}
              {status === 'failed' && doc.processingStatus?.lastError && (
                <p className="mt-1 text-sm text-red-600">
                  {doc.processingStatus.lastError}
                </p>
              )}

              {/* Metadata row */}
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                  {getFileTypeLabel(doc.originalFilename)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(doc.createdAt), {
                    addSuffix: true,
                    locale: de,
                  })}
                </span>
                {doc.latestVersion?.fileSize && (
                  <span>
                    {formatFileSize(doc.latestVersion.fileSize)}
                  </span>
                )}
                {doc.latestVersion && doc.latestVersion.version > 1 && (
                  <span>
                    Version {doc.latestVersion.version}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions dropdown */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <DocumentCardActions
              document={doc}
              businessId={businessId}
              onDataClassChange={handleDocumentChange}
              onScopeChange={handleDocumentChange}
              onDelete={() => setDeleteDialogOpen(true)}
              onOpenChangeScopeModal={() => setChangeScopeModalOpen(true)}
            />
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dokument löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie &quot;{doc.title}&quot; wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Löschen...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Löschen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Scope Modal */}
      <ChangeScopeModal
        open={changeScopeModalOpen}
        onOpenChange={setChangeScopeModalOpen}
        document={doc}
        businessId={businessId}
        onSuccess={handleDocumentChange}
      />
    </>
  )
}
