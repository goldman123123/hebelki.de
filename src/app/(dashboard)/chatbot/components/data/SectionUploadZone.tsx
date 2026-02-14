'use client'

/**
 * SectionUploadZone
 *
 * Upload zone pre-configured for a specific purpose.
 * No classification choice needed - the purpose determines it.
 * For 'kunden': shows customer dropdown
 * For 'daten': restricts to CSV/Excel only
 */

import { useState, useRef, useCallback, useEffect } from 'react'
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
  AlertCircle,
  User,
  ChevronDown,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { DataPurpose } from './DocumentList'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard:chatbot:data:SectionUploadZone')

interface SectionUploadZoneProps {
  businessId: string
  purpose: DataPurpose
  onUploadComplete: () => void
}

// Upload states
type UploadStatus = 'idle' | 'dragging' | 'selected' | 'uploading' | 'complete' | 'error'

interface Customer {
  id: string
  name: string
  email: string | null
}

// File type configs per purpose
const purposeFileConfig: Record<DataPurpose, {
  accept: string
  types: Record<string, string>
  description: string
}> = {
  chatbot: {
    accept: '.pdf,.docx,.doc,.txt,.html,.htm',
    types: {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'text/plain': 'txt',
      'text/html': 'html',
    },
    description: 'PDF, Word, TXT, HTML · max. 50MB',
  },
  intern: {
    accept: '.pdf,.docx,.doc,.txt,.html,.htm',
    types: {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'text/plain': 'txt',
      'text/html': 'html',
    },
    description: 'PDF, Word, TXT, HTML · max. 50MB',
  },
  kunden: {
    accept: '.pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,.html,.htm',
    types: {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'text/plain': 'txt',
      'text/csv': 'csv',
      'application/csv': 'csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-excel': 'xls',
      'text/html': 'html',
    },
    description: 'PDF, Word, Excel, CSV, TXT, HTML · max. 50MB',
  },
  daten: {
    accept: '.csv,.xlsx,.xls',
    types: {
      'text/csv': 'csv',
      'application/csv': 'csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-excel': 'xls',
    },
    description: 'CSV, Excel · max. 50MB',
  },
}

// Classification options per purpose (fixed, no choice)
const purposeClassification: Record<DataPurpose, {
  audience: 'public' | 'internal'
  scopeType: 'global' | 'customer'
  dataClass: 'knowledge' | 'stored_only'
  containsPii: boolean
}> = {
  chatbot: {
    audience: 'public',
    scopeType: 'global',
    dataClass: 'knowledge',
    containsPii: false,
  },
  intern: {
    audience: 'internal',
    scopeType: 'global',
    dataClass: 'knowledge',
    containsPii: false,
  },
  kunden: {
    audience: 'internal',
    scopeType: 'customer',
    dataClass: 'knowledge',
    containsPii: true,
  },
  daten: {
    audience: 'internal',
    scopeType: 'global',
    dataClass: 'stored_only',
    containsPii: true,
  },
}

// Get file icon based on type
function getFileIcon(filename: string) {
  const ext = filename.toLowerCase().split('.').pop()
  switch (ext) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />
    case 'docx':
    case 'doc':
      return <FileText className="h-5 w-5 text-blue-500" />
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />
    case 'html':
    case 'htm':
      return <FileCode className="h-5 w-5 text-orange-500" />
    case 'txt':
      return <FileText className="h-5 w-5 text-gray-500" />
    default:
      return <File className="h-5 w-5 text-gray-400" />
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

export function SectionUploadZone({
  businessId,
  purpose,
  onUploadComplete,
}: SectionUploadZoneProps) {
  const t = useTranslations('dashboard.chatbot.data.upload')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileConfig = purposeFileConfig[purpose]
  const classification = purposeClassification[purpose]

  // State
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>()
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | undefined>()

  // Customer dropdown (only for kunden purpose)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)

  // Fetch customers when needed (for kunden purpose)
  const fetchCustomers = useCallback(async () => {
    if (purpose !== 'kunden' || customers.length > 0 || loadingCustomers) return

    setLoadingCustomers(true)
    try {
      const response = await fetch(`/api/admin/customers?businessId=${businessId}&limit=100`)
      const data = await response.json()
      if (response.ok && data.customers) {
        setCustomers(data.customers)
      }
    } catch (err) {
      log.error('Failed to fetch customers:', err)
    } finally {
      setLoadingCustomers(false)
    }
  }, [businessId, purpose, customers.length, loadingCustomers])

  // Load customers when component mounts (for kunden purpose)
  useEffect(() => {
    if (purpose === 'kunden') {
      fetchCustomers()
    }
  }, [purpose, fetchCustomers])

  // Reset state
  const reset = useCallback(() => {
    setStatus('idle')
    setFile(null)
    setSelectedCustomerId(undefined)
    setProgress(0)
    setError(undefined)
    setCustomerDropdownOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Validate and set file
  const validateAndSetFile = useCallback((f: File) => {
    const isSupported =
      fileConfig.types[f.type] ||
      fileConfig.accept.split(',').some((ext) =>
        f.name.toLowerCase().endsWith(ext)
      )

    if (!isSupported) {
      const fileTypes = purpose === 'daten' ? t('typesCsvExcel') : t('typesDocuments')
      toast.error(t('unsupportedType', { types: fileTypes }))
      return
    }

    const maxSize = 50 * 1024 * 1024
    if (f.size > maxSize) {
      toast.error(t('fileTooLarge'))
      return
    }

    setFile(f)
    setStatus('selected')
    setError(undefined)
  }, [fileConfig, purpose])

  // Drag handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (status === 'idle' || status === 'dragging') {
      setStatus('dragging')
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (status === 'dragging') {
      setStatus('idle')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setStatus('idle')

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }

  // File input handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  // Upload handler
  const handleUpload = async () => {
    if (!file) return

    // Validate customer selection for kunden purpose
    if (purpose === 'kunden' && !selectedCustomerId) {
      toast.error(t('selectCustomerRequired'))
      return
    }

    setStatus('uploading')
    setProgress(10)

    try {
      const title = file.name.replace(/\.[^.]+$/, '')

      // Step 1: Initialize upload
      setProgress(20)
      const initResponse = await fetch('/api/documents/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          title,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          audience: classification.audience,
          scopeType: classification.scopeType,
          scopeId: purpose === 'kunden' ? selectedCustomerId : undefined,
          dataClass: classification.dataClass,
          containsPii: classification.containsPii,
        }),
      })

      const initData = await initResponse.json()

      if (!initResponse.ok) {
        // Build detailed error message
        let errorMsg = initData.error || t('initError')

        // Append detailed message if present (from improved API)
        if (initData.message && initData.message !== initData.error) {
          errorMsg = `${errorMsg}: ${initData.message}`
        }

        // Include validation details if present (Zod errors)
        if (initData.details && Array.isArray(initData.details)) {
          const detailMsgs = initData.details.map((d: { path?: string[]; message?: string }) =>
            `${d.path?.join('.') || 'field'}: ${d.message || 'invalid'}`
          ).join(', ')
          errorMsg = `${errorMsg} (${detailMsgs})`
        }

        log.error('Upload init failed:', { status: initResponse.status, data: initData })
        throw new Error(errorMsg)
      }

      // Step 2: Upload to R2
      setProgress(40)
      const uploadResponse = await fetch(initData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      })

      if (!uploadResponse.ok) {
        throw new Error(t('r2UploadError'))
      }

      // Step 3: Mark upload as complete
      setProgress(80)
      const completeResponse = await fetch('/api/documents/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          versionId: initData.versionId,
          fileSize: file.size,
        }),
      })

      const completeData = await completeResponse.json()

      if (!completeResponse.ok) {
        throw new Error(completeData.error || t('completeError'))
      }

      setProgress(100)
      setStatus('complete')

      const message = classification.dataClass === 'stored_only'
        ? t('fileSaved')
        : t('processingDocument')
      toast.success(message)

      // Auto-collapse after delay
      setTimeout(() => {
        reset()
        onUploadComplete()
      }, 1500)

    } catch (err) {
      log.error('Upload error:', err)
      setStatus('error')
      setError(err instanceof Error ? err.message : t('uploadError'))
      toast.error(err instanceof Error ? err.message : t('uploadError'))
    }
  }

  // Get selected customer name
  const getSelectedCustomerName = () => {
    const customer = customers.find(c => c.id === selectedCustomerId)
    return customer?.name || t('selectCustomer')
  }

  // Render idle/dragging state (compact)
  if (status === 'idle' || status === 'dragging') {
    return (
      <div
        className={`border-2 border-dashed rounded-lg p-4 transition-all ${
          status === 'dragging'
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-gray-200 hover:border-gray-300 bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={fileConfig.accept}
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status === 'dragging' ? 'bg-primary/10' : 'bg-white'}`}>
              <Upload className={`h-5 w-5 ${status === 'dragging' ? 'text-primary' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {t('dragOrUpload')}
              </p>
              <p className="text-xs text-gray-500">
                {fileConfig.description}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t('selectFile')}
          </Button>
        </div>
      </div>
    )
  }

  // Render selected state (expanded with customer dropdown for kunden)
  if (status === 'selected') {
    return (
      <div
        className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5 space-y-4"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* File preview */}
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
          {file && getFileIcon(file.name)}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{file?.name}</p>
            <p className="text-xs text-gray-500">{file && formatFileSize(file.size)}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Customer dropdown (only for kunden purpose) */}
        {purpose === 'kunden' && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <User className="h-4 w-4 text-purple-600 flex-shrink-0" />
                <span className={`truncate ${selectedCustomerId ? 'text-gray-900' : 'text-gray-500'}`}>
                  {getSelectedCustomerName()}
                </span>
              </div>
              {loadingCustomers ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${customerDropdownOpen ? 'rotate-180' : ''}`} />
              )}
            </button>

            {customerDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {loadingCustomers ? (
                  <div className="p-3 text-center text-gray-500 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    {t('loadingCustomers')}
                  </div>
                ) : customers.length === 0 ? (
                  <div className="p-3 text-center text-gray-500 text-sm">
                    {t('noCustomersFound')}
                  </div>
                ) : (
                  customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(customer.id)
                        setCustomerDropdownOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                        selectedCustomerId === customer.id ? 'bg-primary/5' : ''
                      }`}
                    >
                      <User className="h-4 w-4 text-purple-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                        {customer.email && (
                          <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {!selectedCustomerId && (
              <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {t('selectCustomerRequired')}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={reset}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={purpose === 'kunden' && !selectedCustomerId}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t('upload')}
          </Button>
        </div>
      </div>
    )
  }

  // Render uploading state
  if (status === 'uploading') {
    return (
      <div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700">
              {t('uploading')}
            </p>
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render complete state
  if (status === 'complete') {
    return (
      <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-700">
              {t('uploadComplete')}
            </p>
            <p className="text-xs text-green-600">
              {file?.name}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Render error state
  if (status === 'error') {
    return (
      <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-700">
                {t('uploadFailed')}
              </p>
              <p className="text-xs text-red-600">
                {error || t('defaultError')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              {t('cancel')}
            </Button>
            <Button size="sm" onClick={handleUpload}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('retry')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
