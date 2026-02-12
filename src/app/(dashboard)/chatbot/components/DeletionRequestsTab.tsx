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

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Ausstehend', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Bestätigt', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  completed: { label: 'Abgeschlossen', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  expired: { label: 'Abgelaufen', color: 'bg-gray-100 text-gray-600', icon: XCircle },
}

export function DeletionRequestsTab({ businessId }: { businessId: string }) {
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
        setError(data.error || 'Fehler beim Laden')
      }
    } catch {
      setError('Netzwerkfehler beim Laden der Löschanfragen')
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
          <span>Löschanfragen laden...</span>
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
          Keine Löschanfragen
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Es wurden noch keine DSGVO-Löschanfragen für Ihr Unternehmen gestellt.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {requests.length} {requests.length === 1 ? 'Anfrage' : 'Anfragen'} insgesamt
        </p>
      </div>

      <div className="space-y-2">
        {requests.map((req) => {
          const config = statusConfig[req.status] || statusConfig.pending
          const StatusIcon = config.icon

          return (
            <Card key={req.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 truncate">
                      {req.customerName || req.customerEmail}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </div>
                  {req.customerName && (
                    <p className="text-sm text-gray-500 truncate">{req.customerEmail}</p>
                  )}
                </div>

                <div className="text-right text-xs text-gray-500 shrink-0 space-y-1">
                  <div>
                    Angefragt:{' '}
                    {formatDistanceToNow(new Date(req.requestedAt), {
                      addSuffix: true,
                      locale: de,
                    })}
                  </div>
                  {req.confirmedAt && (
                    <div>
                      Bestätigt:{' '}
                      {formatDistanceToNow(new Date(req.confirmedAt), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </div>
                  )}
                  {req.completedAt && (
                    <div>
                      Gelöscht:{' '}
                      {formatDistanceToNow(new Date(req.completedAt), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </div>
                  )}
                  {req.status === 'pending' && (
                    <div className="text-yellow-600">
                      Läuft ab:{' '}
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
