'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/forms'
import { FormInput, FormCheckbox } from '@/components/forms/FormField'
import { Receipt, Pencil, Loader2, FileText } from 'lucide-react'

interface BusinessSettings {
  taxId?: string
  taxRate?: number
  isKleinunternehmer?: boolean
  showLogoOnInvoice?: boolean
}

interface Business {
  id: string
  name: string
  settings: BusinessSettings | null
}

export default function SteuernPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [editSection, setEditSection] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [taxForm, setTaxForm] = useState({
    taxId: '',
    taxRate: 19,
    isKleinunternehmer: false,
    showLogoOnInvoice: true,
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
      setTaxForm({
        taxId: business.settings?.taxId || '',
        taxRate: business.settings?.taxRate ?? 19,
        isKleinunternehmer: business.settings?.isKleinunternehmer ?? false,
        showLogoOnInvoice: business.settings?.showLogoOnInvoice ?? true,
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Steuern & Rechnungen</h1>
        <p className="text-gray-600">Umsatzsteuer und Rechnungseinstellungen</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
            <div className="border-t pt-4">
              <span className="font-medium">Logo auf Rechnung:</span>{' '}
              <Badge variant={business.settings?.showLogoOnInvoice !== false ? 'default' : 'outline'}>
                {business.settings?.showLogoOnInvoice !== false ? 'Aktiviert' : 'Deaktiviert'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Format (Placeholder) */}
        <Card className="border-dashed">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-400">
                <FileText className="h-5 w-5" />
                Rechnungsformat
              </CardTitle>
              <CardDescription>Anpassungen für Rechnungen (in Entwicklung)</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Hier werden zukünftig erweiterte Optionen verfügbar sein:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-400">
                <li>- Rechnungsnummernformat</li>
                <li>- Fußzeile / Bankverbindung</li>
                <li>- Zahlungsbedingungen</li>
                <li>- E-Mail Vorlagen</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

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
    </div>
  )
}
