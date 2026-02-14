'use client'

/**
 * DeletionRequestsTab
 *
 * Shows GDPR deletion requests for the business.
 * Displays request date, customer email, status, and confirmation date.
 */

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Loader2, Shield, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { useTranslations } from 'next-intl'

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

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  confirmed: AlertCircle,
  completed: CheckCircle,
  expired: XCircle,
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-600',
}

const STATUS_KEYS: Record<string, string> = {
  pending: 'statusPending',
  confirmed: 'statusConfirmed',
  completed: 'statusCompleted',
  expired: 'statusExpired',
}

export function DeletionRequestsTab({ businessId }: { businessId: string }) {
  const t = useTranslations('dashboard.chatbot.deletionRequests')
  const [requests, setRequests] = useState<DeletionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/gdpr/requests')
      const data = await res.json()

      if (res.ok) {
        setRequests(data.requests)
      } else {
        setError(data.error || t('loadError'))
      }
    } catch {
      setError(t('networkError'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('loading')}</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-400 mb-3" />
        <p className="text-sm text-red-600">{error}</p>
      </Card>
    )
  }

  if (requests.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          {t('noRequests')}
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          {t('noRequestsDesc')}
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {t('requestCount', { count: requests.length })}
        </p>
      </div>

      <div className="space-y-2">
        {requests.map((req) => {
          const statusColor = STATUS_COLORS[req.status] || STATUS_COLORS.pending
          const StatusIcon = STATUS_ICONS[req.status] || STATUS_ICONS.pending
          const statusLabel = t(STATUS_KEYS[req.status] || STATUS_KEYS.pending)

          return (
            <Card key={req.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 truncate">
                      {req.customerName || req.customerEmail}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusLabel}
                    </span>
                  </div>
                  {req.customerName && (
                    <p className="text-sm text-gray-500 truncate">{req.customerEmail}</p>
                  )}
                </div>

                <div className="text-right text-xs text-gray-500 shrink-0 space-y-1">
                  <div>
                    {t('requested')}{' '}
                    {formatDistanceToNow(new Date(req.requestedAt), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </div>
                  {req.confirmedAt && (
                    <div>
                      {t('confirmed')}{' '}
                      {formatDistanceToNow(new Date(req.confirmedAt), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </div>
                  )}
                  {req.completedAt && (
                    <div>
                      {t('deleted')}{' '}
                      {formatDistanceToNow(new Date(req.completedAt), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </div>
                  )}
                  {req.status === 'pending' && (
                    <div className="text-yellow-600">
                      {t('expires')}{' '}
                      {formatDistanceToNow(new Date(req.expiresAt), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
