'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet,
} from '@/components/ui/field'
import { CalendarCheck, Pencil, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Business } from '../types'

interface BookingRulesCardProps {
  business: Business
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (section: string, data: Record<string, unknown>) => Promise<boolean>
  isSaving: boolean
}

export function BookingRulesCard({
  business,
  editing,
  onEdit,
  onCancel,
  onSave,
  isSaving,
}: BookingRulesCardProps) {
  const t = useTranslations('dashboard.business.bookingRules')
  const tc = useTranslations('dashboard.business')
  const [form, setForm] = useState({
    minBookingNoticeHours: 24,
    maxAdvanceBookingDays: 60,
    cancellationPolicyHours: 24,
    requireApproval: false,
    requireEmailConfirmation: false,
    allowWaitlist: true,
  })

  function resetForm() {
    setForm({
      minBookingNoticeHours: business.minBookingNoticeHours || 24,
      maxAdvanceBookingDays: business.maxAdvanceBookingDays || 60,
      cancellationPolicyHours: business.cancellationPolicyHours || 24,
      requireApproval: business.requireApproval ?? false,
      requireEmailConfirmation: business.requireEmailConfirmation ?? false,
      allowWaitlist: business.allowWaitlist ?? true,
    })
  }

  useEffect(() => {
    resetForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business])

  async function handleSave() {
    await onSave('policies', form)
  }

  function handleCancel() {
    resetForm()
    onCancel()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5" />
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
          {/* Zeitfenster */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('timeWindows')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('minNotice')}</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="flex-1"
                      value={form.minBookingNoticeHours}
                      onChange={(e) => setForm({ ...form, minBookingNoticeHours: parseInt(e.target.value) || 0 })}
                      readOnly={!editing}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('hours')}</span>
                  </div>
                </Field>
                <Field>
                  <FieldLabel>{t('cancellationDeadline')}</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="flex-1"
                      value={form.cancellationPolicyHours}
                      onChange={(e) => setForm({ ...form, cancellationPolicyHours: parseInt(e.target.value) || 0 })}
                      readOnly={!editing}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('hours')}</span>
                  </div>
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>

          {/* Vorausbuchung */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('advanceBooking')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('maxAdvance')}</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="flex-1"
                      value={form.maxAdvanceBookingDays}
                      onChange={(e) => setForm({ ...form, maxAdvanceBookingDays: parseInt(e.target.value) || 1 })}
                      readOnly={!editing}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('days')}</span>
                  </div>
                </Field>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel>{t('waitlist')}</FieldLabel>
                    <FieldDescription>{t('waitlistDesc')}</FieldDescription>
                  </FieldContent>
                  <Switch
                    checked={form.allowWaitlist}
                    onCheckedChange={(checked) => setForm({ ...form, allowWaitlist: checked })}
                    disabled={!editing}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>

          {/* Bestätigung */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('confirmation')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel>{t('emailConfirmation')}</FieldLabel>
                    <FieldDescription>{t('emailConfirmationDesc')}</FieldDescription>
                  </FieldContent>
                  <Switch
                    checked={form.requireEmailConfirmation}
                    onCheckedChange={(checked) => setForm({ ...form, requireEmailConfirmation: checked })}
                    disabled={!editing}
                  />
                </Field>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel>{t('adminApproval')}</FieldLabel>
                    <FieldDescription>{t('adminApprovalDesc')}</FieldDescription>
                  </FieldContent>
                  <Switch
                    checked={form.requireApproval}
                    onCheckedChange={(checked) => setForm({ ...form, requireApproval: checked })}
                    disabled={!editing}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
