'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Download, Trash2, Loader2, AlertTriangle, CheckCircle, Shield, Clock, XCircle, AlertCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import type { Business } from '../types'

interface DataManagementCardProps {
  business: Business
}

interface DeletionRequest {
  id: string
  customerEmail: string
  customerName: string | null
  status: string
  requestedAt: string
  confirmedAt: string | null
  completedAt: string | null
  expiresAt: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-600',
}

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  confirmed: AlertCircle,
  completed: CheckCircle,
  expired: XCircle,
}

const STATUS_KEYS: Record<string, string> = {
  pending: 'statusPending',
  confirmed: 'statusConfirmed',
  completed: 'statusCompleted',
  expired: 'statusExpired',
}

export function DataManagementCard({ business }: DataManagementCardProps) {
  const t = useTranslations('dashboard.business.dataManagement')
  const [isExporting, setIsExporting] = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Deletion requests state
  const [requests, setRequests] = useState<DeletionRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)

  const nameMatches = confirmName.trim() === business.name

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/gdpr/requests')
      const data = await res.json()
      if (res.ok) {
        setRequests(data.requests)
      }
    } catch {
      // Silent fail — not critical
    } finally {
      setRequestsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  async function handleExport() {
    setIsExporting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/export')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('exportFailed'))
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hebelki-export-${business.slug}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportDone(true)
      setTimeout(() => setExportDone(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('exportFailed'))
    } finally {
      setIsExporting(false)
    }
  }

  async function handleDelete() {
    if (!nameMatches) return
    setIsDeleting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: confirmName.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('deletionFailed'))
      }

      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deletionFailed'))
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Export Section */}
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-gray-900">{t('exportTitle')}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {t('exportDesc')}
          </p>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            variant="outline"
            className="mt-3"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('exporting')}
              </>
            ) : exportDone ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                {t('downloaded')}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t('exportAll')}
              </>
            )}
          </Button>
        </div>

        {/* Customer Deletion Requests (GDPR) */}
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-gray-900">{t('deletionRequests')}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {t('deletionRequestsDesc')}
          </p>

          {requestsLoading ? (
            <div className="mt-3 flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t('loading')}</span>
            </div>
          ) : requests.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">
              {t('noRequests')}
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-500">
                {t('requestsCount', { count: requests.length })}
              </p>
              {requests.map((req) => {
                const statusColor = STATUS_COLORS[req.status] || STATUS_COLORS.pending
                const StatusIcon = STATUS_ICONS[req.status] || STATUS_ICONS.pending
                const statusKey = STATUS_KEYS[req.status] || STATUS_KEYS.pending

                return (
                  <div key={req.id} className="flex items-center justify-between gap-4 rounded-md border p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {req.customerName || req.customerEmail}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                          <StatusIcon className="h-3 w-3" />
                          {t(statusKey)}
                        </span>
                      </div>
                      {req.customerName && (
                        <p className="text-xs text-gray-500 truncate">{req.customerEmail}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-500 shrink-0 space-y-0.5">
                      <div>
                        {formatDistanceToNow(new Date(req.requestedAt), { addSuffix: true, locale: de })}
                      </div>
                      {req.status === 'pending' && (
                        <div className="text-yellow-600">
                          {t('expiresIn', { time: formatDistanceToNow(new Date(req.expiresAt), { addSuffix: true, locale: de }) })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Danger Zone - Account Deletion */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-medium text-red-900">{t('dangerZone')}</h3>
          </div>
          <p className="mt-1 text-sm text-red-700">
            {t('dangerDesc')}
          </p>

          {!showDeleteConfirm ? (
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="destructive"
              className="mt-3"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('deleteAccount')}
            </Button>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm font-medium text-red-800">
                {t('confirmDelete', { name: business.name })}
              </p>
              <Input
                value={confirmName}
                onChange={e => setConfirmName(e.target.value)}
                placeholder={business.name}
                className="max-w-sm border-red-300 focus:border-red-500 focus:ring-red-500"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleDelete}
                  disabled={!nameMatches || isDeleting}
                  variant="destructive"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('deleting')}
                    </>
                  ) : (
                    t('deletePermanently')
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setConfirmName('')
                  }}
                  variant="outline"
                >
                  {t('cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
