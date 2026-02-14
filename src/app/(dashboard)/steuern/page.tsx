'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('dashboard.taxes')
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
        <p className="text-gray-500">{t('noBusiness')}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600">{t('subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tax Settings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {t('taxSettings')}
              </CardTitle>
              <CardDescription>{t('taxSettingsDesc')}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('tax')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">{t('taxId')}</label>
              <p className="mt-1">{business.settings?.taxId || t('taxIdNotSet')}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{t('taxRate')}</span>
              <Badge variant="default">
                {business.settings?.isKleinunternehmer
                  ? t('kleinunternehmer')
                  : t('vatRate', { rate: business.settings?.taxRate ?? 19 })}
              </Badge>
            </div>
            {business.settings?.isKleinunternehmer && (
              <p className="text-sm text-amber-600">
                {t('kleinunternehmerNote')}
              </p>
            )}
            <div className="border-t pt-4">
              <span className="font-medium">{t('logoOnInvoice')}</span>{' '}
              <Badge variant={business.settings?.showLogoOnInvoice !== false ? 'default' : 'outline'}>
                {business.settings?.showLogoOnInvoice !== false ? t('enabled') : t('disabled')}
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
                {t('invoiceFormat')}
              </CardTitle>
              <CardDescription>{t('invoiceFormatDesc')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                {t('futureOptions')}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-400">
                <li>- {t('invoiceNumberFormat')}</li>
                <li>- {t('footerBankDetails')}</li>
                <li>- {t('paymentTerms')}</li>
                <li>- {t('emailTemplates')}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax Edit Dialog */}
      <FormDialog
        open={editSection === 'tax'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title={t('editTaxSettings')}
        onSubmit={() => handleSave('tax', taxForm)}
        isSubmitting={isSaving}
      >
        <FormInput
          label={t('taxIdLabel')}
          name="taxId"
          value={taxForm.taxId}
          onChange={(e) => setTaxForm({ ...taxForm, taxId: e.target.value })}
          placeholder={t('taxIdPlaceholder')}
          description={t('taxIdDesc')}
        />
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('taxRateLabel')}</label>
          <select
            value={taxForm.taxRate}
            onChange={(e) => setTaxForm({ ...taxForm, taxRate: parseInt(e.target.value) })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={taxForm.isKleinunternehmer}
          >
            <option value={19}>{t('taxRateStandard')}</option>
            <option value={7}>{t('taxRateReduced')}</option>
            <option value={0}>{t('taxRateFree')}</option>
          </select>
          <p className="text-xs text-gray-500">
            {t('taxRateHint')}
          </p>
        </div>
        <FormCheckbox
          label={t('kleinunternehmerLabel')}
          name="isKleinunternehmer"
          description={t('kleinunternehmerDesc')}
          checked={taxForm.isKleinunternehmer}
          onChange={(e) => setTaxForm({ ...taxForm, isKleinunternehmer: e.target.checked })}
        />
        {taxForm.isKleinunternehmer && (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <strong>Hinweis:</strong> {t('kleinunternehmerHint')}
          </div>
        )}
        <div className="border-t pt-4">
          <FormCheckbox
            label={t('showLogoLabel')}
            name="showLogoOnInvoice"
            description={t('showLogoDesc')}
            checked={taxForm.showLogoOnInvoice}
            onChange={(e) => setTaxForm({ ...taxForm, showLogoOnInvoice: e.target.checked })}
          />
        </div>
      </FormDialog>
    </div>
  )
}
