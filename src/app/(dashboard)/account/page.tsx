'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/forms'
import { FormInput, FormTextarea } from '@/components/forms/FormField'
import {
  Building2, FileText, Phone, Mail, MapPin, Globe, Users,
  Instagram, Facebook, Linkedin, Twitter, Pencil, Loader2
} from 'lucide-react'

interface Business {
  id: string
  name: string
  slug: string
  type: string
  // Profile
  tagline: string | null
  description: string | null
  foundedYear: number | null
  // Legal
  legalName: string | null
  legalForm: string | null
  registrationNumber: string | null
  registrationCourt: string | null
  // Contact
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  // Social
  socialInstagram: string | null
  socialFacebook: string | null
  socialLinkedin: string | null
  socialTwitter: string | null
}

export default function AccountPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [editSection, setEditSection] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: '',
    slug: '',
    type: '',
    tagline: '',
    description: '',
    foundedYear: '',
  })

  const [legalForm, setLegalForm] = useState({
    legalName: '',
    legalForm: '',
    registrationNumber: '',
    registrationCourt: '',
  })

  const [contactForm, setContactForm] = useState({
    email: '',
    phone: '',
    address: '',
    website: '',
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
      setProfileForm({
        name: business.name || '',
        slug: business.slug || '',
        type: business.type || '',
        tagline: business.tagline || '',
        description: business.description || '',
        foundedYear: business.foundedYear?.toString() || '',
      })
      setLegalForm({
        legalName: business.legalName || '',
        legalForm: business.legalForm || '',
        registrationNumber: business.registrationNumber || '',
        registrationCourt: business.registrationCourt || '',
      })
      setContactForm({
        email: business.email || '',
        phone: business.phone || '',
        address: business.address || '',
        website: business.website || '',
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
        <h1 className="text-2xl font-bold text-gray-900">Konto</h1>
        <p className="text-gray-600">Ihre Unternehmensidentität und rechtliche Angaben</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Business Profile */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Geschäftsprofil
              </CardTitle>
              <CardDescription>Grundlegende Informationen zu Ihrem Unternehmen</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('profile')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Geschäftsname</label>
              <p className="mt-1 font-medium">{business.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Buchungs-URL</label>
              <p className="mt-1">
                <code className="rounded bg-gray-100 px-2 py-1 text-sm">/book/{business.slug}</code>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Branche</label>
              <p className="mt-1 capitalize">{business.type}</p>
            </div>
            {business.tagline && (
              <div>
                <label className="text-sm font-medium text-gray-500">Slogan</label>
                <p className="mt-1 italic text-gray-600">&quot;{business.tagline}&quot;</p>
              </div>
            )}
            {business.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">Beschreibung</label>
                <p className="mt-1 text-sm text-gray-600 line-clamp-3">{business.description}</p>
              </div>
            )}
            {business.foundedYear && (
              <div>
                <label className="text-sm font-medium text-gray-500">Gegründet</label>
                <p className="mt-1">{business.foundedYear}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legal Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Rechtliche Angaben
              </CardTitle>
              <CardDescription>Handelsregister und Impressum (für Rechnungen)</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('legal')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {business.legalName ? (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-500">Firmenname (rechtlich)</label>
                  <p className="mt-1">{business.legalName}</p>
                </div>
                {business.legalForm && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Rechtsform</label>
                    <p className="mt-1">{business.legalForm}</p>
                  </div>
                )}
                {business.registrationNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Handelsregisternummer</label>
                    <p className="mt-1">{business.registrationNumber}</p>
                  </div>
                )}
                {business.registrationCourt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Registergericht</label>
                    <p className="mt-1">{business.registrationCourt}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400">Keine rechtlichen Angaben hinterlegt</p>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Kontaktdaten
              </CardTitle>
              <CardDescription>So erreichen Kunden Sie</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('contact')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {business.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{business.email}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{business.phone}</span>
              </div>
            )}
            {business.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{business.address}</span>
              </div>
            )}
            {business.website && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-gray-400" />
                <a href={business.website} className="text-primary hover:underline" target="_blank">
                  {business.website}
                </a>
              </div>
            )}
            {!business.email && !business.phone && !business.address && !business.website && (
              <p className="text-sm text-gray-400">Keine Kontaktdaten hinterlegt</p>
            )}
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Social Media
              </CardTitle>
              <CardDescription>Ihre Profile in sozialen Netzwerken</CardDescription>
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
              <p className="text-sm text-gray-400">Keine Social Media Profile hinterlegt</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profile Edit Dialog */}
      <FormDialog
        open={editSection === 'profile'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title="Geschäftsprofil bearbeiten"
        onSubmit={() => handleSave('profile', {
          ...profileForm,
          foundedYear: profileForm.foundedYear ? parseInt(profileForm.foundedYear) : null,
        })}
        isSubmitting={isSaving}
      >
        <FormInput
          label="Geschäftsname"
          name="name"
          required
          value={profileForm.name}
          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
        />
        <FormInput
          label="URL-Slug"
          name="slug"
          required
          value={profileForm.slug}
          onChange={(e) => setProfileForm({ ...profileForm, slug: e.target.value })}
          description="Wird in der Buchungs-URL verwendet: /book/ihr-slug"
        />
        <div className="space-y-2">
          <label className="text-sm font-medium">Branche</label>
          <select
            value={profileForm.type}
            onChange={(e) => setProfileForm({ ...profileForm, type: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="clinic">Praxis / Klinik</option>
            <option value="salon">Salon / Studio</option>
            <option value="consultant">Beratung</option>
            <option value="gym">Fitnessstudio</option>
            <option value="other">Sonstiges</option>
          </select>
        </div>
        <FormInput
          label="Slogan / Tagline"
          name="tagline"
          value={profileForm.tagline}
          onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
          placeholder="z.B. &quot;Ihr Partner für Gesundheit&quot;"
        />
        <FormTextarea
          label="Beschreibung / Über uns"
          name="description"
          value={profileForm.description}
          onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
          placeholder="Beschreiben Sie Ihr Unternehmen..."
          rows={4}
        />
        <FormInput
          label="Gründungsjahr"
          name="foundedYear"
          type="number"
          value={profileForm.foundedYear}
          onChange={(e) => setProfileForm({ ...profileForm, foundedYear: e.target.value })}
          placeholder="z.B. 2020"
        />
      </FormDialog>

      {/* Legal Edit Dialog */}
      <FormDialog
        open={editSection === 'legal'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title="Rechtliche Angaben bearbeiten"
        onSubmit={() => handleSave('legal', legalForm)}
        isSubmitting={isSaving}
      >
        <FormInput
          label="Firmenname (rechtlich)"
          name="legalName"
          value={legalForm.legalName}
          onChange={(e) => setLegalForm({ ...legalForm, legalName: e.target.value })}
          placeholder="Muster GmbH"
          description="Offizieller Name laut Handelsregister"
        />
        <div className="space-y-2">
          <label className="text-sm font-medium">Rechtsform</label>
          <select
            value={legalForm.legalForm}
            onChange={(e) => setLegalForm({ ...legalForm, legalForm: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Bitte wählen...</option>
            <option value="Einzelunternehmer">Einzelunternehmer</option>
            <option value="GbR">GbR (Gesellschaft bürgerlichen Rechts)</option>
            <option value="GmbH">GmbH (Gesellschaft mit beschränkter Haftung)</option>
            <option value="UG">UG (haftungsbeschränkt)</option>
            <option value="OHG">OHG (Offene Handelsgesellschaft)</option>
            <option value="KG">KG (Kommanditgesellschaft)</option>
            <option value="AG">AG (Aktiengesellschaft)</option>
            <option value="e.K.">e.K. (eingetragener Kaufmann)</option>
            <option value="Freiberufler">Freiberufler</option>
          </select>
        </div>
        <FormInput
          label="Handelsregisternummer"
          name="registrationNumber"
          value={legalForm.registrationNumber}
          onChange={(e) => setLegalForm({ ...legalForm, registrationNumber: e.target.value })}
          placeholder="z.B. HRB 12345"
        />
        <FormInput
          label="Registergericht"
          name="registrationCourt"
          value={legalForm.registrationCourt}
          onChange={(e) => setLegalForm({ ...legalForm, registrationCourt: e.target.value })}
          placeholder="z.B. Amtsgericht Berlin-Charlottenburg"
        />
      </FormDialog>

      {/* Contact Edit Dialog */}
      <FormDialog
        open={editSection === 'contact'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title="Kontaktdaten bearbeiten"
        onSubmit={() => handleSave('contact', contactForm)}
        isSubmitting={isSaving}
      >
        <FormInput
          label="E-Mail"
          name="email"
          type="email"
          value={contactForm.email}
          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
          placeholder="kontakt@beispiel.de"
        />
        <FormInput
          label="Telefon"
          name="phone"
          value={contactForm.phone}
          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
          placeholder="+49 123 456789"
        />
        <FormInput
          label="Adresse"
          name="address"
          value={contactForm.address}
          onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
          placeholder="Musterstraße 1, 12345 Berlin"
        />
        <FormInput
          label="Website"
          name="website"
          value={contactForm.website}
          onChange={(e) => setContactForm({ ...contactForm, website: e.target.value })}
          placeholder="https://www.beispiel.de"
        />
      </FormDialog>

      {/* Social Media Edit Dialog */}
      <FormDialog
        open={editSection === 'social'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title="Social Media bearbeiten"
        onSubmit={() => handleSave('social', socialForm)}
        isSubmitting={isSaving}
      >
        <FormInput
          label="Instagram"
          name="socialInstagram"
          value={socialForm.socialInstagram}
          onChange={(e) => setSocialForm({ ...socialForm, socialInstagram: e.target.value })}
          placeholder="benutzername (ohne @)"
        />
        <FormInput
          label="Facebook"
          name="socialFacebook"
          value={socialForm.socialFacebook}
          onChange={(e) => setSocialForm({ ...socialForm, socialFacebook: e.target.value })}
          placeholder="seitenname"
        />
        <FormInput
          label="LinkedIn"
          name="socialLinkedin"
          value={socialForm.socialLinkedin}
          onChange={(e) => setSocialForm({ ...socialForm, socialLinkedin: e.target.value })}
          placeholder="firmenname"
        />
        <FormInput
          label="Twitter / X"
          name="socialTwitter"
          value={socialForm.socialTwitter}
          onChange={(e) => setSocialForm({ ...socialForm, socialTwitter: e.target.value })}
          placeholder="benutzername (ohne @)"
        />
      </FormDialog>
    </div>
  )
}
