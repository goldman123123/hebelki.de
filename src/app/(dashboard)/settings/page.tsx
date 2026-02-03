'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/forms'
import { FormInput, FormCheckbox } from '@/components/forms/FormField'
import { Globe, Mail, Phone, MapPin, Clock, Calendar, Pencil, Loader2 } from 'lucide-react'

interface Business {
  id: string
  name: string
  slug: string
  type: string
  logoUrl: string | null
  primaryColor: string | null
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  timezone: string | null
  currency: string | null
  minBookingNoticeHours: number | null
  maxAdvanceBookingDays: number | null
  cancellationPolicyHours: number | null
  requireApproval: boolean | null
  allowWaitlist: boolean | null
}

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit dialogs
  const [editSection, setEditSection] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form states
  const [businessForm, setBusinessForm] = useState({
    name: '',
    slug: '',
    type: '',
    logoUrl: '',
    primaryColor: '',
  })

  const [contactForm, setContactForm] = useState({
    email: '',
    phone: '',
    address: '',
    website: '',
  })

  const [policiesForm, setPoliciesForm] = useState({
    minBookingNoticeHours: 24,
    maxAdvanceBookingDays: 60,
    cancellationPolicyHours: 24,
    requireApproval: false,
    allowWaitlist: true,
  })

  const [regionalForm, setRegionalForm] = useState({
    timezone: '',
    currency: '',
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
      setBusinessForm({
        name: business.name || '',
        slug: business.slug || '',
        type: business.type || '',
        logoUrl: business.logoUrl || '',
        primaryColor: business.primaryColor || '#3B82F6',
      })
      setContactForm({
        email: business.email || '',
        phone: business.phone || '',
        address: business.address || '',
        website: business.website || '',
      })
      setPoliciesForm({
        minBookingNoticeHours: business.minBookingNoticeHours || 24,
        maxAdvanceBookingDays: business.maxAdvanceBookingDays || 60,
        cancellationPolicyHours: business.cancellationPolicyHours || 24,
        requireApproval: business.requireApproval ?? false,
        allowWaitlist: business.allowWaitlist ?? true,
      })
      setRegionalForm({
        timezone: business.timezone || 'Europe/Berlin',
        currency: business.currency || 'EUR',
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
        <p className="text-gray-500">No business configured.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your business settings</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Business Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Basic details about your business</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('business')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="mt-1">{business.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <p className="mt-1 capitalize">{business.type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Booking URL</label>
              <p className="mt-1">
                <code className="rounded bg-gray-100 px-2 py-1 text-sm">
                  /book/{business.slug}
                </code>
              </p>
            </div>
            {business.logoUrl && (
              <div>
                <label className="text-sm font-medium text-gray-500">Logo</label>
                <img
                  src={business.logoUrl}
                  alt={business.name}
                  className="mt-2 h-12 w-auto"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Primary Color</label>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded border"
                  style={{ backgroundColor: business.primaryColor || '#3B82F6' }}
                />
                <code className="text-sm">{business.primaryColor}</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How customers can reach you</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('contact')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {business.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <span>{business.email}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <span>{business.phone}</span>
              </div>
            )}
            {business.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <span>{business.address}</span>
              </div>
            )}
            {business.website && (
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-gray-400" />
                <a
                  href={business.website}
                  className="text-primary hover:underline"
                  target="_blank"
                >
                  {business.website}
                </a>
              </div>
            )}
            {!business.email && !business.phone && !business.address && !business.website && (
              <p className="text-gray-500">No contact information configured</p>
            )}
          </CardContent>
        </Card>

        {/* Booking Policies */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Booking Policies</CardTitle>
              <CardDescription>Rules for customer bookings</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('policies')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium">Minimum Notice</p>
                <p className="text-sm text-gray-500">
                  {business.minBookingNoticeHours || 24} hours before appointment
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium">Advance Booking</p>
                <p className="text-sm text-gray-500">
                  Up to {business.maxAdvanceBookingDays || 60} days in advance
                </p>
              </div>
            </div>
            <div>
              <p className="font-medium">Cancellation Policy</p>
              <p className="text-sm text-gray-500">
                {business.cancellationPolicyHours || 24} hours notice required
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Require Approval:</span>
              <Badge variant={business.requireApproval ? 'default' : 'outline'}>
                {business.requireApproval ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Waitlist:</span>
              <Badge variant={business.allowWaitlist ? 'default' : 'outline'}>
                {business.allowWaitlist ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Regional Settings</CardTitle>
              <CardDescription>Timezone and currency settings</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('regional')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Timezone</label>
              <p className="mt-1">{business.timezone || 'Europe/Berlin'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Currency</label>
              <p className="mt-1">{business.currency || 'EUR'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Info Edit Dialog */}
      <FormDialog
        open={editSection === 'business'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title="Edit Business Information"
        onSubmit={() => handleSave('business', businessForm)}
        isSubmitting={isSaving}
      >
        <FormInput
          label="Business Name"
          name="name"
          required
          value={businessForm.name}
          onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
        />
        <FormInput
          label="URL Slug"
          name="slug"
          required
          value={businessForm.slug}
          onChange={(e) => setBusinessForm({ ...businessForm, slug: e.target.value })}
          description="Used in booking URL: /book/your-slug"
        />
        <div className="space-y-2">
          <label className="text-sm font-medium">Business Type</label>
          <select
            value={businessForm.type}
            onChange={(e) => setBusinessForm({ ...businessForm, type: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="clinic">Clinic</option>
            <option value="salon">Salon</option>
            <option value="consultant">Consultant</option>
            <option value="gym">Gym</option>
            <option value="other">Other</option>
          </select>
        </div>
        <FormInput
          label="Logo URL"
          name="logoUrl"
          value={businessForm.logoUrl}
          onChange={(e) => setBusinessForm({ ...businessForm, logoUrl: e.target.value })}
          placeholder="https://..."
        />
        <div className="space-y-2">
          <label className="text-sm font-medium">Primary Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={businessForm.primaryColor}
              onChange={(e) => setBusinessForm({ ...businessForm, primaryColor: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded border"
            />
            <input
              type="text"
              value={businessForm.primaryColor}
              onChange={(e) => setBusinessForm({ ...businessForm, primaryColor: e.target.value })}
              className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="#3B82F6"
            />
          </div>
        </div>
      </FormDialog>

      {/* Contact Info Edit Dialog */}
      <FormDialog
        open={editSection === 'contact'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title="Edit Contact Information"
        onSubmit={() => handleSave('contact', contactForm)}
        isSubmitting={isSaving}
      >
        <FormInput
          label="Email"
          name="email"
          type="email"
          value={contactForm.email}
          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
          placeholder="contact@example.com"
        />
        <FormInput
          label="Phone"
          name="phone"
          value={contactForm.phone}
          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
          placeholder="+49 123 456789"
        />
        <FormInput
          label="Address"
          name="address"
          value={contactForm.address}
          onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
          placeholder="123 Main St, City"
        />
        <FormInput
          label="Website"
          name="website"
          value={contactForm.website}
          onChange={(e) => setContactForm({ ...contactForm, website: e.target.value })}
          placeholder="https://example.com"
        />
      </FormDialog>

      {/* Booking Policies Edit Dialog */}
      <FormDialog
        open={editSection === 'policies'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title="Edit Booking Policies"
        onSubmit={() => handleSave('policies', policiesForm)}
        isSubmitting={isSaving}
      >
        <FormInput
          label="Minimum Notice (hours)"
          name="minBookingNoticeHours"
          type="number"
          value={policiesForm.minBookingNoticeHours}
          onChange={(e) => setPoliciesForm({ ...policiesForm, minBookingNoticeHours: parseInt(e.target.value) || 0 })}
          description="How far in advance bookings must be made"
        />
        <FormInput
          label="Maximum Advance Booking (days)"
          name="maxAdvanceBookingDays"
          type="number"
          value={policiesForm.maxAdvanceBookingDays}
          onChange={(e) => setPoliciesForm({ ...policiesForm, maxAdvanceBookingDays: parseInt(e.target.value) || 1 })}
          description="How far ahead customers can book"
        />
        <FormInput
          label="Cancellation Notice (hours)"
          name="cancellationPolicyHours"
          type="number"
          value={policiesForm.cancellationPolicyHours}
          onChange={(e) => setPoliciesForm({ ...policiesForm, cancellationPolicyHours: parseInt(e.target.value) || 0 })}
          description="Required notice for cancellations"
        />
        <FormCheckbox
          label="Require Approval"
          name="requireApproval"
          description="Bookings require manual approval before confirmation"
          checked={policiesForm.requireApproval}
          onChange={(e) => setPoliciesForm({ ...policiesForm, requireApproval: e.target.checked })}
        />
        <FormCheckbox
          label="Enable Waitlist"
          name="allowWaitlist"
          description="Allow customers to join a waitlist when no slots available"
          checked={policiesForm.allowWaitlist}
          onChange={(e) => setPoliciesForm({ ...policiesForm, allowWaitlist: e.target.checked })}
        />
      </FormDialog>

      {/* Regional Settings Edit Dialog */}
      <FormDialog
        open={editSection === 'regional'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title="Edit Regional Settings"
        onSubmit={() => handleSave('regional', regionalForm)}
        isSubmitting={isSaving}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Timezone</label>
          <select
            value={regionalForm.timezone}
            onChange={(e) => setRegionalForm({ ...regionalForm, timezone: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="Europe/Berlin">Europe/Berlin</option>
            <option value="Europe/London">Europe/London</option>
            <option value="Europe/Paris">Europe/Paris</option>
            <option value="Europe/Rome">Europe/Rome</option>
            <option value="Europe/Madrid">Europe/Madrid</option>
            <option value="Europe/Amsterdam">Europe/Amsterdam</option>
            <option value="Europe/Vienna">Europe/Vienna</option>
            <option value="Europe/Zurich">Europe/Zurich</option>
            <option value="America/New_York">America/New_York</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
            <option value="America/Chicago">America/Chicago</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Currency</label>
          <select
            value={regionalForm.currency}
            onChange={(e) => setRegionalForm({ ...regionalForm, currency: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="EUR">EUR - Euro</option>
            <option value="USD">USD - US Dollar</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="CHF">CHF - Swiss Franc</option>
            <option value="GYD">GYD - Guyanese Dollar</option>
          </select>
        </div>
      </FormDialog>
    </div>
  )
}
