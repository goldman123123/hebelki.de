'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, Plus, Trash2, Save, Loader2, AlertTriangle } from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unitPrice: string
  total: string
}

interface BookingItemsProps {
  bookingId: string
  initialItems: LineItem[] | null
  invoiceStatus?: string
}

export function BookingItems({ bookingId, initialItems, invoiceStatus }: BookingItemsProps) {
  const router = useRouter()
  const [items, setItems] = useState<LineItem[]>(initialItems || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  function addItem() {
    setItems([...items, { description: '', quantity: 1, unitPrice: '0.00', total: '0.00' }])
    setIsDirty(true)
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
    setIsDirty(true)
  }

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...items]
    const item = { ...updated[index] }

    if (field === 'description') {
      item.description = value as string
    } else if (field === 'quantity') {
      const qty = typeof value === 'string' ? parseFloat(value) || 0 : value
      item.quantity = qty
      item.total = (qty * parseFloat(item.unitPrice || '0')).toFixed(2)
    } else if (field === 'unitPrice') {
      const price = typeof value === 'string' ? value : value.toString()
      item.unitPrice = price
      item.total = (item.quantity * parseFloat(price || '0')).toFixed(2)
    }

    updated[index] = item
    setItems(updated)
    setIsDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Fehler beim Speichern')
        return
      }

      setIsDirty(false)
      router.refresh()
    } catch {
      setError('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  function formatCurrency(amount: string): string {
    const num = parseFloat(amount)
    if (isNaN(num)) return '-'
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(num)
  }

  const grandTotal = items.reduce((sum, item) => sum + parseFloat(item.total || '0'), 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Positionen / Lieferschein
          </CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 h-4 w-4" />
            Position
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {(invoiceStatus === 'sent' || invoiceStatus === 'paid') && (
          <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Es existiert eine versendete Rechnung. Änderungen werden erst nach Stornierung und Neuerstellung übernommen.
            </p>
          </div>
        )}
        {items.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Keine Positionen vorhanden.</p>
            <p className="text-xs text-gray-400 mt-1">Positionen hinzufügen, um einen Lieferschein zu erstellen.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide px-1">
              <div className="col-span-5">Beschreibung</div>
              <div className="col-span-2">Menge</div>
              <div className="col-span-2">Einzelpreis</div>
              <div className="col-span-2 text-right">Gesamt</div>
              <div className="col-span-1"></div>
            </div>

            {/* Items */}
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <input
                    type="text"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="z.B. Feuerlöscher ABC 6kg"
                    value={item.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    min="0"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                  />
                </div>
                <div className="col-span-2 text-right text-sm font-medium">
                  {formatCurrency(item.total)}
                </div>
                <div className="col-span-1 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(i)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Total */}
            {grandTotal > 0 && (
              <div className="border-t pt-3 flex justify-end">
                <div className="text-sm">
                  <span className="text-gray-500 mr-4">Gesamt:</span>
                  <span className="font-semibold">{formatCurrency(grandTotal.toFixed(2))}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {isDirty && (
          <div className="mt-4">
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Positionen speichern
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
