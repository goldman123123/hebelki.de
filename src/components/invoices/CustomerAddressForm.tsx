'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Check, Pencil, X } from 'lucide-react'

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

interface CustomerAddressFormProps {
  customer: Customer
  onUpdate: () => void
}

export function CustomerAddressForm({ customer, onUpdate }: CustomerAddressFormProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    street: customer.street || '',
    city: customer.city || '',
    postalCode: customer.postalCode || '',
    country: customer.country || 'Deutschland',
  })

  const hasAddress = customer.street && customer.city && customer.postalCode

  async function handleSave() {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        setIsEditing(false)
        onUpdate()
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-gray-500">Kundenadresse</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 px-2"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
        {hasAddress ? (
          <div className="rounded-md bg-gray-50 p-3 text-sm">
            <p className="font-medium">{customer.name}</p>
            <p>{customer.street}</p>
            <p>{customer.postalCode} {customer.city}</p>
            <p>{customer.country}</p>
          </div>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">Adresse unvollständig</p>
            <p>Bitte Kundenadresse eingeben, um eine Rechnung zu erstellen.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Kundenadresse bearbeiten</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setForm({
              street: customer.street || '',
              city: customer.city || '',
              postalCode: customer.postalCode || '',
              country: customer.country || 'Deutschland',
            })
            setIsEditing(false)
          }}
          className="h-8 px-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3">
        <div>
          <Label htmlFor="street" className="text-xs text-gray-500">
            Straße und Hausnummer
          </Label>
          <Input
            id="street"
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
            placeholder="Musterstraße 123"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label htmlFor="postalCode" className="text-xs text-gray-500">
              PLZ
            </Label>
            <Input
              id="postalCode"
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              placeholder="12345"
              maxLength={10}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="city" className="text-xs text-gray-500">
              Ort
            </Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Berlin"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="country" className="text-xs text-gray-500">
            Land
          </Label>
          <Input
            id="country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            placeholder="Deutschland"
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={isSaving || !form.street || !form.city || !form.postalCode}
        className="w-full"
      >
        {isSaving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Check className="mr-2 h-4 w-4" />
        )}
        Adresse speichern
      </Button>
    </div>
  )
}
