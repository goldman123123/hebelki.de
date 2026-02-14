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
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('dashboard.business.compliance')
  const tc = useTranslations('dashboard.business')
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
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
        <CardAction>
          {editing ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                {tc('cancel')}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tc('save')}
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
              <FieldLegend className="mb-1">{t('privacy')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('privacyPolicy')}</FieldLabel>
                  {editing ? (
                    <Input
                      type="url"
                      value={dataControlForm.privacyPolicyUrl}
                      onChange={(e) => setDataControlForm({ ...dataControlForm, privacyPolicyUrl: e.target.value })}
                      placeholder={t('privacyPlaceholder')}
                    />
                  ) : business.settings?.privacyPolicyUrl ? (
                    <p className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {t('privacySet')}
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-red-600 text-sm">
                      <XCircle className="h-4 w-4" />
                      {t('privacyMissing')}
                    </p>
                  )}
                </Field>

                <Field>
                  <FieldLabel>{t('dataRetention')}</FieldLabel>
                  {editing ? (
                    <Select
                      value={String(dataControlForm.dataRetentionDays)}
                      onValueChange={(value) => setDataControlForm({ ...dataControlForm, dataRetentionDays: parseInt(value) })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90">{t('days90')}</SelectItem>
                        <SelectItem value="180">{t('days180')}</SelectItem>
                        <SelectItem value="365">{t('days365')}</SelectItem>
                        <SelectItem value="730">{t('days730')}</SelectItem>
                        <SelectItem value="1095">{t('days1095')}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm">{business.settings?.dataRetentionDays || 365} {t('days')}</p>
                  )}
                </Field>

                {editing ? (
                  <Field orientation="horizontal">
                    <Checkbox
                      checked={dataControlForm.dpaAccepted}
                      onCheckedChange={(checked) => setDataControlForm({ ...dataControlForm, dpaAccepted: checked === true })}
                    />
                    <FieldContent>
                      <FieldLabel>{t('acceptDpa')}</FieldLabel>
                      <FieldDescription>{t('dpaDesc')}</FieldDescription>
                    </FieldContent>
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel>{t('dpa')}</FieldLabel>
                    {business.settings?.dpaAcceptedAt ? (
                      <p className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        {t('dpaAccepted')}
                      </p>
                    ) : (
                      <p className="flex items-center gap-2 text-amber-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {t('dpaPending')}
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
              <FieldLegend className="mb-1">{t('avvTitle')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('contractStatus')}</FieldLabel>
                  {business.settings?.avvAcceptedAt &&
                   business.settings?.avvVersion === CURRENT_AVV_VERSION ? (
                    <p className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {t('avvAccepted', { version: CURRENT_AVV_VERSION })}
                    </p>
                  ) : (
                    <div>
                      <p className="flex items-center gap-2 text-amber-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {business.settings?.avvAcceptedAt ? t('avvNewVersion') : t('avvNotAccepted')}
                      </p>
                      <Button
                        onClick={() => onSave('avv', { avvAccepted: true, userId })}
                        disabled={isSaving}
                        size="sm"
                        className="mt-2"
                      >
                        {t('acceptAvv')}
                      </Button>
                    </div>
                  )}
                </Field>
                <div className="space-y-1 text-sm">
                  <Link href="/legal/avv" className="flex items-center gap-1 text-primary hover:underline">
                    <FileText className="h-3 w-3" />
                    {t('readAvv')}
                  </Link>
                  <Link href="/legal/unterauftragsverarbeiter" className="flex items-center gap-1 text-primary hover:underline">
                    <Shield className="h-3 w-3" />
                    {t('subprocessors')}
                  </Link>
                  <Link href="/legal/toms" className="flex items-center gap-1 text-primary hover:underline">
                    <Shield className="h-3 w-3" />
                    {t('toms')}
                  </Link>
                </div>
              </FieldGroup>
            </FieldSet>
          </div>

          {/* EU AI Act */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('euAiAct')}</FieldLegend>
              <FieldGroup className="gap-4">
                {editing ? (
                  <Field orientation="horizontal">
                    <Checkbox
                      checked={dataControlForm.aiLiteracyAcknowledged}
                      onCheckedChange={(checked) => setDataControlForm({ ...dataControlForm, aiLiteracyAcknowledged: checked === true })}
                    />
                    <FieldContent>
                      <FieldLabel>{t('aiTrainingConfirmed')}</FieldLabel>
                      <FieldDescription>
                        {t('aiTrainingDesc')}{' '}
                        <Link href="/legal/ai-usage" target="_blank">
                          {t('aiUsageNotes')} <ExternalLink className="inline h-3 w-3" />
                        </Link>
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel>{t('aiTraining')}</FieldLabel>
                    {business.settings?.aiLiteracyAcknowledgedAt &&
                     business.settings?.aiLiteracyVersion === CURRENT_AI_LITERACY_VERSION ? (
                      <p className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        {t('aiTrainingDone')}
                      </p>
                    ) : (
                      <p className="flex items-center gap-2 text-amber-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {t('aiTrainingLimited')}
                      </p>
                    )}
                  </Field>
                )}

                <Field>
                  <FieldLabel>{t('aiDisclosure')}</FieldLabel>
                  {editing ? (
                    <Textarea
                      value={dataControlForm.aiDisclosureMessage}
                      onChange={(e) => setDataControlForm({ ...dataControlForm, aiDisclosureMessage: e.target.value })}
                      placeholder={t('aiDisclosurePlaceholder')}
                      rows={2}
                    />
                  ) : (
                    <p className="text-xs italic text-muted-foreground line-clamp-2">
                      &quot;{business.settings?.aiDisclosureMessage || t('aiDisclosureNotSet')}&quot;
                    </p>
                  )}
                  <FieldDescription>{t('aiDisclosureDesc')}</FieldDescription>
                </Field>

                {!editing && (
                  <Link href="/legal/ai-usage" className="flex items-center gap-1 text-sm text-primary hover:underline">
                    <Info className="h-3 w-3" />
                    {t('aiUsageNotes')}
                  </Link>
                )}
              </FieldGroup>
            </FieldSet>
          </div>

          {/* DSB (Datenschutzbeauftragter) */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('dpo')}</FieldLegend>
              <FieldGroup className="gap-4">
                {editing ? (
                  <>
                    <Field>
                      <FieldLabel>{t('dpoName')}</FieldLabel>
                      <Input
                        value={dpoForm.dpoName}
                        onChange={(e) => setDpoForm({ ...dpoForm, dpoName: e.target.value })}
                        placeholder={t('dpoNamePlaceholder')}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>{t('dpoEmail')}</FieldLabel>
                      <Input
                        type="email"
                        value={dpoForm.dpoEmail}
                        onChange={(e) => setDpoForm({ ...dpoForm, dpoEmail: e.target.value })}
                        placeholder={t('dpoEmailPlaceholder')}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>{t('dpoPhone')}</FieldLabel>
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
                      <FieldLabel>{t('dpoContact')}</FieldLabel>
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
                    <FieldLabel>{t('dpoStatus')}</FieldLabel>
                    <p className="flex items-center gap-2 text-amber-600 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      {t('dpoNotConfigured')}
                    </p>
                  </Field>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('dpoNote')}
                </p>
              </FieldGroup>
            </FieldSet>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
