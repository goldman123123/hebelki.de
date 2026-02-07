'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CustomerAddressForm } from './CustomerAddressForm'
import { FileText, Download, Loader2, Plus, ExternalLink } from 'lucide-react'

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
  subtotal: string
  taxRate: string | null
  taxAmount: string | null
  total: string
  issueDate: string
  serviceDate: string | null
  dueDate: string
  pdfR2Key: string | null
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

export function InvoiceCard({ bookingId, customer: initialCustomer }: InvoiceCardProps) {
  const [customer, setCustomer] = useState(initialCustomer)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInvoice = useCallback(async () => {
    try {
      // Check if invoice exists for this booking
      const res = await fetch(`/api/bookings/${bookingId}/invoice`)
      if (res.ok) {
        const data = await res.json()
        if (data.invoice) {
          setInvoice(data.invoice)
        }
      }
    } catch {
      // No invoice yet, that's fine
    } finally {
      setLoading(false)
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
  }, [fetchInvoice])

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
    } catch (err) {
      setError('Rechnung konnte nicht erstellt werden')
    } finally {
      setGenerating(false)
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

  // Invoice exists - show details
  if (invoice) {
    const isKleinunternehmer = parseFloat(invoice.taxRate || '0') === 0 && parseFloat(invoice.taxAmount || '0') === 0

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Rechnung {invoice.invoiceNumber}
            </CardTitle>
            <Badge variant={invoice.status === 'paid' ? 'default' : 'outline'}>
              {invoice.status === 'draft' && 'Entwurf'}
              {invoice.status === 'sent' && 'Versendet'}
              {invoice.status === 'paid' && 'Bezahlt'}
              {invoice.status === 'overdue' && 'Überfällig'}
              {invoice.status === 'cancelled' && 'Storniert'}
            </Badge>
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

          <Button asChild className="w-full">
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="mr-2 h-4 w-4" />
              PDF herunterladen
            </a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // No invoice yet - show generation form
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
      </CardContent>
    </Card>
  )
}
