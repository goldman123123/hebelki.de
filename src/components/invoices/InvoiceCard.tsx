'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CustomerAddressForm } from './CustomerAddressForm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FileText,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Ban,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface Customer {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  street: string | null
  city: string | null
  postalCode: string | null
  country: string | null
}

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  type: string
  subtotal: string
  taxRate: string | null
  taxAmount: string | null
  total: string
  issueDate: string
  serviceDate: string | null
  dueDate: string
  pdfR2Key: string | null
  stornoInvoiceId: string | null
  originalInvoiceId: string | null
  replacementInvoiceId: string | null
  cancelledAt: string | null
  createdAt: string
}

interface InvoiceCardProps {
  bookingId: string
  customer: Customer | null
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(num)
}

function formatDateGerman(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getStatusBadge(status: string, type: string) {
  if (type === 'storno') {
    return <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">Storno</Badge>
  }
  switch (status) {
    case 'draft':
      return <Badge variant="outline">Entwurf</Badge>
    case 'sent':
      return <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">Versendet</Badge>
    case 'paid':
      return <Badge className="bg-green-600">Bezahlt</Badge>
    case 'cancelled':
      return <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">Storniert</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function InvoiceCard({ bookingId, customer: initialCustomer }: InvoiceCardProps) {
  const [customer, setCustomer] = useState(initialCustomer)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [recreating, setRecreating] = useState(false)
  const [sending, setSending] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [creatingReplacement, setCreatingReplacement] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // Dialog states
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [createReplacementOnCancel, setCreateReplacementOnCancel] = useState(false)

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/invoice`)
      if (res.ok) {
        const data = await res.json()
        if (data.invoice) {
          setInvoice(data.invoice)
        }
      }
    } catch {
      // No invoice yet
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  const fetchAllInvoices = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/invoices`)
      if (res.ok) {
        const data = await res.json()
        setAllInvoices(data.invoices || [])
      }
    } catch {
      // Ignore
    }
  }, [bookingId])

  const refreshCustomer = useCallback(async () => {
    if (!customer) return
    try {
      const res = await fetch(`/api/customers/${customer.id}`)
      if (res.ok) {
        const data = await res.json()
        setCustomer(data.customer)
      }
    } catch {
      // Ignore
    }
  }, [customer])

  useEffect(() => {
    fetchInvoice()
    fetchAllInvoices()
  }, [fetchInvoice, fetchAllInvoices])

  async function handleGenerateInvoice() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate invoice')
        return
      }
      setInvoice(data.invoice)
      fetchAllInvoices()
    } catch {
      setError('Rechnung konnte nicht erstellt werden')
    } finally {
      setGenerating(false)
    }
  }

  async function handleRecreateInvoice() {
    if (!invoice) return
    setRecreating(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/invoice`, { method: 'PATCH' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Rechnung konnte nicht neu erstellt werden')
        return
      }
      setInvoice(data.invoice)
      fetchAllInvoices()
    } catch {
      setError('Rechnung konnte nicht neu erstellt werden')
    } finally {
      setRecreating(false)
    }
  }

  async function handleSendInvoice() {
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/invoice/send`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Rechnung konnte nicht versendet werden')
        return
      }
      setInvoice(data.invoice)
      fetchAllInvoices()
      setSendDialogOpen(false)
    } catch {
      setError('Rechnung konnte nicht versendet werden')
    } finally {
      setSending(false)
    }
  }

  async function handleCancelInvoice() {
    setCancelling(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/invoice/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason || undefined,
          createReplacement: createReplacementOnCancel,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Stornierung fehlgeschlagen')
        return
      }
      // If replacement was created, show it; otherwise show cancelled state
      if (data.replacement) {
        setInvoice(data.replacement)
      } else {
        setInvoice(data.cancelled)
      }
      fetchAllInvoices()
      setCancelDialogOpen(false)
      setCancelReason('')
      setCreateReplacementOnCancel(false)
    } catch {
      setError('Stornierung fehlgeschlagen')
    } finally {
      setCancelling(false)
    }
  }

  async function handleMarkPaid() {
    setMarkingPaid(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/invoice/mark-paid`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Fehler beim Markieren als bezahlt')
        return
      }
      setInvoice(data.invoice)
      fetchAllInvoices()
    } catch {
      setError('Fehler beim Markieren als bezahlt')
    } finally {
      setMarkingPaid(false)
    }
  }

  async function handleCreateReplacement() {
    setCreatingReplacement(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/invoice/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createReplacement: true }),
      })
      const data = await res.json()
      // If this was already cancelled, we just need a new invoice
      if (!res.ok) {
        // Try creating directly
        await handleGenerateInvoice()
        return
      }
      if (data.replacement) {
        setInvoice(data.replacement)
      }
      fetchAllInvoices()
    } catch {
      setError('Neue Rechnung konnte nicht erstellt werden')
    } finally {
      setCreatingReplacement(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Rechnung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Invoice exists — show details
  if (invoice) {
    const isKleinunternehmer = parseFloat(invoice.taxRate || '0') === 0 && parseFloat(invoice.taxAmount || '0') === 0
    const isDraft = invoice.status === 'draft'
    const isSent = invoice.status === 'sent'
    const isPaid = invoice.status === 'paid'
    const isCancelled = invoice.status === 'cancelled'
    const isStorno = invoice.type === 'storno'
    const hasHistory = allInvoices.length > 1

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isStorno ? 'Stornorechnung' : 'Rechnung'} {invoice.invoiceNumber}
            </CardTitle>
            {getStatusBadge(invoice.status, invoice.type)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Rechnungsdatum</p>
              <p className="font-medium">{formatDateGerman(invoice.issueDate)}</p>
            </div>
            {invoice.serviceDate && (
              <div>
                <p className="text-gray-500">Leistungsdatum</p>
                <p className="font-medium">{formatDateGerman(invoice.serviceDate)}</p>
              </div>
            )}
          </div>

          <div className="rounded-md bg-gray-50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Netto</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {!isKleinunternehmer && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">MwSt. ({invoice.taxRate}%)</span>
                <span>{formatCurrency(invoice.taxAmount || '0')}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Brutto</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            {isKleinunternehmer && (
              <p className="text-xs text-amber-600 mt-2">
                Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
              </p>
            )}
          </div>

          {/* Action buttons based on status */}
          <div className="flex flex-wrap gap-2">
            {/* PDF Download — always available */}
            <Button asChild variant={isDraft ? 'default' : 'outline'} className="flex-1 min-w-[140px]">
              <a
                href={`/api/invoices/${invoice.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="mr-2 h-4 w-4" />
                PDF herunterladen
              </a>
            </Button>

            {/* Draft: Regenerate + Send */}
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  onClick={handleRecreateInvoice}
                  disabled={recreating}
                >
                  {recreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-2 hidden sm:inline">Neu erstellen</span>
                </Button>
                <Button
                  onClick={() => setSendDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="mr-2 h-4 w-4" />
                  An Kunden senden
                </Button>
              </>
            )}

            {/* Sent: Mark Paid + Stornieren */}
            {isSent && (
              <>
                <Button
                  onClick={handleMarkPaid}
                  disabled={markingPaid}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {markingPaid ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Als bezahlt
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCancelDialogOpen(true)}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Stornieren
                </Button>
              </>
            )}

            {/* Paid: Stornieren */}
            {isPaid && (
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(true)}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <Ban className="mr-2 h-4 w-4" />
                Stornieren
              </Button>
            )}

            {/* Cancelled: New invoice */}
            {isCancelled && !isStorno && (
              <Button
                onClick={handleGenerateInvoice}
                disabled={creatingReplacement || generating}
              >
                {(creatingReplacement || generating) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Neue Rechnung erstellen
              </Button>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Invoice History (collapsible) */}
          {hasHistory && (
            <div className="border-t pt-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Rechnungsverlauf ({allInvoices.length})
              </button>
              {showHistory && (
                <div className="mt-2 space-y-1">
                  {allInvoices.map((inv) => {
                    const isCurrent = inv.id === invoice.id
                    return (
                      <div
                        key={inv.id}
                        className={`flex items-center justify-between text-sm px-3 py-2 rounded ${
                          isCurrent ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{inv.invoiceNumber}</span>
                          {getStatusBadge(inv.status, inv.type)}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">{formatDateGerman(inv.createdAt)}</span>
                          <span className={`font-medium ${parseFloat(inv.total) < 0 ? 'text-red-600' : ''}`}>
                            {formatCurrency(inv.total)}
                          </span>
                          {isCurrent && <span className="text-xs text-blue-600">aktuell</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Send Confirmation Dialog */}
        <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rechnung versenden</DialogTitle>
              <DialogDescription>
                Rechnung {invoice.invoiceNumber} wird an{' '}
                <strong>{customer?.email || 'den Kunden'}</strong> gesendet.
                Nach dem Versand kann die Rechnung nicht mehr bearbeitet werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={handleSendInvoice}
                disabled={sending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Jetzt senden
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel (Storno) Confirmation Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rechnung stornieren</DialogTitle>
              <DialogDescription>
                Es wird eine Stornorechnung zu {invoice.invoiceNumber} erstellt.
                Dieser Vorgang kann nicht rückgängig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label htmlFor="cancel-reason" className="text-sm font-medium text-gray-700">
                  Grund (optional)
                </label>
                <input
                  id="cancel-reason"
                  type="text"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="z.B. Fehlbuchung, geänderter Leistungsumfang"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="create-replacement"
                  checked={createReplacementOnCancel}
                  onCheckedChange={(checked) => setCreateReplacementOnCancel(checked === true)}
                />
                <label htmlFor="create-replacement" className="text-sm text-gray-700">
                  Neue Rechnung direkt erstellen
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={handleCancelInvoice}
                disabled={cancelling}
                variant="destructive"
              >
                {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Stornieren
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    )
  }

  // No invoice yet — show generation form
  const hasCompleteAddress = customer?.street && customer?.city && customer?.postalCode

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Rechnung
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {customer ? (
          <>
            <CustomerAddressForm
              customer={customer}
              onUpdate={refreshCustomer}
            />

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <Button
              onClick={handleGenerateInvoice}
              disabled={generating || !hasCompleteAddress}
              className="w-full"
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Rechnung erstellen
            </Button>
          </>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>Kein Kunde zugeordnet</p>
          </div>
        )}

        {/* Show history even when no active invoice */}
        {allInvoices.length > 0 && (
          <div className="border-t pt-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Rechnungsverlauf ({allInvoices.length})
            </button>
            {showHistory && (
              <div className="mt-2 space-y-1">
                {allInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between text-sm px-3 py-2 rounded bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{inv.invoiceNumber}</span>
                      {getStatusBadge(inv.status, inv.type)}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{formatDateGerman(inv.createdAt)}</span>
                      <span className={`font-medium ${parseFloat(inv.total) < 0 ? 'text-red-600' : ''}`}>
                        {formatCurrency(inv.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
