'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field, FieldGroup, FieldLabel, FieldLegend, FieldSet,
} from '@/components/ui/field'
import { Palette, Pencil, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Business } from '../types'

interface BrandingCardProps {
  business: Business
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (section: string, data: Record<string, unknown>) => Promise<boolean>
  isSaving: boolean
  onRefresh: () => Promise<void>
}

export function BrandingCard({
  business,
  editing,
  onEdit,
  onCancel,
  onSave,
  isSaving,
  onRefresh,
}: BrandingCardProps) {
  const t = useTranslations('dashboard.business.branding')
  const tc = useTranslations('dashboard.business')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const [brandingForm, setBrandingForm] = useState({
    logoUrl: '',
    primaryColor: '#3B82F6',
  })

  const [socialForm, setSocialForm] = useState({
    socialInstagram: '',
    socialFacebook: '',
    socialLinkedin: '',
    socialTwitter: '',
  })

  function resetForm() {
    setBrandingForm({
      logoUrl: business.logoUrl || '',
      primaryColor: business.primaryColor || '#3B82F6',
    })
    setSocialForm({
      socialInstagram: business.socialInstagram || '',
      socialFacebook: business.socialFacebook || '',
      socialLinkedin: business.socialLinkedin || '',
      socialTwitter: business.socialTwitter || '',
    })
  }

  useEffect(() => {
    resetForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'logo')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const { url } = await res.json()
        setBrandingForm({ ...brandingForm, logoUrl: url })
      }
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSave() {
    const results = await Promise.all([
      onSave('branding', brandingForm),
      onSave('social', socialForm),
    ])
    if (results.every(Boolean)) {
      await onRefresh()
    }
  }

  function handleCancel() {
    resetForm()
    onCancel()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
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
          {/* Erscheinungsbild */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('appearance')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('logoUrl')}</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      className="flex-1"
                      value={brandingForm.logoUrl}
                      onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                      readOnly={!editing}
                      placeholder="https://..."
                    />
                    {editing && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload'}
                      </Button>
                    )}
                  </div>
                </Field>
                <Field>
                  <FieldLabel>{t('primaryColor')}</FieldLabel>
                  <div className="flex items-center gap-2">
                    {editing && (
                      <input
                        type="color"
                        value={brandingForm.primaryColor}
                        onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                        className="h-9 w-12 cursor-pointer rounded border p-1"
                      />
                    )}
                    {!editing && (
                      <div
                        className="h-9 w-12 rounded border"
                        style={{ backgroundColor: brandingForm.primaryColor }}
                      />
                    )}
                    <Input
                      className="flex-1"
                      value={brandingForm.primaryColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      readOnly={!editing}
                      placeholder="#3B82F6"
                    />
                  </div>
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>

          {/* Social Media 1 */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('socialMedia')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('instagram')}</FieldLabel>
                  <Input
                    value={socialForm.socialInstagram}
                    onChange={(e) => setSocialForm({ ...socialForm, socialInstagram: e.target.value })}
                    readOnly={!editing}
                    placeholder={t('instagramPlaceholder')}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t('facebook')}</FieldLabel>
                  <Input
                    value={socialForm.socialFacebook}
                    onChange={(e) => setSocialForm({ ...socialForm, socialFacebook: e.target.value })}
                    readOnly={!editing}
                    placeholder={t('facebookPlaceholder')}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>

          {/* Social Media 2 */}
          <div className="rounded-lg border p-4">
            <FieldSet className="gap-3">
              <FieldLegend className="mb-1">{t('moreProfiles')}</FieldLegend>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('linkedin')}</FieldLabel>
                  <Input
                    value={socialForm.socialLinkedin}
                    onChange={(e) => setSocialForm({ ...socialForm, socialLinkedin: e.target.value })}
                    readOnly={!editing}
                    placeholder={t('linkedinPlaceholder')}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t('twitter')}</FieldLabel>
                  <Input
                    value={socialForm.socialTwitter}
                    onChange={(e) => setSocialForm({ ...socialForm, socialTwitter: e.target.value })}
                    readOnly={!editing}
                    placeholder={t('twitterPlaceholder')}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>
        </div>
      </CardContent>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleLogoUpload}
      />
    </Card>
  )
}
