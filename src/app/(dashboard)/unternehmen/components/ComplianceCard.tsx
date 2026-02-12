'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet,
} from '@/components/ui/field'
import {
  Shield, Pencil, AlertTriangle, CheckCircle,
  ExternalLink, Info, XCircle, FileText, Loader2, User
} from 'lucide-react'
import Link from 'next/link'
import type { Business } from '../types'
import { CURRENT_AI_LITERACY_VERSION, CURRENT_AVV_VERSION } from '../types'

interface ComplianceCardProps {
  business: Business
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (section: string, data: Record<string, unknown>) => Promise<boolean>
  isSaving: boolean
  userId?: string
}

export function ComplianceCard({
  business,
  editing,
  onEdit,
  onCancel,
  onSave,
  isSaving,
  userId,
}: ComplianceCardProps) {
  const [dataControlForm, setDataControlForm] = useState({
    privacyPolicyUrl: '',
    dataRetentionDays: 365,
    dpaAccepted: false,
    aiLiteracyAcknowledged: false,
    aiDisclosureMessage: 'Ich bin ein KI-Assistent. Für persönliche Beratung wenden Sie sich bitte an unser Team.',
  })

  const [dpoForm, setDpoForm] = useState({
    dpoName: '',
    dpoEmail: '',
    dpoPhone: '',
  })

  function resetForm() {
    setDataControlForm({
      privacyPolicyUrl: business.settings?.privacyPolicyUrl || '',
      dataRetentionDays: business.settings?.dataRetentionDays || 365,
      dpaAccepted: !!business.settings?.dpaAcceptedAt,
      aiLiteracyAcknowledged: !!business.settings?.aiLiteracyAcknowledgedAt &&
        business.settings?.aiLiteracyVersion === CURRENT_AI_LITERACY_VERSION,
      aiDisclosureMessage: business.settings?.aiDisclosureMessage ||
        'Ich bin ein KI-Assistent. Für persönliche Beratung wenden Sie sich bitte an unser Team.',
    })
    setDpoForm({
      dpoName: business.settings?.dpoName || '',
      dpoEmail: business.settings?.dpoEmail || '',
      dpoPhone: business.settings?.dpoPhone || '',
    })
  }

  useEffect(() => {
    resetForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business])

  async function handleSave() {
    // Save data control settings
    await onSave('dataControl', {
      privacyPolicyUrl: dataControlForm.privacyPolicyUrl || null,
      dataRetentionDays: dataControlForm.dataRetentionDays,
      dpaAccepted: dataControlForm.dpaAccepted,
      aiLiteracyAcknowledged: dataControlForm.aiLiteracyAcknowledged,
      aiDisclosureMessage: dataControlForm.aiDisclosureMessage,
      userId,
    })
    // Save DPO settings
    await onSave('dpo', {
      dpoName: dpoForm.dpoName || null,
      dpoEmail: dpoForm.dpoEmail || null,
      dpoPhone: dpoForm.dpoPhone || null,
    })
  }

  function handleCancel() {
    resetForm()
    onCancel()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Datenschutz & Compliance
        </CardTitle>
        <CardDescription>DSGVO, EU AI Act und Auftragsverarbeitung</CardDescription>
        <CardAction>
          {editing ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                Abbrechen
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Speichern
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Datenschutz */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">Datenschutz</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>Datenschutzerklärung</FieldLabel>
                  {editing ? (
                    <Input
                      type="url"
                      value={dataControlForm.privacyPolicyUrl}
                      onChange={(e) => setDataControlForm({ ...dataControlForm, privacyPolicyUrl: e.target.value })}
                      placeholder="https://ihre-website.de/datenschutz"
                    />
                  ) : business.settings?.privacyPolicyUrl ? (
                    <p className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Hinterlegt
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-red-600 text-sm">
                      <XCircle className="h-4 w-4" />
                      Fehlt (WhatsApp blockiert)
                    </p>
                  )}
                </Field>

                <Field>
                  <FieldLabel>Datenaufbewahrung</FieldLabel>
                  {editing ? (
                    <Select
                      value={String(dataControlForm.dataRetentionDays)}
                      onValueChange={(value) => setDataControlForm({ ...dataControlForm, dataRetentionDays: parseInt(value) })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90">90 Tage</SelectItem>
                        <SelectItem value="180">180 Tage</SelectItem>
                        <SelectItem value="365">365 Tage (1 Jahr)</SelectItem>
                        <SelectItem value="730">730 Tage (2 Jahre)</SelectItem>
                        <SelectItem value="1095">1095 Tage (3 Jahre)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm">{business.settings?.dataRetentionDays || 365} Tage</p>
                  )}
                </Field>

                {editing ? (
                  <Field orientation="horizontal">
                    <Checkbox
                      checked={dataControlForm.dpaAccepted}
                      onCheckedChange={(checked) => setDataControlForm({ ...dataControlForm, dpaAccepted: checked === true })}
                    />
                    <FieldContent>
                      <FieldLabel>DPA akzeptieren</FieldLabel>
                      <FieldDescription>Datenverarbeitungsvereinbarung</FieldDescription>
                    </FieldContent>
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel>DPA</FieldLabel>
                    {business.settings?.dpaAcceptedAt ? (
                      <p className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Akzeptiert
                      </p>
                    ) : (
                      <p className="flex items-center gap-2 text-amber-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        Ausstehend
                      </p>
                    )}
                  </Field>
                )}
              </FieldGroup>
            </FieldSet>
          </div>

          {/* AVV */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">AVV (Art. 28 DSGVO)</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>Vertragsstatus</FieldLabel>
                  {business.settings?.avvAcceptedAt &&
                   business.settings?.avvVersion === CURRENT_AVV_VERSION ? (
                    <p className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Akzeptiert (v{CURRENT_AVV_VERSION})
                    </p>
                  ) : (
                    <div>
                      <p className="flex items-center gap-2 text-amber-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {business.settings?.avvAcceptedAt ? 'Neue Version' : 'Nicht akzeptiert'}
                      </p>
                      <Button
                        onClick={() => onSave('avv', { avvAccepted: true, userId })}
                        disabled={isSaving}
                        size="sm"
                        className="mt-2"
                      >
                        AVV akzeptieren
                      </Button>
                    </div>
                  )}
                </Field>
                <div className="space-y-1 text-sm">
                  <Link href="/legal/avv" className="flex items-center gap-1 text-primary hover:underline">
                    <FileText className="h-3 w-3" />
                    AVV lesen
                  </Link>
                  <Link href="/legal/unterauftragsverarbeiter" className="flex items-center gap-1 text-primary hover:underline">
                    <Shield className="h-3 w-3" />
                    Unterauftragsverarbeiter
                  </Link>
                  <Link href="/legal/toms" className="flex items-center gap-1 text-primary hover:underline">
                    <Shield className="h-3 w-3" />
                    TOMs
                  </Link>
                </div>
              </FieldGroup>
            </FieldSet>
          </div>

          {/* EU AI Act */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">EU AI Act (Art. 4)</FieldLegend>
              <FieldGroup className="gap-4">
                {editing ? (
                  <Field orientation="horizontal">
                    <Checkbox
                      checked={dataControlForm.aiLiteracyAcknowledged}
                      onCheckedChange={(checked) => setDataControlForm({ ...dataControlForm, aiLiteracyAcknowledged: checked === true })}
                    />
                    <FieldContent>
                      <FieldLabel>KI-Schulung bestätigt</FieldLabel>
                      <FieldDescription>
                        Mitarbeitende über KI-Einsatz informiert —{' '}
                        <Link href="/legal/ai-usage" target="_blank">
                          KI-Nutzungshinweise lesen <ExternalLink className="inline h-3 w-3" />
                        </Link>
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel>KI-Schulung</FieldLabel>
                    {business.settings?.aiLiteracyAcknowledgedAt &&
                     business.settings?.aiLiteracyVersion === CURRENT_AI_LITERACY_VERSION ? (
                      <p className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Bestätigt
                      </p>
                    ) : (
                      <p className="flex items-center gap-2 text-amber-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        Chatbot eingeschränkt
                      </p>
                    )}
                  </Field>
                )}

                <Field>
                  <FieldLabel>KI-Hinweis</FieldLabel>
                  {editing ? (
                    <Textarea
                      value={dataControlForm.aiDisclosureMessage}
                      onChange={(e) => setDataControlForm({ ...dataControlForm, aiDisclosureMessage: e.target.value })}
                      placeholder="Ich bin ein KI-Assistent..."
                      rows={2}
                    />
                  ) : (
                    <p className="text-xs italic text-muted-foreground line-clamp-2">
                      &quot;{business.settings?.aiDisclosureMessage || 'Nicht konfiguriert'}&quot;
                    </p>
                  )}
                  <FieldDescription>Wird Kunden zu Beginn jeder Chat-Sitzung angezeigt</FieldDescription>
                </Field>

                {!editing && (
                  <Link href="/legal/ai-usage" className="flex items-center gap-1 text-sm text-primary hover:underline">
                    <Info className="h-3 w-3" />
                    KI-Nutzungshinweise
                  </Link>
                )}
              </FieldGroup>
            </FieldSet>
          </div>

          {/* DSB (Datenschutzbeauftragter) */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">Datenschutzbeauftragter (DSB)</FieldLegend>
              <FieldGroup className="gap-4">
                {editing ? (
                  <>
                    <Field>
                      <FieldLabel>Name</FieldLabel>
                      <Input
                        value={dpoForm.dpoName}
                        onChange={(e) => setDpoForm({ ...dpoForm, dpoName: e.target.value })}
                        placeholder="Max Mustermann"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>E-Mail</FieldLabel>
                      <Input
                        type="email"
                        value={dpoForm.dpoEmail}
                        onChange={(e) => setDpoForm({ ...dpoForm, dpoEmail: e.target.value })}
                        placeholder="dsb@firma.de"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Telefon</FieldLabel>
                      <Input
                        type="tel"
                        value={dpoForm.dpoPhone}
                        onChange={(e) => setDpoForm({ ...dpoForm, dpoPhone: e.target.value })}
                        placeholder="+49 123 456789"
                      />
                    </Field>
                  </>
                ) : business.settings?.dpoName ? (
                  <>
                    <Field>
                      <FieldLabel>Kontakt</FieldLabel>
                      <div className="space-y-1 text-sm">
                        <p className="flex items-center gap-2 text-green-600">
                          <User className="h-4 w-4" />
                          {business.settings.dpoName}
                        </p>
                        {business.settings.dpoEmail && (
                          <p className="text-muted-foreground">{business.settings.dpoEmail}</p>
                        )}
                        {business.settings.dpoPhone && (
                          <p className="text-muted-foreground">{business.settings.dpoPhone}</p>
                        )}
                      </div>
                    </Field>
                  </>
                ) : (
                  <Field>
                    <FieldLabel>Status</FieldLabel>
                    <p className="flex items-center gap-2 text-amber-600 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Nicht konfiguriert
                    </p>
                  </Field>
                )}
                <p className="text-xs text-muted-foreground">
                  Gemäß Art. 37 DSGVO kann die Benennung eines DSB erforderlich sein
                </p>
              </FieldGroup>
            </FieldSet>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
