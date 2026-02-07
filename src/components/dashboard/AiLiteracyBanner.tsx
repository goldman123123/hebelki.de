'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, X, ExternalLink, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AiLiteracyBannerProps {
  businessId?: string
}

// Current AI literacy version - must match settings page and API
const CURRENT_AI_LITERACY_VERSION = '1.0'

export function AiLiteracyBanner({ businessId }: AiLiteracyBannerProps) {
  const [isAcknowledged, setIsAcknowledged] = useState<boolean | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function checkCompliance() {
      try {
        const res = await fetch('/api/admin/settings')
        if (res.ok) {
          const data = await res.json()
          const settings = data.business?.settings
          const acknowledged = settings?.aiLiteracyAcknowledgedAt &&
            settings?.aiLiteracyVersion === CURRENT_AI_LITERACY_VERSION
          setIsAcknowledged(acknowledged)
        }
      } catch (error) {
        console.error('Failed to check AI literacy status:', error)
        setIsAcknowledged(false)
      }
    }

    checkCompliance()
  }, [businessId])

  // Don't show anything while loading or if already acknowledged
  if (isAcknowledged === null || isAcknowledged || dismissed) {
    return null
  }

  return (
    <div className="relative mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded-md p-1 text-amber-600 hover:bg-amber-100"
        aria-label="Schließen"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Bot className="h-5 w-5 text-amber-600" />
        </div>

        <div className="flex-1 pr-6">
          <h3 className="flex items-center gap-2 font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            KI-Funktionen deaktiviert
          </h3>

          <p className="mt-1 text-sm text-amber-700">
            Der Chatbot ist nicht verfügbar, da die KI-Nutzungsbestätigung gemäß EU AI Act (Art. 4) noch aussteht.
            Bitte bestätigen Sie die KI-Schulung in den Einstellungen.
          </p>

          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/settings">
              <Button size="sm" variant="default" className="bg-amber-600 hover:bg-amber-700">
                Zu Einstellungen
              </Button>
            </Link>

            <Link
              href="/legal/ai-usage"
              target="_blank"
              className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-800 hover:underline"
            >
              KI-Nutzungshinweise lesen
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
