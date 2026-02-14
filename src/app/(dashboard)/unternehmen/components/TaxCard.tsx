'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet,
} from '@/components/ui/field'
import { Receipt, Pencil, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Business } from '../types'

interface TaxCardProps {
  business: Business
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (section: string, data: Record<string, unknown>) => Promise<boolean>
  isSaving: boolean
}

export function TaxCard({
  business,
  editing,
  onEdit,
  onCancel,
  onSave,
  isSaving,
}: TaxCardProps) {
  const t = useTranslations('dashboard.business.tax')
  const tc = useTranslations('dashboard.business')
  const [form, setForm] = useState({
    taxId: '',
    taxRate: 19,
    isKleinunternehmer: false,
    showLogoOnInvoice: true,
  })

  function resetForm() {
    setForm({
      taxId: business.settings?.taxId || '',
      taxRate: business.settings?.taxRate ?? 19,
      isKleinunternehmer: business.settings?.isKleinunternehmer ?? false,
      showLogoOnInvoice: business.settings?.showLogoOnInvoice ?? true,
    })
  }

  useEffect(() => {
    resetForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business])

  async function handleSave() {
    await onSave('tax', form)
  }

  function handleCancel() {
    resetForm()
    onCancel()
  }

  const taxRateLabel = form.isKleinunternehmer
    ? t('kleinunternehmerLabel')
    : `${form.taxRate}% MwSt.`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
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
          {/* Umsatzsteuer */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('vat')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('taxIdLabel')}</FieldLabel>
                  <Input
                    value={form.taxId}
                    onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                    readOnly={!editing}
                    placeholder={t('taxIdPlaceholder')}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t('taxRate')}</FieldLabel>
                  {editing ? (
                    <Select
                      value={String(form.taxRate)}
                      onValueChange={(value) => setForm({ ...form, taxRate: parseInt(value) })}
                      disabled={form.isKleinunternehmer}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="19">{t('taxRate19')}</SelectItem>
                        <SelectItem value="7">{t('taxRate7')}</SelectItem>
                        <SelectItem value="0">{t('taxRate0')}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input readOnly value={taxRateLabel} />
                  )}
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>

          {/* Sonderregeln */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('specialRules')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel>{t('kleinunternehmer')}</FieldLabel>
                    <FieldDescription>{t('kleinunternehmerDesc')}</FieldDescription>
                  </FieldContent>
                  <Switch
                    checked={form.isKleinunternehmer}
                    onCheckedChange={(checked) => setForm({ ...form, isKleinunternehmer: checked })}
                    disabled={!editing}
                  />
                </Field>
                {form.isKleinunternehmer && (
                  <p className="text-xs text-amber-600">
                    {t('kleinunternehmerNote')}
                  </p>
                )}
              </FieldGroup>
            </FieldSet>
          </div>

          {/* Rechnung */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('invoice')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel>{t('logoOnInvoice')}</FieldLabel>
                    <FieldDescription>{t('logoOnInvoiceDesc')}</FieldDescription>
                  </FieldContent>
                  <Switch
                    checked={form.showLogoOnInvoice}
                    onCheckedChange={(checked) => setForm({ ...form, showLogoOnInvoice: checked })}
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
