'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/forms'
import { FormInput } from '@/components/forms/FormField'
import {
  Palette, Pencil, Loader2, Instagram, Facebook, Linkedin, Twitter,
  Image, ExternalLink, Users
} from 'lucide-react'
import Link from 'next/link'

interface Business {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  primaryColor: string | null
  socialInstagram: string | null
  socialFacebook: string | null
  socialLinkedin: string | null
  socialTwitter: string | null
}

export default function BrandingPage() {
  const t = useTranslations('dashboard.branding')
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [editSection, setEditSection] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'logo')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const { url } = await res.json()
        setBrandingForm({ ...brandingForm, logoUrl: url })
      }
    } finally {
      setIsUploading(false)
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
        {/* Appearance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {t('appearance')}
              </CardTitle>
              <CardDescription>{t('appearanceDesc')}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('branding')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">{t('logo')}</label>
              {business.logoUrl ? (
                <img
                  src={business.logoUrl}
                  alt={business.name}
                  className="mt-2 h-16 w-auto rounded border bg-white p-2"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-400">{t('noLogo')}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">{t('primaryColor')}</label>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded border"
                  style={{ backgroundColor: business.primaryColor || '#3B82F6' }}
                />
                <code className="text-sm">{business.primaryColor || '#3B82F6'}</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('socialMedia')}
              </CardTitle>
              <CardDescription>{t('socialMediaDesc')}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('social')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {business.socialInstagram && (
              <div className="flex items-center gap-3">
                <Instagram className="h-4 w-4 text-pink-500" />
                <a href={`https://instagram.com/${business.socialInstagram}`} className="text-primary hover:underline" target="_blank">
                  @{business.socialInstagram}
                </a>
              </div>
            )}
            {business.socialFacebook && (
              <div className="flex items-center gap-3">
                <Facebook className="h-4 w-4 text-blue-600" />
                <a href={`https://facebook.com/${business.socialFacebook}`} className="text-primary hover:underline" target="_blank">
                  {business.socialFacebook}
                </a>
              </div>
            )}
            {business.socialLinkedin && (
              <div className="flex items-center gap-3">
                <Linkedin className="h-4 w-4 text-blue-700" />
                <a href={`https://linkedin.com/company/${business.socialLinkedin}`} className="text-primary hover:underline" target="_blank">
                  {business.socialLinkedin}
                </a>
              </div>
            )}
            {business.socialTwitter && (
              <div className="flex items-center gap-3">
                <Twitter className="h-4 w-4 text-sky-500" />
                <a href={`https://twitter.com/${business.socialTwitter}`} className="text-primary hover:underline" target="_blank">
                  @{business.socialTwitter}
                </a>
              </div>
            )}
            {!business.socialInstagram && !business.socialFacebook && !business.socialLinkedin && !business.socialTwitter && (
              <p className="text-sm text-gray-400">{t('noSocialMedia')}</p>
            )}
          </CardContent>
        </Card>

        {/* Booking Page Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              {t('bookingPreview')}
            </CardTitle>
            <CardDescription>{t('bookingPreviewDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('bookingUrl')}</p>
                <code className="mt-1 block rounded bg-gray-100 px-3 py-2 text-sm">
                  hebelki.de/book/{business.slug}
                </code>
              </div>
              <div className="flex gap-2">
                <Link href={`/book/${business.slug}`} target="_blank">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t('openPreview')}
                  </Button>
                </Link>
              </div>
            </div>
            <div className="mt-6 rounded-lg border bg-gray-50 p-4">
              <div className="flex items-center gap-4">
                {business.logoUrl ? (
                  <img
                    src={business.logoUrl}
                    alt={business.name}
                    className="h-12 w-auto rounded"
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded text-white font-bold"
                    style={{ backgroundColor: business.primaryColor || '#3B82F6' }}
                  >
                    {business.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold" style={{ color: business.primaryColor || '#3B82F6' }}>
                    {business.name}
                  </p>
                  <p className="text-sm text-gray-500">{t('onlineBooking')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hidden file input for logo upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleLogoUpload}
      />

      {/* Branding Edit Dialog */}
      <FormDialog
        open={editSection === 'branding'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title={t('editAppearance')}
        onSubmit={() => handleSave('branding', brandingForm)}
        isSubmitting={isSaving}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('logo')}</label>
            <div className="flex items-center gap-4">
              {brandingForm.logoUrl ? (
                <img
                  src={brandingForm.logoUrl}
                  alt="Logo"
                  className="h-16 w-auto rounded border bg-white p-2"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded border bg-gray-50">
                  <Image className="h-8 w-8 text-gray-300" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('uploadLogo')}
                </Button>
                <p className="text-xs text-gray-500">{t('logoFileHint')}</p>
              </div>
            </div>
          </div>
          <FormInput
            label={t('logoUrlAlt')}
            name="logoUrl"
            value={brandingForm.logoUrl}
            onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
            placeholder="https://..."
            description={t('logoUrlDesc')}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('primaryColor')}</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandingForm.primaryColor}
                onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded border p-1"
              />
              <FormInput
                label=""
                name="primaryColor"
                value={brandingForm.primaryColor}
                onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </FormDialog>

      {/* Social Media Edit Dialog */}
      <FormDialog
        open={editSection === 'social'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title={t('editSocialMedia')}
        onSubmit={() => handleSave('social', socialForm)}
        isSubmitting={isSaving}
      >
        <FormInput
          label="Instagram"
          name="socialInstagram"
          value={socialForm.socialInstagram}
          onChange={(e) => setSocialForm({ ...socialForm, socialInstagram: e.target.value })}
          placeholder={t('username')}
        />
        <FormInput
          label="Facebook"
          name="socialFacebook"
          value={socialForm.socialFacebook}
          onChange={(e) => setSocialForm({ ...socialForm, socialFacebook: e.target.value })}
          placeholder={t('pageName')}
        />
        <FormInput
          label="LinkedIn"
          name="socialLinkedin"
          value={socialForm.socialLinkedin}
          onChange={(e) => setSocialForm({ ...socialForm, socialLinkedin: e.target.value })}
          placeholder={t('companyName')}
        />
        <FormInput
          label="Twitter / X"
          name="socialTwitter"
          value={socialForm.socialTwitter}
          onChange={(e) => setSocialForm({ ...socialForm, socialTwitter: e.target.value })}
          placeholder={t('username')}
        />
      </FormDialog>
    </div>
  )
}
