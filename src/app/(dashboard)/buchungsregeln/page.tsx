'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/forms'
import { FormInput, FormCheckbox } from '@/components/forms/FormField'
import { CalendarCheck, Clock, Calendar, Pencil, Loader2, Ban, Users, Mail, ShieldCheck } from 'lucide-react'

interface Business {
  id: string
  name: string
  minBookingNoticeHours: number | null
  maxAdvanceBookingDays: number | null
  cancellationPolicyHours: number | null
  requireApproval: boolean | null
  requireEmailConfirmation: boolean | null
  allowWaitlist: boolean | null
}

export default function BuchungsregelnPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [editSection, setEditSection] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [policiesForm, setPoliciesForm] = useState({
    minBookingNoticeHours: 24,
    maxAdvanceBookingDays: 60,
    cancellationPolicyHours: 24,
    requireApproval: false,
    requireEmailConfirmation: false,
    allowWaitlist: true,
  })

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

  useEffect(() => {
    if (business) {
      setPoliciesForm({
        minBookingNoticeHours: business.minBookingNoticeHours || 24,
        maxAdvanceBookingDays: business.maxAdvanceBookingDays || 60,
        cancellationPolicyHours: business.cancellationPolicyHours || 24,
        requireApproval: business.requireApproval ?? false,
        requireEmailConfirmation: business.requireEmailConfirmation ?? false,
        allowWaitlist: business.allowWaitlist ?? true,
      })
    }
  }, [business])

  async function handleSave(section: string, data: Record<string, unknown>) {
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
      }
    } finally {
      setIsSaving(false)
    }
  }

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

  // Determine confirmation flow description
  function getConfirmationFlowLabel() {
    const emailConf = business?.requireEmailConfirmation
    const adminApproval = business?.requireApproval
    if (emailConf && adminApproval) return 'E-Mail-Bestätigung + Admin-Genehmigung'
    if (emailConf) return 'E-Mail-Bestätigung durch Kunden'
    if (adminApproval) return 'Manuelle Genehmigung durch Admin'
    return 'Automatisch bestätigt'
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Buchungsregeln</h1>
        <p className="text-gray-600">Richtlinien und Einstellungen für Kundenbuchungen</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking Policies */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5" />
                Buchungsrichtlinien
              </CardTitle>
              <CardDescription>Zeitfenster und Bestätigungsregeln</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('policies')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium">Mindestvorlaufzeit</p>
                <p className="text-sm text-gray-500">{business.minBookingNoticeHours || 24} Stunden</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium">Maximale Vorausbuchung</p>
                <p className="text-sm text-gray-500">Bis zu {business.maxAdvanceBookingDays || 60} Tage</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Ban className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium">Stornierungsfrist</p>
                <p className="text-sm text-gray-500">{business.cancellationPolicyHours || 24} Stunden vor Termin</p>
              </div>
            </div>
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">E-Mail-Bestätigung durch Kunden</p>
                  <p className="text-xs text-gray-500">
                    {business.requireEmailConfirmation
                      ? 'Kunden müssen ihre Buchung per E-Mail-Link bestätigen'
                      : 'Deaktiviert'}
                  </p>
                </div>
                <Badge variant={business.requireEmailConfirmation ? 'default' : 'outline'} className="ml-auto">
                  {business.requireEmailConfirmation ? 'Aktiv' : 'Aus'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">Manuelle Genehmigung durch Admin</p>
                  <p className="text-xs text-gray-500">
                    {business.requireApproval
                      ? 'Buchungen müssen vom Team genehmigt werden'
                      : 'Deaktiviert'}
                  </p>
                </div>
                <Badge variant={business.requireApproval ? 'default' : 'outline'} className="ml-auto">
                  {business.requireApproval ? 'Aktiv' : 'Aus'}
                </Badge>
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  {getConfirmationFlowLabel()}
                </Badge>
                <Badge variant={business.allowWaitlist ? 'outline' : 'secondary'} className="text-xs">
                  {business.allowWaitlist ? 'Warteliste aktiv' : 'Keine Warteliste'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Extended Rules (Placeholder) */}
        <Card className="border-dashed">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-400">
                <Users className="h-5 w-5" />
                Erweiterte Regeln
              </CardTitle>
              <CardDescription>Zusätzliche Buchungsoptionen (in Entwicklung)</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Hier werden zukünftig erweiterte Optionen verfügbar sein:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-400">
                <li>- Anzahlung bei Buchung</li>
                <li>- No-Show Gebühren</li>
                <li>- Gruppenbuchungen</li>
                <li>- Wiederkehrende Termine</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policies Edit Dialog */}
      <FormDialog
        open={editSection === 'policies'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title="Buchungsrichtlinien bearbeiten"
        onSubmit={() => handleSave('policies', policiesForm)}
        isSubmitting={isSaving}
      >
        <FormInput
          label="Mindestvorlaufzeit (Stunden)"
          name="minBookingNoticeHours"
          type="number"
          value={policiesForm.minBookingNoticeHours}
          onChange={(e) => setPoliciesForm({ ...policiesForm, minBookingNoticeHours: parseInt(e.target.value) || 0 })}
          description="Wie viele Stunden vor Termin muss gebucht werden?"
        />
        <FormInput
          label="Maximale Vorausbuchung (Tage)"
          name="maxAdvanceBookingDays"
          type="number"
          value={policiesForm.maxAdvanceBookingDays}
          onChange={(e) => setPoliciesForm({ ...policiesForm, maxAdvanceBookingDays: parseInt(e.target.value) || 1 })}
          description="Wie weit im Voraus können Kunden buchen?"
        />
        <FormInput
          label="Stornierungsfrist (Stunden)"
          name="cancellationPolicyHours"
          type="number"
          value={policiesForm.cancellationPolicyHours}
          onChange={(e) => setPoliciesForm({ ...policiesForm, cancellationPolicyHours: parseInt(e.target.value) || 0 })}
          description="Mindestfrist für kostenlose Stornierung"
        />
        <div className="space-y-4 border-t pt-4">
          <p className="text-sm font-medium text-gray-700">Bestätigungsablauf</p>
          <FormCheckbox
            label="E-Mail-Bestätigung durch Kunden"
            name="requireEmailConfirmation"
            description="Kunden müssen ihre Buchung per E-Mail-Link bestätigen"
            checked={policiesForm.requireEmailConfirmation}
            onChange={(e) => setPoliciesForm({ ...policiesForm, requireEmailConfirmation: e.target.checked })}
          />
          <FormCheckbox
            label="Manuelle Genehmigung durch Admin"
            name="requireApproval"
            description="Buchungen müssen vom Team genehmigt werden"
            checked={policiesForm.requireApproval}
            onChange={(e) => setPoliciesForm({ ...policiesForm, requireApproval: e.target.checked })}
          />
        </div>
        <div className="border-t pt-4">
          <FormCheckbox
            label="Warteliste aktivieren"
            name="allowWaitlist"
            description="Kunden können sich bei ausgebuchten Terminen auf die Warteliste setzen"
            checked={policiesForm.allowWaitlist}
            onChange={(e) => setPoliciesForm({ ...policiesForm, allowWaitlist: e.target.checked })}
          />
        </div>
      </FormDialog>
    </div>
  )
}
