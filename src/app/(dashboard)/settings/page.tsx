'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/forms'
import { FormInput, FormCheckbox, FormTextarea } from '@/components/forms/FormField'
import {
  Globe, Clock, Calendar, Pencil, Loader2, Receipt, Image, Shield, Bot,
  AlertTriangle, CheckCircle, ExternalLink, Info, FileText, Download
} from 'lucide-react'
import Link from 'next/link'

interface BusinessSettings {
  taxId?: string
  taxRate?: number
  isKleinunternehmer?: boolean
  showLogoOnInvoice?: boolean
  // Data Control (GDPR/WhatsApp)
  privacyPolicyUrl?: string
  dataRetentionDays?: number
  dpaAcceptedAt?: string
  dpaAcceptedBy?: string
  // EU AI Act compliance
  aiLiteracyAcknowledgedAt?: string
  aiLiteracyAcknowledgedBy?: string
  aiLiteracyVersion?: string
  aiDisclosureMessage?: string
  // AVV (Auftragsverarbeitungsvertrag)
  avvAcceptedAt?: string
  avvAcceptedBy?: string
  avvVersion?: string
}

interface Business {
  id: string
  name: string
  slug: string
  type: string
  // Branding
  logoUrl: string | null
  primaryColor: string | null
  // Regional
  timezone: string | null
  currency: string | null
  // Policies
  minBookingNoticeHours: number | null
  maxAdvanceBookingDays: number | null
  cancellationPolicyHours: number | null
  requireApproval: boolean | null
  allowWaitlist: boolean | null
  // Settings JSONB
  settings: BusinessSettings | null
}

// Current AI literacy version - bump this when AI system changes significantly
const CURRENT_AI_LITERACY_VERSION = '1.0'

// Current AVV version - bump this when AVV legal terms change
const CURRENT_AVV_VERSION = '1.0'

export default function SettingsPage() {
  const { user } = useUser()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [editSection, setEditSection] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form states
  const [brandingForm, setBrandingForm] = useState({
    logoUrl: '',
    primaryColor: '#3B82F6',
  })

  const [regionalForm, setRegionalForm] = useState({
    timezone: 'Europe/Berlin',
    currency: 'EUR',
  })

  const [policiesForm, setPoliciesForm] = useState({
    minBookingNoticeHours: 24,
    maxAdvanceBookingDays: 60,
    cancellationPolicyHours: 24,
    requireApproval: false,
    allowWaitlist: true,
  })

  const [taxForm, setTaxForm] = useState({
    taxId: '',
    taxRate: 19,
    isKleinunternehmer: false,
    showLogoOnInvoice: true,
  })

  const [dataControlForm, setDataControlForm] = useState({
    privacyPolicyUrl: '',
    dataRetentionDays: 365,
    dpaAccepted: false,
    aiLiteracyAcknowledged: false,
    aiDisclosureMessage: 'Ich bin ein KI-Assistent. Für persönliche Beratung wenden Sie sich bitte an unser Team.',
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
      setBrandingForm({
        logoUrl: business.logoUrl || '',
        primaryColor: business.primaryColor || '#3B82F6',
      })
      setRegionalForm({
        timezone: business.timezone || 'Europe/Berlin',
        currency: business.currency || 'EUR',
      })
      setPoliciesForm({
        minBookingNoticeHours: business.minBookingNoticeHours || 24,
        maxAdvanceBookingDays: business.maxAdvanceBookingDays || 60,
        cancellationPolicyHours: business.cancellationPolicyHours || 24,
        requireApproval: business.requireApproval ?? false,
        allowWaitlist: business.allowWaitlist ?? true,
      })
      setTaxForm({
        taxId: business.settings?.taxId || '',
        taxRate: business.settings?.taxRate ?? 19,
        isKleinunternehmer: business.settings?.isKleinunternehmer ?? false,
        showLogoOnInvoice: business.settings?.showLogoOnInvoice ?? true,
      })
      setDataControlForm({
        privacyPolicyUrl: business.settings?.privacyPolicyUrl || '',
        dataRetentionDays: business.settings?.dataRetentionDays || 365,
        dpaAccepted: !!business.settings?.dpaAcceptedAt,
        aiLiteracyAcknowledged: !!business.settings?.aiLiteracyAcknowledgedAt &&
          business.settings?.aiLiteracyVersion === CURRENT_AI_LITERACY_VERSION,
        aiDisclosureMessage: business.settings?.aiDisclosureMessage ||
          'Ich bin ein KI-Assistent. Für persönliche Beratung wenden Sie sich bitte an unser Team.',
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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'logo')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const { url } = await res.json()
        setBrandingForm({ ...brandingForm, logoUrl: url })
      }
    } finally {
      setIsUploading(false)
    }
  }

  // Check compliance status
  const getComplianceStatus = () => {
    if (!business?.settings) {
      return { status: 'warning', label: 'Handlungsbedarf', color: 'bg-amber-500' }
    }
    const settings = business.settings
    const hasPrivacyPolicy = !!settings.privacyPolicyUrl
    const hasDpa = !!settings.dpaAcceptedAt
    const hasAiLiteracy = !!settings.aiLiteracyAcknowledgedAt &&
      settings.aiLiteracyVersion === CURRENT_AI_LITERACY_VERSION
    const hasAvv = !!settings.avvAcceptedAt &&
      settings.avvVersion === CURRENT_AVV_VERSION

    if (hasPrivacyPolicy && hasDpa && hasAiLiteracy && hasAvv) {
      return { status: 'success', label: 'DSGVO-konform', color: 'bg-green-500' }
    }
    if (!hasPrivacyPolicy && !hasDpa && !hasAiLiteracy && !hasAvv) {
      return { status: 'error', label: 'Nicht konform', color: 'bg-red-500' }
    }
    return { status: 'warning', label: 'Handlungsbedarf', color: 'bg-amber-500' }
  }

  const compliance = getComplianceStatus()

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
          <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
          <p className="text-gray-600">Betriebskonfiguration und Richtlinien</p>
        </div>
        <Badge className={`${compliance.color} text-white`}>
          {compliance.status === 'success' && <CheckCircle className="mr-1 h-3 w-3" />}
          {compliance.status === 'warning' && <AlertTriangle className="mr-1 h-3 w-3" />}
          {compliance.status === 'error' && <AlertTriangle className="mr-1 h-3 w-3" />}
          {compliance.label}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Branding */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Branding
              </CardTitle>
              <CardDescription>Logo und Farben für Rechnungen und Buchungsseiten</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('branding')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Logo</label>
              {business.logoUrl ? (
                <img
                  src={business.logoUrl}
                  alt={business.name}
                  className="mt-2 h-16 w-auto rounded border bg-white p-2"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-400">Kein Logo hochgeladen</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Hauptfarbe</label>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded border"
                  style={{ backgroundColor: business.primaryColor || '#3B82F6' }}
                />
                <code className="text-sm">{business.primaryColor || '#3B82F6'}</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Regionale Einstellungen
              </CardTitle>
              <CardDescription>Zeitzone und Währung</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('regional')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Zeitzone</label>
              <p className="mt-1">{business.timezone || 'Europe/Berlin'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Währung</label>
              <p className="mt-1">{business.currency || 'EUR'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Booking Policies */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Buchungsrichtlinien
              </CardTitle>
              <CardDescription>Regeln für Kundenbuchungen</CardDescription>
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
            <div>
              <p className="font-medium">Stornierungsfrist</p>
              <p className="text-sm text-gray-500">{business.cancellationPolicyHours || 24} Stunden</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={business.requireApproval ? 'default' : 'outline'}>
                {business.requireApproval ? 'Genehmigung erforderlich' : 'Automatisch bestätigt'}
              </Badge>
              <Badge variant={business.allowWaitlist ? 'default' : 'outline'}>
                {business.allowWaitlist ? 'Warteliste aktiv' : 'Keine Warteliste'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tax Settings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Steuereinstellungen
              </CardTitle>
              <CardDescription>Umsatzsteuer für Rechnungen (§ 14 UStG)</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('tax')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Steuernummer / USt-IdNr.</label>
              <p className="mt-1">{business.settings?.taxId || 'Nicht angegeben'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Steuersatz:</span>
              <Badge variant="default">
                {business.settings?.isKleinunternehmer
                  ? 'Kleinunternehmer (§ 19 UStG)'
                  : `${business.settings?.taxRate ?? 19}% MwSt.`}
              </Badge>
            </div>
            {business.settings?.isKleinunternehmer && (
              <p className="text-sm text-amber-600">
                Keine Umsatzsteuer wird auf Rechnungen ausgewiesen.
              </p>
            )}
            <div className="border-t pt-2">
              <span className="font-medium">Logo auf Rechnung:</span>{' '}
              <Badge variant={business.settings?.showLogoOnInvoice !== false ? 'default' : 'outline'}>
                {business.settings?.showLogoOnInvoice !== false ? 'Aktiviert' : 'Deaktiviert'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Data Control - GDPR & AI Compliance */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Datenschutz & KI-Transparenz
              </CardTitle>
              <CardDescription>DSGVO, WhatsApp-Compliance und EU AI Act</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('dataControl')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* GDPR & WhatsApp Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">DSGVO & WhatsApp</h4>

                <div>
                  <label className="text-sm font-medium text-gray-500">Datenschutzerklärung URL</label>
                  {business.settings?.privacyPolicyUrl ? (
                    <p className="mt-1 flex items-center gap-2">
                      <a
                        href={business.settings.privacyPolicyUrl}
                        target="_blank"
                        className="text-primary hover:underline"
                      >
                        {business.settings.privacyPolicyUrl}
                      </a>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </p>
                  ) : (
                    <p className="mt-1 flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      Nicht angegeben (erforderlich für WhatsApp)
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Datenaufbewahrung</label>
                  <p className="mt-1">{business.settings?.dataRetentionDays || 365} Tage</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Datenverarbeitungsvereinbarung</label>
                  {business.settings?.dpaAcceptedAt ? (
                    <p className="mt-1 flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Akzeptiert am {new Date(business.settings.dpaAcceptedAt).toLocaleDateString('de-DE')}
                    </p>
                  ) : (
                    <p className="mt-1 flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      Nicht akzeptiert
                    </p>
                  )}
                </div>
              </div>

              {/* EU AI Act Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">EU AI Act Transparenz</h4>

                <div>
                  <label className="text-sm font-medium text-gray-500">KI-Hinweis für Chatbot</label>
                  <p className="mt-1 text-sm italic text-gray-600">
                    &quot;{business.settings?.aiDisclosureMessage ||
                      'Ich bin ein KI-Assistent. Für persönliche Beratung wenden Sie sich bitte an unser Team.'}&quot;
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">KI-Schulung (Art. 4 EU AI Act)</label>
                  {business.settings?.aiLiteracyAcknowledgedAt &&
                   business.settings?.aiLiteracyVersion === CURRENT_AI_LITERACY_VERSION ? (
                    <p className="mt-1 flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Bestätigt am {new Date(business.settings.aiLiteracyAcknowledgedAt).toLocaleDateString('de-DE')}
                    </p>
                  ) : (
                    <div className="mt-1">
                      <p className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        {business.settings?.aiLiteracyVersion &&
                         business.settings.aiLiteracyVersion !== CURRENT_AI_LITERACY_VERSION
                          ? 'Erneute Bestätigung erforderlich (neue Version)'
                          : 'Nicht bestätigt'}
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        KI-Funktionen sind deaktiviert bis zur Bestätigung.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-md bg-blue-50 p-3">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 text-blue-500" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Warum ist das wichtig?</p>
                      <p className="mt-1">
                        Der EU AI Act (Art. 4) verpflichtet Betreiber, ihr Personal über KI-Systeme zu schulen.
                        <Link href="/legal/ai-usage" className="ml-1 inline-flex items-center gap-1 text-blue-600 hover:underline">
                          Mehr erfahren <ExternalLink className="h-3 w-3" />
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AVV (Auftragsverarbeitungsvertrag) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Auftragsverarbeitungsvertrag (AVV)
              </CardTitle>
              <CardDescription>
                DSGVO Art. 28 - Vertrag zur Auftragsverarbeitung zwischen Ihnen und Hebelki
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* AVV Status */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">Vertragsstatus</h4>

                <div>
                  <label className="text-sm font-medium text-gray-500">AVV Version</label>
                  <p className="mt-1 font-medium">{CURRENT_AVV_VERSION}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Akzeptanzstatus</label>
                  {business.settings?.avvAcceptedAt &&
                   business.settings?.avvVersion === CURRENT_AVV_VERSION ? (
                    <p className="mt-1 flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Akzeptiert am {new Date(business.settings.avvAcceptedAt).toLocaleDateString('de-DE')}
                    </p>
                  ) : business.settings?.avvAcceptedAt ? (
                    <div className="mt-1">
                      <p className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        Neue Version verfügbar - erneute Akzeptanz erforderlich
                      </p>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <p className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        Noch nicht akzeptiert
                      </p>
                    </div>
                  )}
                </div>

                {!(business.settings?.avvAcceptedAt &&
                   business.settings?.avvVersion === CURRENT_AVV_VERSION) && (
                  <Button
                    onClick={() => handleSave('avv', { avvAccepted: true, userId: user?.id })}
                    disabled={isSaving}
                    className="mt-2"
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    AVV akzeptieren
                  </Button>
                )}
              </div>

              {/* AVV Documents */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">Dokumente & Anlagen</h4>

                <div className="space-y-3">
                  <Link
                    href="/legal/avv"
                    className="flex items-center justify-between rounded-md border p-3 hover:border-primary hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Auftragsverarbeitungsvertrag</p>
                        <p className="text-sm text-gray-500">Version {CURRENT_AVV_VERSION}</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </Link>

                  <Link
                    href="/legal/unterauftragsverarbeiter"
                    className="flex items-center justify-between rounded-md border p-3 hover:border-primary hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Unterauftragsverarbeiter</p>
                        <p className="text-sm text-gray-500">Anlage 2 - 8 Anbieter</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </Link>

                  <Link
                    href="/legal/toms"
                    className="flex items-center justify-between rounded-md border p-3 hover:border-primary hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Technische & Organisatorische Maßnahmen</p>
                        <p className="text-sm text-gray-500">Anlage 1 - TOMs</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </Link>
                </div>

                <div className="rounded-md bg-blue-50 p-3">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 text-blue-500" />
                    <div className="text-sm text-blue-700">
                      <p>
                        Der AVV regelt die Datenverarbeitung gemäß DSGVO Art. 28.
                        Mit Akzeptanz bestätigen Sie die Kenntnisnahme der Unterauftragsverarbeiter
                        und technischen Maßnahmen.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hidden file input for logo upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleLogoUpload}
      />

      {/* Branding Edit Dialog */}
      <FormDialog
        open={editSection === 'branding'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title="Branding bearbeiten"
        onSubmit={() => handleSave('branding', brandingForm)}
        isSubmitting={isSaving}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Logo</label>
            <div className="flex items-center gap-4">
              {brandingForm.logoUrl ? (
                <img
                  src={brandingForm.logoUrl}
                  alt="Logo"
                  className="h-16 w-auto rounded border bg-white p-2"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded border bg-gray-50">
                  <Image className="h-8 w-8 text-gray-300" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hochladen'}
                </Button>
                <p className="text-xs text-gray-500">PNG, JPG bis 2MB</p>
              </div>
            </div>
          </div>
          <FormInput
            label="Logo URL (alternativ)"
            name="logoUrl"
            value={brandingForm.logoUrl}
            onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
            placeholder="https://..."
            description="Wird auf Rechnungen und der Buchungsseite angezeigt"
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">Hauptfarbe</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandingForm.primaryColor}
                onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded border p-1"
              />
              <FormInput
                label=""
                name="primaryColor"
                value={brandingForm.primaryColor}
                onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </FormDialog>

      {/* Regional Edit Dialog */}
      <FormDialog
        open={editSection === 'regional'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title="Regionale Einstellungen bearbeiten"
        onSubmit={() => handleSave('regional', regionalForm)}
        isSubmitting={isSaving}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Zeitzone</label>
          <select
            value={regionalForm.timezone}
            onChange={(e) => setRegionalForm({ ...regionalForm, timezone: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="Europe/Berlin">Europe/Berlin</option>
            <option value="Europe/Vienna">Europe/Vienna</option>
            <option value="Europe/Zurich">Europe/Zurich</option>
            <option value="Europe/London">Europe/London</option>
            <option value="Europe/Paris">Europe/Paris</option>
            <option value="Europe/Rome">Europe/Rome</option>
            <option value="Europe/Madrid">Europe/Madrid</option>
            <option value="Europe/Amsterdam">Europe/Amsterdam</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Währung</label>
          <select
            value={regionalForm.currency}
            onChange={(e) => setRegionalForm({ ...regionalForm, currency: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="EUR">EUR - Euro</option>
            <option value="CHF">CHF - Schweizer Franken</option>
            <option value="USD">USD - US Dollar</option>
            <option value="GBP">GBP - Britisches Pfund</option>
          </select>
        </div>
      </FormDialog>

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
        <FormCheckbox
          label="Manuelle Genehmigung erforderlich"
          name="requireApproval"
          description="Buchungen müssen von Ihnen bestätigt werden"
          checked={policiesForm.requireApproval}
          onChange={(e) => setPoliciesForm({ ...policiesForm, requireApproval: e.target.checked })}
        />
        <FormCheckbox
          label="Warteliste aktivieren"
          name="allowWaitlist"
          description="Kunden können sich auf die Warteliste setzen"
          checked={policiesForm.allowWaitlist}
          onChange={(e) => setPoliciesForm({ ...policiesForm, allowWaitlist: e.target.checked })}
        />
      </FormDialog>

      {/* Tax Edit Dialog */}
      <FormDialog
        open={editSection === 'tax'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title="Steuereinstellungen bearbeiten"
        onSubmit={() => handleSave('tax', taxForm)}
        isSubmitting={isSaving}
      >
        <FormInput
          label="Steuernummer / USt-IdNr."
          name="taxId"
          value={taxForm.taxId}
          onChange={(e) => setTaxForm({ ...taxForm, taxId: e.target.value })}
          placeholder="z.B. DE123456789 oder 12/345/67890"
          description="Wird auf allen Rechnungen angezeigt (§ 14 UStG)"
        />
        <div className="space-y-2">
          <label className="text-sm font-medium">Steuersatz (MwSt.)</label>
          <select
            value={taxForm.taxRate}
            onChange={(e) => setTaxForm({ ...taxForm, taxRate: parseInt(e.target.value) })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={taxForm.isKleinunternehmer}
          >
            <option value={19}>19% - Regelsteuersatz</option>
            <option value={7}>7% - Ermäßigter Satz</option>
            <option value={0}>0% - Steuerfrei</option>
          </select>
          <p className="text-xs text-gray-500">
            19% Standard, 7% für medizinische/kulturelle Leistungen
          </p>
        </div>
        <FormCheckbox
          label="Kleinunternehmerregelung (§ 19 UStG)"
          name="isKleinunternehmer"
          description="Keine Umsatzsteuer (Jahresumsatz unter 22.000 EUR)"
          checked={taxForm.isKleinunternehmer}
          onChange={(e) => setTaxForm({ ...taxForm, isKleinunternehmer: e.target.checked })}
        />
        {taxForm.isKleinunternehmer && (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <strong>Hinweis:</strong> Bei aktivierter Kleinunternehmerregelung wird auf Rechnungen
            keine Umsatzsteuer ausgewiesen. Stattdessen erscheint der Vermerk:
            &quot;Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.&quot;
          </div>
        )}
        <div className="border-t pt-4">
          <FormCheckbox
            label="Logo auf Rechnungen anzeigen"
            name="showLogoOnInvoice"
            description="Ihr Logo wird im Briefkopf der Rechnung angezeigt"
            checked={taxForm.showLogoOnInvoice}
            onChange={(e) => setTaxForm({ ...taxForm, showLogoOnInvoice: e.target.checked })}
          />
        </div>
      </FormDialog>

      {/* Data Control Edit Dialog */}
      <FormDialog
        open={editSection === 'dataControl'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title="Datenschutz & KI-Transparenz"
        onSubmit={() => handleSave('dataControl', {
          privacyPolicyUrl: dataControlForm.privacyPolicyUrl || null,
          dataRetentionDays: dataControlForm.dataRetentionDays,
          dpaAccepted: dataControlForm.dpaAccepted,
          aiLiteracyAcknowledged: dataControlForm.aiLiteracyAcknowledged,
          aiDisclosureMessage: dataControlForm.aiDisclosureMessage,
          userId: user?.id,
        })}
        isSubmitting={isSaving}
      >
        <div className="space-y-6">
          {/* GDPR Section */}
          <div className="space-y-4">
            <h4 className="font-semibold">DSGVO & WhatsApp</h4>

            <FormInput
              label="Datenschutzerklärung URL"
              name="privacyPolicyUrl"
              type="url"
              value={dataControlForm.privacyPolicyUrl}
              onChange={(e) => setDataControlForm({ ...dataControlForm, privacyPolicyUrl: e.target.value })}
              placeholder="https://ihre-website.de/datenschutz"
              description="Erforderlich für WhatsApp Business API"
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Datenaufbewahrung (Tage)</label>
              <select
                value={dataControlForm.dataRetentionDays}
                onChange={(e) => setDataControlForm({ ...dataControlForm, dataRetentionDays: parseInt(e.target.value) })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value={90}>90 Tage</option>
                <option value={180}>180 Tage</option>
                <option value={365}>365 Tage (1 Jahr)</option>
                <option value={730}>730 Tage (2 Jahre)</option>
                <option value={1095}>1095 Tage (3 Jahre)</option>
              </select>
              <p className="text-xs text-gray-500">
                Wie lange Kundendaten gespeichert werden (gesetzliche Aufbewahrungspflichten beachten)
              </p>
            </div>

            <FormCheckbox
              label="Datenverarbeitungsvereinbarung akzeptieren"
              name="dpaAccepted"
              description="Ich akzeptiere die Datenverarbeitungsvereinbarung für den Einsatz von WhatsApp und KI-Services"
              checked={dataControlForm.dpaAccepted}
              onChange={(e) => setDataControlForm({ ...dataControlForm, dpaAccepted: e.target.checked })}
            />
          </div>

          {/* AI Act Section */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4" />
              EU AI Act Transparenz (Art. 4)
            </h4>

            <FormTextarea
              label="KI-Hinweis für Chatbot"
              name="aiDisclosureMessage"
              value={dataControlForm.aiDisclosureMessage}
              onChange={(e) => setDataControlForm({ ...dataControlForm, aiDisclosureMessage: e.target.value })}
              placeholder="Ich bin ein KI-Assistent..."
              rows={3}
              description="Wird Kunden zu Beginn jeder Chatbot-Konversation angezeigt"
            />

            <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
              <h5 className="mb-2 font-medium text-blue-800 flex items-center gap-2">
                <Info className="h-4 w-4" />
                KI-Nutzung & Schulung (EU AI Act Art. 4)
              </h5>
              <FormCheckbox
                label="Ich bestätige, dass alle Mitarbeitenden, die dieses KI-System nutzen oder überwachen, über dessen Funktionsweise, Grenzen und Risiken informiert wurden."
                name="aiLiteracyAcknowledged"
                checked={dataControlForm.aiLiteracyAcknowledged}
                onChange={(e) => setDataControlForm({ ...dataControlForm, aiLiteracyAcknowledged: e.target.checked })}
              />
              <div className="mt-3 flex items-center gap-2">
                <Link
                  href="/legal/ai-usage"
                  target="_blank"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  KI-Nutzungshinweise lesen
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <p className="mt-3 text-xs text-blue-600">
                Der Betreiber ist für die Schulung seines Personals verantwortlich.
              </p>
            </div>
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
