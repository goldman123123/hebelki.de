'use client'

/**
 * Customer Documents Tab
 *
 * Lists customer-scoped documents and allows upload
 */

import { useState, useEffect, useCallback, useRef } from 'react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Upload,
  Trash2,
  Loader2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  X,
  File,
  Eye,
  Download,
  MoreVertical,
  Lock,
  Globe,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { UploadModal } from '@/components/documents/UploadModal'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard:customers:[id]:CustomerDocumentsTab')

interface Document {
  id: string
  title: string
  originalFilename: string
  status: string
  uploadedBy: string | null
  labels: string[]
  audience: string
  scopeType: string
  scopeId: string | null
  dataClass: string
  containsPii: boolean
  createdAt: string
  updatedAt: string
  customerName: string | null
  latestVersion: {
    id: string
    version: number
    fileSize: number | null
    createdAt: string
  } | null
  processingStatus: {
    id: string
    status: string
    stage: string | null
    errorCode: string | null
    attempts: number
    lastError: string | null
    completedAt: string | null
  } | null
}

interface CustomerDocumentsTabProps {
  customerId: string
  customerName: string
  businessId: string
}

// Status badge configuration (colors and icons only - labels come from translations)
const DOC_STATUS_COLORS: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-700',
  uploaded: 'bg-blue-100 text-blue-700',
  processing: 'bg-yellow-100 text-yellow-700',
  parsing: 'bg-yellow-100 text-yellow-700',
  chunking: 'bg-yellow-100 text-yellow-700',
  embedding: 'bg-yellow-100 text-yellow-700',
  done: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  stored_only: 'bg-gray-100 text-gray-700',
}

const DOC_STATUS_ICONS: Record<string, React.ElementType> = {
  queued: Clock,
  uploaded: Upload,
  processing: RefreshCw,
  parsing: RefreshCw,
  chunking: RefreshCw,
  embedding: RefreshCw,
  done: CheckCircle2,
  failed: AlertCircle,
  stored_only: File,
}

const DOC_STATUS_KEYS: Record<string, string> = {
  queued: 'docStatusQueued',
  uploaded: 'docStatusUploaded',
  processing: 'docStatusProcessing',
  parsing: 'docStatusParsing',
  chunking: 'docStatusChunking',
  embedding: 'docStatusEmbedding',
  done: 'docStatusDone',
  failed: 'docStatusFailed',
  stored_only: 'docStatusStoredOnly',
}

// Get file icon based on type
function getFileIcon(filename: string) {
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
  return labels[ext || ''] || ''
}

export function CustomerDocumentsTab({
  customerId,
  customerName,
  businessId,
}: CustomerDocumentsTabProps) {
  const t = useTranslations('dashboard.customers.detail')
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<Document | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const pollingRef = useRef<Record<string, NodeJS.Timeout>>({})

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/documents`)
      const data = await response.json()

      if (response.ok && data.documents) {
        setDocuments(data.documents)

        // Start polling for documents that are still processing
        data.documents.forEach((doc: Document) => {
          const status = doc.processingStatus?.status
          if (status && !['done', 'failed', 'cancelled'].includes(status)) {
            startPolling(doc.processingStatus!.id)
          }
        })
      }
    } catch (error) {
      log.error('Failed to fetch documents:', error)
      toast.error(t('errorLoadingDocuments'))
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    fetchDocuments()

    return () => {
      Object.values(pollingRef.current).forEach(clearInterval)
    }
  }, [fetchDocuments])

  // Start polling for a job
  const startPolling = (jobId: string) => {
    if (pollingRef.current[jobId]) return

    pollingRef.current[jobId] = setInterval(async () => {
      try {
        const response = await fetch(`/api/documents/pdf/jobs/${jobId}?businessId=${businessId}`)
        const job = await response.json()

        if (['done', 'failed', 'cancelled'].includes(job.status)) {
          clearInterval(pollingRef.current[jobId])
          delete pollingRef.current[jobId]
          await fetchDocuments()

          if (job.status === 'done') {
            toast.success(t('documentProcessed'))
          } else if (job.status === 'failed') {
            toast.error(t('processingFailed'))
          }
        }
      } catch (error) {
        log.error('Polling error:', error)
      }
    }, 2000)
  }

  const handleDelete = async () => {
    if (!deleteDialog) return

    setDeleting(true)
    try {
      const response = await fetch(
        `/api/documents/${deleteDialog.id}?businessId=${businessId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        toast.success(t('documentDeleted'))
        setDeleteDialog(null)
        await fetchDocuments()
      } else {
        const data = await response.json()
        throw new Error(data.error || t('errorDeletingDocument'))
      }
    } catch (error) {
      log.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : t('errorDeletingDocument'))
    } finally {
      setDeleting(false)
    }
  }

  const handleViewOrDownload = async (doc: Document, action: 'view' | 'download') => {
    setActionLoading(`${action}-${doc.id}`)
    try {
      const response = await fetch(`/api/documents/${doc.id}?businessId=${businessId}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || t('errorLoadingDocument'))
      if (!data.downloadUrl) throw new Error(t('noDownloadUrl'))
      if (action === 'view') {
        window.open(data.downloadUrl, '_blank')
      } else {
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
      toast.error(error instanceof Error ? error.message : t('errorLoadingDocument'))
    } finally {
      setActionLoading(null)
    }
  }

  const formatFileSize = (bytes: number | null): string => {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('customerDocuments')}</h2>
          <p className="text-sm text-gray-500">
            {t('customerDocumentsDesc')}
          </p>
        </div>
        <Button onClick={() => setUploadModalOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          {t('uploadDocument')}
        </Button>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {t('noDocuments')}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {t('noDocumentsDesc')}
          </p>
          <Button className="mt-4" onClick={() => setUploadModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            {t('uploadFirst')}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            // Determine status display
            let displayStatus = doc.processingStatus?.status || 'queued'
            if (doc.dataClass === 'stored_only') {
              displayStatus = 'stored_only'
            }
            const statusColor = DOC_STATUS_COLORS[displayStatus] || DOC_STATUS_COLORS.queued
            const StatusIcon = DOC_STATUS_ICONS[displayStatus] || DOC_STATUS_ICONS.queued
            const statusKey = DOC_STATUS_KEYS[displayStatus]

            return (
              <Card key={doc.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getFileIcon(doc.originalFilename)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900 truncate">
                          {doc.title}
                        </h3>
                        {/* Audience badge */}
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
                          {doc.audience === 'public' ? t('audiencePublic') : t('audienceInternal')}
                        </span>
                        {/* Status badge */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
                        >
                          <StatusIcon
                            className={`h-3 w-3 ${
                              displayStatus.includes('ing') ? 'animate-spin' : ''
                            }`}
                          />
                          {statusKey ? t(statusKey) : displayStatus}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 truncate">
                        {doc.originalFilename}
                      </p>
                      {doc.processingStatus?.status === 'failed' &&
                        doc.processingStatus.lastError && (
                          <p className="mt-1 text-sm text-red-600">
                            {doc.processingStatus.lastError}
                          </p>
                        )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                          {getFileTypeLabel(doc.originalFilename) || t('fileTypeDefault')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(doc.createdAt), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </span>
                        {doc.latestVersion?.fileSize && (
                          <span>{formatFileSize(doc.latestVersion.fileSize)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={doc.status === 'deleted_pending' || actionLoading !== null}
                          className="h-8 w-8 p-0"
                        >
                          {actionLoading?.endsWith(doc.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                          <span className="sr-only">{t('actions')}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleViewOrDownload(doc, 'view')}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('view')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewOrDownload(doc, 'download')}>
                          <Download className="mr-2 h-4 w-4" />
                          {t('download')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteDialog(doc)}
                          variant="destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        businessId={businessId}
        defaultScopeType="customer"
        defaultScopeId={customerId}
        defaultCustomerName={customerName}
        onUploadComplete={fetchDocuments}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDocument')}</DialogTitle>
            <DialogDescription>
              {t('deleteDocumentDesc', { title: deleteDialog?.title || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(null)}
              disabled={deleting}
            >
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('delete')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
