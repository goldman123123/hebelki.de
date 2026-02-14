'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet,
} from '@/components/ui/field'
import {
  Building2, Pencil, ExternalLink, Copy, Check, Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { Business } from '../types'

interface BusinessProfileCardProps {
  business: Business
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onRefresh: () => Promise<void>
}

export function BusinessProfileCard({
  business,
  editing,
  onEdit,
  onCancel,
  onRefresh,
}: BusinessProfileCardProps) {
  const t = useTranslations('dashboard.business.profile')
  const tc = useTranslations('dashboard.business')
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [profileForm, setProfileForm] = useState({
    name: '',
    slug: '',
    type: '',
    tagline: '',
    description: '',
    foundedYear: '',
    address: '',
    website: '',
    timezone: 'Europe/Berlin',
    currency: 'EUR',
  })

  const [contactForm, setContactForm] = useState({
    email: '',
    phone: '',
  })

  const [legalForm, setLegalForm] = useState({
    legalName: '',
    legalForm: '',
    registrationNumber: '',
    registrationCourt: '',
  })

  const [taxForm, setTaxForm] = useState({
    taxId: '',
    taxRate: 19,
    isKleinunternehmer: false,
    showLogoOnInvoice: true,
  })

  function resetForm() {
    setProfileForm({
      name: business.name || '',
      slug: business.slug || '',
      type: business.type || '',
      tagline: business.tagline || '',
      description: business.description || '',
      foundedYear: business.foundedYear?.toString() || '',
      address: business.address || '',
      website: business.website || '',
      timezone: business.timezone || 'Europe/Berlin',
      currency: business.currency || 'EUR',
    })
    setContactForm({
      email: business.email || '',
      phone: business.phone || '',
    })
    setLegalForm({
      legalName: business.legalName || '',
      legalForm: business.legalForm || '',
      registrationNumber: business.registrationNumber || '',
      registrationCourt: business.registrationCourt || '',
    })
    setTaxForm({
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

  function copyBookingUrl() {
    if (business.slug) {
      navigator.clipboard.writeText(`https://hebelki.de/book/${business.slug}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const results = await Promise.all([
        fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: 'profile',
            data: {
              name: profileForm.name,
              slug: profileForm.slug,
              type: profileForm.type,
              tagline: profileForm.tagline || null,
              description: profileForm.description || null,
              foundedYear: profileForm.foundedYear ? parseInt(profileForm.foundedYear) : null,
            },
          }),
        }),
        fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: 'contact',
            data: {
              email: contactForm.email,
              phone: contactForm.phone,
              address: profileForm.address || null,
              website: profileForm.website || null,
            },
          }),
        }),
        fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: 'regional',
            data: {
              timezone: profileForm.timezone,
              currency: profileForm.currency,
            },
          }),
        }),
        fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: 'legal',
            data: {
              legalName: legalForm.legalName || null,
              legalForm: legalForm.legalForm || null,
              registrationNumber: legalForm.registrationNumber || null,
              registrationCourt: legalForm.registrationCourt || null,
            },
          }),
        }),
        fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: 'tax',
            data: taxForm,
          }),
        }),
      ])

      if (results.every((r) => r.ok)) {
        await onRefresh()
      }
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    resetForm()
    onCancel()
  }

  const taxRateLabel = taxForm.isKleinunternehmer
    ? t('kleinunternehmerLabel')
    : `${taxForm.taxRate}% MwSt.`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
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
          {/* Betrieb */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('business')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('name')}</FieldLabel>
                  <Input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    readOnly={!editing}
                    placeholder={t('namePlaceholder')}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t('founded')}</FieldLabel>
                  <Input
                    type="number"
                    value={profileForm.foundedYear}
                    onChange={(e) => setProfileForm({ ...profileForm, foundedYear: e.target.value })}
                    readOnly={!editing}
                    placeholder={t('foundedPlaceholder')}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t('phone')}</FieldLabel>
                  <Input
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    readOnly={!editing}
                    placeholder="+49 123 456789"
                  />
                </Field>
                <Field>
                  <FieldLabel>{t('email')}</FieldLabel>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    readOnly={!editing}
                    placeholder={t('emailPlaceholder')}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>

          {/* Standort & Register */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('locationRegister')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('address')}</FieldLabel>
                  <Textarea
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    readOnly={!editing}
                    placeholder={t('addressPlaceholder')}
                    rows={3}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t('registerNumber')}</FieldLabel>
                  <Input
                    value={legalForm.registrationNumber}
                    onChange={(e) => setLegalForm({ ...legalForm, registrationNumber: e.target.value })}
                    readOnly={!editing}
                    placeholder={t('registerPlaceholder')}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t('taxId')}</FieldLabel>
                  <Input
                    value={taxForm.taxId}
                    onChange={(e) => setTaxForm({ ...taxForm, taxId: e.target.value })}
                    readOnly={!editing}
                    placeholder={t('taxIdPlaceholder')}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>

          {/* Rechtliches & Steuern */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('legalTax')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('companyName')}</FieldLabel>
                  <Input
                    value={legalForm.legalName}
                    onChange={(e) => setLegalForm({ ...legalForm, legalName: e.target.value })}
                    readOnly={!editing}
                    placeholder={t('companyNamePlaceholder')}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t('legalForm')}</FieldLabel>
                  {editing ? (
                    <Select
                      value={legalForm.legalForm || undefined}
                      onValueChange={(value) => setLegalForm({ ...legalForm, legalForm: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('legalFormPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Einzelunternehmer">Einzelunternehmer</SelectItem>
                        <SelectItem value="Freiberufler">Freiberufler</SelectItem>
                        <SelectItem value="GbR">GbR</SelectItem>
                        <SelectItem value="GmbH">GmbH</SelectItem>
                        <SelectItem value="UG">UG (haftungsbeschränkt)</SelectItem>
                        <SelectItem value="OHG">OHG</SelectItem>
                        <SelectItem value="KG">KG</SelectItem>
                        <SelectItem value="AG">AG</SelectItem>
                        <SelectItem value="e.K.">e.K.</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input readOnly value={legalForm.legalForm || ''} placeholder={t('legalFormPlaceholder')} />
                  )}
                </Field>
                <Field>
                  <FieldLabel>{t('registrationCourt')}</FieldLabel>
                  <Input
                    value={legalForm.registrationCourt}
                    onChange={(e) => setLegalForm({ ...legalForm, registrationCourt: e.target.value })}
                    readOnly={!editing}
                    placeholder={t('registrationCourtPlaceholder')}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t('taxRate')}</FieldLabel>
                  {editing ? (
                    <Select
                      value={String(taxForm.taxRate)}
                      onValueChange={(value) => setTaxForm({ ...taxForm, taxRate: parseInt(value) })}
                      disabled={taxForm.isKleinunternehmer}
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
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel>{t('kleinunternehmer')}</FieldLabel>
                    <FieldDescription>{t('kleinunternehmerDesc')}</FieldDescription>
                  </FieldContent>
                  <Switch
                    checked={taxForm.isKleinunternehmer}
                    onCheckedChange={(checked) => setTaxForm({ ...taxForm, isKleinunternehmer: checked })}
                    disabled={!editing}
                  />
                </Field>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel>{t('logoOnInvoice')}</FieldLabel>
                    <FieldDescription>{t('logoOnInvoiceDesc')}</FieldDescription>
                  </FieldContent>
                  <Switch
                    checked={taxForm.showLogoOnInvoice}
                    onCheckedChange={(checked) => setTaxForm({ ...taxForm, showLogoOnInvoice: checked })}
                    disabled={!editing}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>

          {/* Buchung & Online-Auftritt */}
          <div className="md:col-span-3 rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('bookingOnline')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('bookingUrl')}</FieldLabel>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">hebelki.de/book/</span>
                    <Input
                      className="flex-1"
                      value={profileForm.slug}
                      onChange={(e) => setProfileForm({ ...profileForm, slug: e.target.value })}
                      readOnly={!editing}
                    />
                    {!editing && (
                      <>
                        <Button variant="outline" size="sm" onClick={copyBookingUrl}>
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Link href={`/book/${business.slug}`} target="_blank">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </Field>

                <Field>
                  <FieldLabel>{t('website')}</FieldLabel>
                  <Input
                    type="url"
                    value={profileForm.website}
                    onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                    readOnly={!editing}
                    placeholder={t('websitePlaceholder')}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>{t('timezone')}</FieldLabel>
                    {editing ? (
                      <Select
                        value={profileForm.timezone}
                        onValueChange={(value) => setProfileForm({ ...profileForm, timezone: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
                          <SelectItem value="Europe/Vienna">Europe/Vienna</SelectItem>
                          <SelectItem value="Europe/Zurich">Europe/Zurich</SelectItem>
                          <SelectItem value="Europe/London">Europe/London</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input readOnly value={profileForm.timezone || 'Europe/Berlin'} />
                    )}
                  </Field>
                  <Field>
                    <FieldLabel>{t('currency')}</FieldLabel>
                    {editing ? (
                      <Select
                        value={profileForm.currency}
                        onValueChange={(value) => setProfileForm({ ...profileForm, currency: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="CHF">CHF</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input readOnly value={profileForm.currency || 'EUR'} />
                    )}
                  </Field>
                </div>
              </FieldGroup>
            </FieldSet>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
