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
    ? 'Kleinunternehmer (§ 19)'
    : `${form.taxRate}% MwSt.`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Steuern & Rechnungen
        </CardTitle>
        <CardDescription>Umsatzsteuer und Rechnungseinstellungen</CardDescription>
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
        <div className="grid gap-4 md:grid-cols-3">
          {/* Umsatzsteuer */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">Umsatzsteuer</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>Steuernummer / USt-IdNr.</FieldLabel>
                  <Input
                    value={form.taxId}
                    onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                    readOnly={!editing}
                    placeholder="z.B. DE123456789"
                  />
                </Field>
                <Field>
                  <FieldLabel>Steuersatz</FieldLabel>
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
                        <SelectItem value="19">19% — Regelsteuersatz</SelectItem>
                        <SelectItem value="7">7% — Ermäßigt</SelectItem>
                        <SelectItem value="0">0% — Steuerfrei</SelectItem>
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
              <FieldLegend className="mb-1">Sonderregeln</FieldLegend>
              <FieldGroup className="gap-4">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel>Kleinunternehmer</FieldLabel>
                    <FieldDescription>§ 19 UStG — keine MwSt.</FieldDescription>
                  </FieldContent>
                  <Switch
                    checked={form.isKleinunternehmer}
                    onCheckedChange={(checked) => setForm({ ...form, isKleinunternehmer: checked })}
                    disabled={!editing}
                  />
                </Field>
                {form.isKleinunternehmer && (
                  <p className="text-xs text-amber-600">
                    Keine Umsatzsteuer auf Rechnungen ausgewiesen.
                  </p>
                )}
              </FieldGroup>
            </FieldSet>
          </div>

          {/* Rechnung */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">Rechnung</FieldLegend>
              <FieldGroup className="gap-4">
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel>Logo auf Rechnung</FieldLabel>
                    <FieldDescription>Im Briefkopf anzeigen</FieldDescription>
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
