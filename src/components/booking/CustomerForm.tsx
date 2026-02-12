'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { Calendar, Clock, User, Loader2 } from 'lucide-react'
import type { Service, Staff } from './BookingWidget'

interface CustomerFormProps {
  service: Service
  staff: Staff | null
  dateTime: Date
  currency: string
  onSubmit: (data: {
    name: string
    email: string
    phone: string
    notes: string
  }) => void
  isSubmitting: boolean
}

export function CustomerForm({
  service,
  staff,
  dateTime,
  currency,
  onSubmit,
  isSubmitting,
}: CustomerFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Name ist erforderlich'
    }

    if (!email.trim()) {
      newErrors.email = 'E-Mail ist erforderlich'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      newErrors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit({ name, email, phone, notes })
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Ihre Angaben
      </h2>

      {/* Booking summary */}
      <div className="mb-6 rounded-lg bg-gray-50 p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-700">
          Buchungsübersicht
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="font-medium text-gray-900">{service.name}</span>
            {service.price && (
              <span className="text-gray-500">
                • {formatCurrency(service.price, currency)}
              </span>
            )}
          </div>
          {staff && (
            <div className="flex items-center gap-2 text-gray-600">
              <User className="h-4 w-4" />
              <span>{staff.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(dateTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4" />
            <span>
              {formatTime(dateTime)} ({service.durationMinutes} min)
            </span>
          </div>
        </div>
      </div>

      {/* Customer form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            type="text"
            placeholder="Ihr vollständiger Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={errors.name ? 'border-red-500' : ''}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-Mail *</Label>
          <Input
            id="email"
            type="email"
            placeholder="ihre@email.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={errors.email ? 'border-red-500' : ''}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefon (optional)</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+49 123 456789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Anmerkungen (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Besondere Wünsche oder Hinweise..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird gebucht...
            </>
          ) : (
            'Buchung bestätigen'
          )}
        </Button>
      </form>
    </div>
  )
}
