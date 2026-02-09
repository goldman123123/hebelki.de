'use client'

/**
 * DataSection
 *
 * Main section component for each purpose tab.
 * Combines: SectionInfoCard + SectionUploadZone + DocumentList
 * Handles data fetching, polling for processing status, and refresh logic.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { SectionInfoCard } from './SectionInfoCard'
import { SectionUploadZone } from './SectionUploadZone'
import { UrlScrapeZone } from './UrlScrapeZone'
import { DocumentList, DataPurpose } from './DocumentList'
import { Document } from './DocumentCard'
import { toast } from 'sonner'

interface DataSectionProps {
  businessId: string
  purpose: DataPurpose
  refreshKey?: number
  onRefresh?: () => void
}

// API query parameters per purpose
const purposeApiParams: Record<DataPurpose, string> = {
  chatbot: 'dataClass=knowledge&audience=public&scopeType=global',
  intern: 'dataClass=knowledge&audience=internal&scopeType=global',
  kunden: 'scopeType=customer',
  daten: 'dataClass=stored_only',
}

export function DataSection({
  businessId,
  purpose,
  refreshKey,
  onRefresh,
}: DataSectionProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const pollingRef = useRef<Record<string, NodeJS.Timeout>>({})

  // Fetch documents for this purpose
  const fetchDocuments = useCallback(async () => {
    try {
      const params = purposeApiParams[purpose]
      const response = await fetch(`/api/documents?businessId=${businessId}&${params}`)
      const data = await response.json()

      if (response.ok && data.documents) {
        setDocuments(data.documents)

        // Start polling for documents that are still processing (only for knowledge)
        if (purpose !== 'daten') {
          data.documents.forEach((doc: Document) => {
            const status = doc.processingStatus?.status
            if (status && !['done', 'failed', 'cancelled'].includes(status)) {
              startPolling(doc.processingStatus!.id)
            }
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
      toast.error('Fehler beim Laden der Dokumente')
    } finally {
      setLoading(false)
    }
  }, [businessId, purpose])

  // Refetch when refreshKey changes
  useEffect(() => {
    setLoading(true)
    fetchDocuments()

    // Cleanup polling on unmount or purpose change
    return () => {
      Object.values(pollingRef.current).forEach(clearInterval)
      pollingRef.current = {}
    }
  }, [fetchDocuments, refreshKey])

  // Start polling for a job
  const startPolling = (jobId: string) => {
    // Don't start if already polling
    if (pollingRef.current[jobId]) return

    pollingRef.current[jobId] = setInterval(async () => {
      try {
        const response = await fetch(`/api/documents/pdf/jobs/${jobId}?businessId=${businessId}`)
        const job = await response.json()

        if (['done', 'failed', 'cancelled'].includes(job.status)) {
          // Stop polling
          clearInterval(pollingRef.current[jobId])
          delete pollingRef.current[jobId]

          // Refresh documents
          await fetchDocuments()
          onRefresh?.()

          if (job.status === 'done') {
            toast.success('Dokument erfolgreich verarbeitet')
          } else if (job.status === 'failed') {
            toast.error(`Verarbeitung fehlgeschlagen: ${job.lastError || 'Unbekannter Fehler'}`)
          }
        } else {
          // Update status in place
          setDocuments(prev => prev.map(doc => {
            if (doc.processingStatus?.id === jobId) {
              return {
                ...doc,
                processingStatus: {
                  ...doc.processingStatus,
                  status: job.status,
                  stage: job.stage,
                  errorCode: job.errorCode,
                },
              }
            }
            return doc
          }))
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 2000)
  }

  // Handle upload complete
  const handleUploadComplete = useCallback(() => {
    fetchDocuments()
    onRefresh?.()
  }, [fetchDocuments, onRefresh])

  // Handle document delete
  const handleDocumentDelete = useCallback(() => {
    fetchDocuments()
    onRefresh?.()
  }, [fetchDocuments, onRefresh])

  // Show URL scrape zone for knowledge-based purposes (not daten which is stored_only)
  const showUrlScrape = purpose !== 'daten'

  return (
    <div className="space-y-6">
      {/* Info card */}
      <SectionInfoCard purpose={purpose} />

      {/* URL Scrape zone (for knowledge sections only) */}
      {showUrlScrape && (
        <UrlScrapeZone
          businessId={businessId}
          purpose={purpose}
          onScrapeComplete={handleUploadComplete}
        />
      )}

      {/* Upload zone */}
      <SectionUploadZone
        businessId={businessId}
        purpose={purpose}
        onUploadComplete={handleUploadComplete}
      />

      {/* Document list */}
      <DocumentList
        documents={documents}
        businessId={businessId}
        purpose={purpose}
        loading={loading}
        onRefresh={handleDocumentDelete}
      />
    </div>
  )
}
