'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Phone, CheckCircle2, AlertCircle } from 'lucide-react'

type CallState = 'idle' | 'calling' | 'connected' | 'error'

interface PhoneCallModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessSlug: string
  businessName: string
  mode: 'customer' | 'assistant'
}

export function PhoneCallModal({
  open,
  onOpenChange,
  businessSlug,
  businessName,
  mode,
}: PhoneCallModalProps) {
  const [phone, setPhone] = useState('+49 ')
  const [callState, setCallState] = useState<CallState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setPhone('+49 ')
      setCallState('idle')
      setErrorMessage('')
    }
  }, [open])

  // Auto-close after connection
  useEffect(() => {
    if (callState === 'connected') {
      const timer = setTimeout(() => {
        onOpenChange(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [callState, onOpenChange])

  const isValidPhone = () => {
    const digits = phone.replace(/[^0-9]/g, '')
    return digits.length >= 10
  }

  const handleCall = async () => {
    if (!isValidPhone()) return

    setCallState('calling')
    setErrorMessage('')

    try {
      const response = await fetch('/api/demo/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug,
          phone,
          mode,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Anruf konnte nicht gestartet werden')
      }

      setCallState('connected')
    } catch (err) {
      setCallState('error')
      setErrorMessage(
        err instanceof Error ? err.message : 'Anruf konnte nicht gestartet werden'
      )
    }
  }

  const subtitle = mode === 'customer'
    ? `Testen Sie den Kundenassistenten von ${businessName} per Telefon`
    : `Testen Sie den internen Assistenten von ${businessName} per Telefon`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Anruf starten
          </DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        {callState === 'idle' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Telefonnummer
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+49 170 1234567"
              />
              <p className="mt-1 text-xs text-gray-500">
                Sie erhalten einen Anruf auf diese Nummer.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={handleCall}
              disabled={!isValidPhone()}
            >
              <Phone className="h-4 w-4 mr-2" />
              Jetzt anrufen
            </Button>
          </div>
        )}

        {callState === 'calling' && (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-gray-400 mb-4" />
            <p className="font-medium text-gray-900">Anruf wird eingeleitet...</p>
            <p className="mt-1 text-sm text-gray-500">Bitte warten Sie einen Moment.</p>
          </div>
        )}

        {callState === 'connected' && (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-500 mb-4" />
            <p className="font-medium text-gray-900">Anruf gestartet!</p>
            <p className="mt-1 text-sm text-gray-500">Ihr Telefon klingelt gleich.</p>
          </div>
        )}

        {callState === 'error' && (
          <div className="py-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-4" />
            <p className="font-medium text-gray-900">Fehler beim Anruf</p>
            <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCallState('idle')}
            >
              Erneut versuchen
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
