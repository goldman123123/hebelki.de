'use client'

import { Badge } from '@/components/ui/badge'

export interface Invoice {
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

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(num)
}

export function formatDateGerman(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function getStatusBadge(status: string, type: string) {
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
