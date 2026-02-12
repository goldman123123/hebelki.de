'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { type Invoice, formatCurrency, formatDateGerman, getStatusBadge } from './invoice-utils'

interface InvoiceHistoryProps {
  invoices: Invoice[]
  currentInvoiceId?: string
  showHistory: boolean
  onToggle: () => void
}

export function InvoiceHistory({
  invoices,
  currentInvoiceId,
  showHistory,
  onToggle,
}: InvoiceHistoryProps) {
  if (invoices.length === 0) return null
  if (invoices.length <= 1 && currentInvoiceId) return null

  return (
    <div className="border-t pt-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Rechnungsverlauf ({invoices.length})
      </button>
      {showHistory && (
        <div className="mt-2 space-y-1">
          {invoices.map((inv) => {
            const isCurrent = currentInvoiceId ? inv.id === currentInvoiceId : false
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
  )
}
