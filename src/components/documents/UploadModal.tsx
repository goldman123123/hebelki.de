'use client'

/**
 * Upload Modal
 *
 * Reusable modal for uploading documents with classification options
 * Context-driven defaults for scope (global vs customer)
 */

import { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Upload,
  Loader2,
  X,
  File,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  UploadClassificationPanel,
  ClassificationOptions,
} from './UploadClassificationPanel'
import { createLogger } from '@/lib/logger'

const log = createLogger('ui:documents:UploadModal')

export interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
  // Context-driven defaults
  defaultScopeType?: 'global' | 'customer'
  defaultScopeId?: string
  defaultCustomerName?: string
  onUploadComplete?: () => void
}

// Supported file types
const SUPPORTED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'text/html': 'html',
}

const ACCEPT_EXTENSIONS = '.pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,.html,.htm'

const SUPPORTED_TYPE_CHIPS = [
  { type: 'PDF', icon: FileText, color: 'text-red-500' },
  { type: 'Word', icon: FileText, color: 'text-blue-500' },
  { type: 'Excel', icon: FileSpreadsheet, color: 'text-green-500' },
  { type: 'CSV', icon: FileSpreadsheet, color: 'text-green-600' },
  { type: 'TXT', icon: FileText, color: 'text-gray-500' },
  { type: 'HTML', icon: FileCode, color: 'text-orange-500' },
]

// Get file icon based on type
function getFileIcon(filename: string) {
  const ext = filename.toLowerCase().split('.').pop()
  switch (ext) {
    case 'pdf':
      return <FileText className="h-6 w-6 text-red-500" />
    case 'docx':
    case 'doc':
      return <FileText className="h-6 w-6 text-blue-500" />
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <FileSpreadsheet className="h-6 w-6 text-green-500" />
    case 'html':
    case 'htm':
      return <FileCode className="h-6 w-6 text-orange-500" />
    case 'txt':
      return <FileText className="h-6 w-6 text-gray-500" />
    default:
      return <File className="h-6 w-6 text-gray-400" />
  }
}

// Format file size
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let size = bytes
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export function UploadModal({
  open,
  onOpenChange,
  businessId,
  defaultScopeType = 'global',
  defaultScopeId,
  defaultCustomerName,
  onUploadComplete,
}: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [classification, setClassification] = useState<ClassificationOptions>({
    useAsKnowledge: true,
    audience: 'public',
    scopeType: defaultScopeType,
    scopeId: defaultScopeId,
    dataClass: 'knowledge',
    containsPii: false,
  })

  const reset = useCallback(() => {
    setSelectedFile(null)
    setUploadComplete(false)
    setClassification({
      useAsKnowledge: true,
      audience: 'public',
      scopeType: defaultScopeType,
      scopeId: defaultScopeId,
      dataClass: 'knowledge',
      containsPii: false,
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [defaultScopeType, defaultScopeId])

  const handleClose = useCallback(() => {
    reset()
    onOpenChange(false)
  }, [reset, onOpenChange])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const validateAndSetFile = (file: File) => {
    const isSupported =
      SUPPORTED_TYPES[file.type] ||
      ACCEPT_EXTENSIONS.split(',').some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      )

    if (!isSupported) {
      toast.error(
        'Dateityp wird nicht unterstützt. Unterstützt: PDF, Word, Excel, CSV, TXT, HTML'
      )
      return
    }

    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('Datei ist zu groß (max. 50MB)')
      return
    }

    setSelectedFile(file)
    setUploadComplete(false)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)

    try {
      const title = selectedFile.name.replace(/\.[^.]+$/, '')

      // Step 1: Initialize upload
      const initResponse = await fetch('/api/documents/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          title,
          filename: selectedFile.name,
          contentType: selectedFile.type || 'application/octet-stream',
          // Include classification options
          audience: classification.audience,
          scopeType: classification.scopeType,
          scopeId: classification.scopeId,
          dataClass: classification.dataClass,
          containsPii: classification.containsPii,
        }),
      })

      const initData = await initResponse.json()

      if (!initResponse.ok) {
        throw new Error(initData.error || initData.message || 'Fehler beim Initialisieren')
      }

      // Step 2: Upload to R2
      const uploadResponse = await fetch(initData.uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type || 'application/octet-stream',
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Fehler beim Hochladen der Datei')
      }

      // Step 3: Mark upload as complete
      const completeResponse = await fetch('/api/documents/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          versionId: initData.versionId,
          fileSize: selectedFile.size,
        }),
      })

      const completeData = await completeResponse.json()

      if (!completeResponse.ok) {
        throw new Error(completeData.error || 'Fehler beim Abschließen')
      }

      setUploadComplete(true)
      toast.success(
        classification.dataClass === 'stored_only'
          ? 'Dokument gespeichert'
          : 'Dokument wird verarbeitet...'
      )

      // Close modal after short delay
      setTimeout(() => {
        handleClose()
        onUploadComplete?.()
      }, 1000)
    } catch (error) {
      log.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler beim Hochladen')
    } finally {
      setUploading(false)
    }
  }

  const title =
    defaultScopeType === 'customer'
      ? 'Kundendokument hochladen'
      : 'Dokument hochladen'

  const description =
    defaultScopeType === 'customer' && defaultCustomerName
      ? `Dokument für ${defaultCustomerName} hochladen`
      : 'Laden Sie ein Dokument für Ihren Chatbot hoch'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!selectedFile ? (
          // File selection view
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Supported types */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {SUPPORTED_TYPE_CHIPS.map(({ type, icon: Icon, color }) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-600"
                >
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  {type}
                </span>
              ))}
            </div>

            <Upload
              className={`mx-auto h-10 w-10 mb-3 ${
                isDragging ? 'text-primary' : 'text-gray-400'
              }`}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_EXTENSIONS}
              className="hidden"
              onChange={handleFileSelect}
            />

            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Datei auswählen
            </Button>

            <p className="mt-3 text-sm text-gray-500">
              oder Datei hierher ziehen
            </p>
          </div>
        ) : uploadComplete ? (
          // Upload complete view
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium text-gray-900">
              Upload abgeschlossen
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {classification.dataClass === 'stored_only'
                ? 'Dokument wurde gespeichert'
                : 'Dokument wird jetzt verarbeitet'}
            </p>
          </div>
        ) : (
          // Classification view
          <div>
            {/* Selected file info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
              {getFileIcon(selectedFile.name)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Classification panel */}
            <UploadClassificationPanel
              filename={selectedFile.name}
              businessId={businessId}
              defaultScopeType={defaultScopeType}
              defaultScopeId={defaultScopeId}
              customerName={defaultCustomerName}
              onChange={setClassification}
            />
          </div>
        )}

        {selectedFile && !uploadComplete && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Abbrechen
            </Button>
            <Button
              onClick={handleUpload}
              disabled={
                uploading ||
                // Require customer selection when scopeType is customer
                (classification.scopeType === 'customer' && !classification.scopeId)
              }
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Hochladen...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Hochladen
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
