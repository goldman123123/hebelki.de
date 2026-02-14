'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet,
} from '@/components/ui/field'
import {
  Phone, Pencil, CheckCircle, XCircle, Copy, Check, Loader2, Info
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Business } from '../types'

interface VoiceCardProps {
  business: Business
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (section: string, data: Record<string, unknown>) => Promise<boolean>
  isSaving: boolean
}

export function VoiceCard({
  business,
  editing,
  onEdit,
  onCancel,
  onSave,
  isSaving,
}: VoiceCardProps) {
  const t = useTranslations('dashboard.business.voice')
  const tc = useTranslations('dashboard.business')
  const [webhookCopied, setWebhookCopied] = useState(false)

  const [voiceForm, setVoiceForm] = useState({
    voiceEnabled: false,
    twilioPhoneNumber: '',
  })

  function resetForm() {
    setVoiceForm({
      voiceEnabled: business.settings?.voiceEnabled || false,
      twilioPhoneNumber: business.twilioPhoneNumber || '',
    })
  }

  useEffect(() => {
    resetForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business])

  function copyWebhookUrl() {
    navigator.clipboard.writeText('https://www.hebelki.de/api/voice/incoming')
    setWebhookCopied(true)
    setTimeout(() => setWebhookCopied(false), 2000)
  }

  async function handleSave() {
    await onSave('voice', {
      voiceEnabled: voiceForm.voiceEnabled,
      twilioPhoneNumber: voiceForm.twilioPhoneNumber,
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
          <Phone className="h-5 w-5" />
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
        <div className="grid gap-4 md:grid-cols-3">
          {/* Status */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('status')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel>{t('voiceAssistant')}</FieldLabel>
                    <FieldDescription>{t('voiceDesc')}</FieldDescription>
                  </FieldContent>
                  {editing ? (
                    <Switch
                      checked={voiceForm.voiceEnabled}
                      onCheckedChange={(checked) => setVoiceForm({ ...voiceForm, voiceEnabled: checked })}
                    />
                  ) : business.settings?.voiceEnabled ? (
                    <span className="flex items-center gap-1.5 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {t('enabled')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <XCircle className="h-4 w-4" />
                      {t('disabled')}
                    </span>
                  )}
                </Field>

                <Field>
                  <FieldLabel>{t('phoneNumber')}</FieldLabel>
                  {business.twilioPhoneNumber ? (
                    <p className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {business.twilioPhoneNumber}
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-muted-foreground text-sm">
                      <XCircle className="h-4 w-4" />
                      {t('notConfigured')}
                    </p>
                  )}
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>

          {/* Telefonnummer */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('phoneNumber')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('twilioNumber')}</FieldLabel>
                  <Input
                    value={voiceForm.twilioPhoneNumber}
                    onChange={(e) => setVoiceForm({ ...voiceForm, twilioPhoneNumber: e.target.value })}
                    readOnly={!editing}
                    placeholder="+15754047792"
                  />
                  <FieldDescription>{t('twilioNumberDesc')}</FieldDescription>
                </Field>

                {editing && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                    <p className="text-sm text-blue-700 flex items-center gap-2">
                      <Info className="h-4 w-4 flex-shrink-0" />
                      {t('buyNumberInfo')}
                    </p>
                  </div>
                )}
              </FieldGroup>
            </FieldSet>
          </div>

          {/* Webhook */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('webhook')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('webhookUrl')}</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value="https://www.hebelki.de/api/voice/incoming"
                      className="flex-1 text-xs"
                    />
                    <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                      {webhookCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <FieldDescription>{t('webhookDesc')}</FieldDescription>
                </Field>

                {editing && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm text-amber-700 flex items-start gap-2">
                      <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>
                        {t('twilioConfigInfo')}
                      </span>
                    </p>
                  </div>
                )}
              </FieldGroup>
            </FieldSet>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
