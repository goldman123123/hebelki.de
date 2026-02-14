'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/forms'
import { FormInput, FormCheckbox } from '@/components/forms/FormField'
import { CalendarCheck, Clock, Calendar, Pencil, Loader2, Ban, Users, Mail, ShieldCheck } from 'lucide-react'

interface Business {
  id: string
  name: string
  minBookingNoticeHours: number | null
  maxAdvanceBookingDays: number | null
  cancellationPolicyHours: number | null
  requireApproval: boolean | null
  requireEmailConfirmation: boolean | null
  allowWaitlist: boolean | null
}

export default function BuchungsregelnPage() {
  const t = useTranslations('dashboard.bookingRules')
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [editSection, setEditSection] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [policiesForm, setPoliciesForm] = useState({
    minBookingNoticeHours: 24,
    maxAdvanceBookingDays: 60,
    cancellationPolicyHours: 24,
    requireApproval: false,
    requireEmailConfirmation: false,
    allowWaitlist: true,
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
      setPoliciesForm({
        minBookingNoticeHours: business.minBookingNoticeHours || 24,
        maxAdvanceBookingDays: business.maxAdvanceBookingDays || 60,
        cancellationPolicyHours: business.cancellationPolicyHours || 24,
        requireApproval: business.requireApproval ?? false,
        requireEmailConfirmation: business.requireEmailConfirmation ?? false,
        allowWaitlist: business.allowWaitlist ?? true,
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

  // Determine confirmation flow description
  function getConfirmationFlowLabel() {
    const emailConf = business?.requireEmailConfirmation
    const adminApproval = business?.requireApproval
    if (emailConf && adminApproval) return t('flowBoth')
    if (emailConf) return t('flowEmail')
    if (adminApproval) return t('flowAdmin')
    return t('flowAuto')
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600">{t('subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking Policies */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5" />
                {t('policies')}
              </CardTitle>
              <CardDescription>{t('policiesDesc')}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditSection('policies')}>
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium">{t('minNotice')}</p>
                <p className="text-sm text-gray-500">{t('minNoticeValue', { hours: business.minBookingNoticeHours || 24 })}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium">{t('maxAdvance')}</p>
                <p className="text-sm text-gray-500">{t('maxAdvanceValue', { days: business.maxAdvanceBookingDays || 60 })}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Ban className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium">{t('cancellationPolicy')}</p>
                <p className="text-sm text-gray-500">{t('cancellationValue', { hours: business.cancellationPolicyHours || 24 })}</p>
              </div>
            </div>
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">{t('emailConfirmation')}</p>
                  <p className="text-xs text-gray-500">
                    {business.requireEmailConfirmation
                      ? t('emailConfirmationDesc')
                      : t('emailConfirmationDisabled')}
                  </p>
                </div>
                <Badge variant={business.requireEmailConfirmation ? 'default' : 'outline'} className="ml-auto">
                  {business.requireEmailConfirmation ? t('on') : t('off')}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">{t('adminApproval')}</p>
                  <p className="text-xs text-gray-500">
                    {business.requireApproval
                      ? t('adminApprovalDesc')
                      : t('adminApprovalDisabled')}
                  </p>
                </div>
                <Badge variant={business.requireApproval ? 'default' : 'outline'} className="ml-auto">
                  {business.requireApproval ? t('on') : t('off')}
                </Badge>
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  {getConfirmationFlowLabel()}
                </Badge>
                <Badge variant={business.allowWaitlist ? 'outline' : 'secondary'} className="text-xs">
                  {business.allowWaitlist ? t('waitlistActive') : t('waitlistInactive')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Extended Rules (Placeholder) */}
        <Card className="border-dashed">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-400">
                <Users className="h-5 w-5" />
                {t('extendedRules')}
              </CardTitle>
              <CardDescription>{t('extendedRulesDesc')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                {t('futureOptions')}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-400">
                <li>- {t('deposit')}</li>
                <li>- {t('noShowFees')}</li>
                <li>- {t('groupBookings')}</li>
                <li>- {t('recurringBookings')}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policies Edit Dialog */}
      <FormDialog
        open={editSection === 'policies'}
        onOpenChange={(open) => !open && setEditSection(null)}
        title={t('editPolicies')}
        onSubmit={() => handleSave('policies', policiesForm)}
        isSubmitting={isSaving}
      >
        <FormInput
          label={t('minNoticeLabel')}
          name="minBookingNoticeHours"
          type="number"
          value={policiesForm.minBookingNoticeHours}
          onChange={(e) => setPoliciesForm({ ...policiesForm, minBookingNoticeHours: parseInt(e.target.value) || 0 })}
          description={t('minNoticeDesc')}
        />
        <FormInput
          label={t('maxAdvanceLabel')}
          name="maxAdvanceBookingDays"
          type="number"
          value={policiesForm.maxAdvanceBookingDays}
          onChange={(e) => setPoliciesForm({ ...policiesForm, maxAdvanceBookingDays: parseInt(e.target.value) || 1 })}
          description={t('maxAdvanceDesc')}
        />
        <FormInput
          label={t('cancellationLabel')}
          name="cancellationPolicyHours"
          type="number"
          value={policiesForm.cancellationPolicyHours}
          onChange={(e) => setPoliciesForm({ ...policiesForm, cancellationPolicyHours: parseInt(e.target.value) || 0 })}
          description={t('cancellationDesc')}
        />
        <div className="space-y-4 border-t pt-4">
          <p className="text-sm font-medium text-gray-700">{t('confirmationFlow')}</p>
          <FormCheckbox
            label={t('emailConfirmation')}
            name="requireEmailConfirmation"
            description={t('emailConfirmationDesc')}
            checked={policiesForm.requireEmailConfirmation}
            onChange={(e) => setPoliciesForm({ ...policiesForm, requireEmailConfirmation: e.target.checked })}
          />
          <FormCheckbox
            label={t('adminApproval')}
            name="requireApproval"
            description={t('adminApprovalDesc')}
            checked={policiesForm.requireApproval}
            onChange={(e) => setPoliciesForm({ ...policiesForm, requireApproval: e.target.checked })}
          />
        </div>
        <div className="border-t pt-4">
          <FormCheckbox
            label={t('waitlistLabel')}
            name="allowWaitlist"
            description={t('waitlistDesc')}
            checked={policiesForm.allowWaitlist}
            onChange={(e) => setPoliciesForm({ ...policiesForm, allowWaitlist: e.target.checked })}
          />
        </div>
      </FormDialog>
    </div>
  )
}
