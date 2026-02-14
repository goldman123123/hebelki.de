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

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Ausstehend', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Bestätigt', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  completed: { label: 'Abgeschlossen', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  expired: { label: 'Abgelaufen', color: 'bg-gray-100 text-gray-600', icon: XCircle },
}

export function DataManagementCard({ business }: DataManagementCardProps) {
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
        throw new Error(data.error || 'Export fehlgeschlagen')
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
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen')
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
        throw new Error(data.error || 'Löschung fehlgeschlagen')
      }

      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschung fehlgeschlagen')
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Datenverwaltung & DSGVO
        </CardTitle>
        <CardDescription>
          Datenexport, Kunden-Löschanfragen und Kontolöschung
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Export Section */}
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-gray-900">Daten exportieren</h3>
          <p className="mt-1 text-sm text-gray-500">
            Laden Sie alle Ihre Geschäftsdaten als JSON-Datei herunter — Profil, Dienstleistungen,
            Mitarbeiter, Kunden, Buchungen, Gespräche und Rechnungen.
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
                Exportiere...
              </>
            ) : exportDone ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                Heruntergeladen
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Alle Daten exportieren
              </>
            )}
          </Button>
        </div>

        {/* Customer Deletion Requests (GDPR) */}
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-gray-900">Kunden-Löschanfragen (DSGVO)</h3>
          <p className="mt-1 text-sm text-gray-500">
            Übersicht aller Datenlöschungsanfragen Ihrer Kunden gemäß Art. 17 DSGVO.
          </p>

          {requestsLoading ? (
            <div className="mt-3 flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Laden...</span>
            </div>
          ) : requests.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">
              Keine Löschanfragen vorhanden.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-500">
                {requests.length} {requests.length === 1 ? 'Anfrage' : 'Anfragen'} insgesamt
              </p>
              {requests.map((req) => {
                const config = statusConfig[req.status] || statusConfig.pending
                const StatusIcon = config.icon

                return (
                  <div key={req.id} className="flex items-center justify-between gap-4 rounded-md border p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {req.customerName || req.customerEmail}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
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
                          Läuft ab {formatDistanceToNow(new Date(req.expiresAt), { addSuffix: true, locale: de })}
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
            <h3 className="text-sm font-medium text-red-900">Gefahrenzone</h3>
          </div>
          <p className="mt-1 text-sm text-red-700">
            Das Löschen Ihres Kontos entfernt alle Daten unwiderruflich — Buchungen,
            Kunden, Gespräche, Rechnungen und Einstellungen. Diese Aktion kann nicht rückgängig gemacht werden.
          </p>

          {!showDeleteConfirm ? (
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="destructive"
              className="mt-3"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Konto löschen
            </Button>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm font-medium text-red-800">
                Geben Sie <span className="font-bold">{business.name}</span> ein, um zu bestätigen:
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
                      Lösche...
                    </>
                  ) : (
                    'Endgültig löschen'
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setConfirmName('')
                  }}
                  variant="outline"
                >
                  Abbrechen
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
