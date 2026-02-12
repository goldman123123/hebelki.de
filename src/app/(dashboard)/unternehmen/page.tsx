'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react'
import type { Business } from './types'
import { CURRENT_AI_LITERACY_VERSION, CURRENT_AVV_VERSION } from './types'
import { BusinessProfileCard } from './components/BusinessProfileCard'
import { ComplianceCard } from './components/ComplianceCard'
import { WhatsAppCard } from './components/WhatsAppCard'
import { BrandingCard } from './components/BrandingCard'
import { BookingRulesCard } from './components/BookingRulesCard'
import { BillingCard } from './components/BillingCard'
import { DomainCard } from './components/DomainCard'

export default function UnternehmenPage() {
  const { user } = useUser()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [editSection, setEditSection] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const fetchBusiness = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      setBusiness(data.business)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBusiness()
  }, [fetchBusiness])

  async function handleSave(section: string, data: Record<string, unknown>): Promise<boolean> {
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, data }),
      })
      if (res.ok) {
        await fetchBusiness()
        setEditSection(null)
        return true
      }
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // Business readiness checks
  const getReadinessChecks = () => {
    if (!business) return []

    const checks = []

    if (!business.description) {
      checks.push({
        status: 'warning',
        label: 'Beschreibung fehlt',
        detail: 'Kunden sehen keine Informationen auf der Buchungsseite',
        section: 'profile',
      })
    }
    if (!business.address) {
      checks.push({
        status: 'error',
        label: 'Adresse fehlt',
        detail: 'Erforderlich für Impressum und Rechnungen',
        section: 'profile',
      })
    }
    if (!business.legalName) {
      checks.push({
        status: 'error',
        label: 'Rechtliche Angaben fehlen',
        detail: 'Rechnungen können nicht erstellt werden',
        section: 'legal',
      })
    }
    if (!business.settings?.privacyPolicyUrl) {
      checks.push({
        status: 'error',
        label: 'Datenschutzerklärung fehlt',
        detail: 'WhatsApp-Integration blockiert',
        section: 'compliance',
      })
    }
    if (!business.settings?.avvAcceptedAt || business.settings?.avvVersion !== CURRENT_AVV_VERSION) {
      checks.push({
        status: 'warning',
        label: 'AVV nicht akzeptiert',
        detail: 'Auftragsverarbeitungsvertrag ausstehend',
        section: 'compliance',
      })
    }
    if (!business.settings?.aiLiteracyAcknowledgedAt || business.settings?.aiLiteracyVersion !== CURRENT_AI_LITERACY_VERSION) {
      checks.push({
        status: 'warning',
        label: 'KI-Schulung nicht bestätigt',
        detail: 'Chatbot-Funktionen eingeschränkt',
        section: 'compliance',
      })
    }
    if (!business.email) {
      checks.push({
        status: 'error',
        label: 'E-Mail fehlt',
        detail: 'Buchungsbestätigungen können nicht gesendet werden',
        section: 'contact',
      })
    }

    return checks
  }

  const readinessChecks = getReadinessChecks()
  const hasErrors = readinessChecks.some(c => c.status === 'error')
  const isReady = readinessChecks.length === 0

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Kein Unternehmen konfiguriert.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mein Betrieb</h1>
          <p className="text-gray-600">Stammdaten, Kontakt und rechtliche Angaben</p>
        </div>
        <Badge className={`${isReady ? 'bg-green-500' : hasErrors ? 'bg-red-500' : 'bg-amber-500'} text-white`}>
          {isReady && <CheckCircle className="mr-1 h-3 w-3" />}
          {hasErrors && <XCircle className="mr-1 h-3 w-3" />}
          {!isReady && !hasErrors && <AlertTriangle className="mr-1 h-3 w-3" />}
          {isReady ? 'Einsatzbereit' : hasErrors ? 'Blockiert' : 'Handlungsbedarf'}
        </Badge>
      </div>

      <div className="space-y-6">
        <BusinessProfileCard
          business={business}
          editing={editSection === 'profile'}
          onEdit={() => setEditSection('profile')}
          onCancel={() => setEditSection(null)}
          onRefresh={async () => {
            await fetchBusiness()
            setEditSection(null)
          }}
        />

        <ComplianceCard
          business={business}
          editing={editSection === 'compliance'}
          onEdit={() => setEditSection('compliance')}
          onCancel={() => setEditSection(null)}
          onSave={handleSave}
          isSaving={isSaving}
          userId={user?.id}
        />

        <WhatsAppCard
          business={business}
          editing={editSection === 'whatsapp'}
          onEdit={() => setEditSection('whatsapp')}
          onCancel={() => setEditSection(null)}
          onSave={handleSave}
          isSaving={isSaving}
          onRefresh={fetchBusiness}
        />

        <BookingRulesCard
          business={business}
          editing={editSection === 'booking-rules'}
          onEdit={() => setEditSection('booking-rules')}
          onCancel={() => setEditSection(null)}
          onSave={handleSave}
          isSaving={isSaving}
        />

        <BrandingCard
          business={business}
          editing={editSection === 'branding'}
          onEdit={() => setEditSection('branding')}
          onCancel={() => setEditSection(null)}
          onSave={handleSave}
          isSaving={isSaving}
          onRefresh={fetchBusiness}
        />

        <DomainCard
          business={business}
          onRefresh={fetchBusiness}
        />

        <BillingCard business={business} />
      </div>
    </div>
  )
}
