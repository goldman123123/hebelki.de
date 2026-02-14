'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard, ExternalLink, Loader2, Check, ArrowUpRight,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Business } from '../types'
import type { PlanId } from '@/modules/core/entitlements/plans'
import { getPlan, getAllPlans, getFeatureDescription } from '@/modules/core/entitlements/plans'

interface BillingCardProps {
  business: Business
}

const PLAN_ORDER: PlanId[] = ['free', 'starter', 'pro', 'business']

export function BillingCard({ business }: BillingCardProps) {
  const t = useTranslations('dashboard.business.billing')
  const [loading, setLoading] = useState<string | null>(null)

  const currentPlanId = (business.planId as PlanId) || 'free'
  const currentPlan = getPlan(currentPlanId)
  const allPlans = getAllPlans()
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlanId)

  const hasSubscription = !!business.stripeSubscriptionId

  async function handleCheckout(planId: PlanId) {
    setLoading(planId)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } finally {
      setLoading(null)
    }
  }

  async function handlePortal() {
    setLoading('portal')
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{currentPlan.name}</h3>
                <Badge variant={currentPlanId === 'free' ? 'secondary' : 'default'}>
                  {currentPlanId === 'free' ? t('free') : t('active')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{currentPlan.description}</p>
              {currentPlan.price.monthly > 0 && (
                <p className="text-2xl font-bold mt-2">
                  {currentPlan.price.monthly} EUR
                  <span className="text-sm font-normal text-muted-foreground"> {t('perMonth')}</span>
                </p>
              )}
              {business.planExpiresAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('periodEnds', { date: new Date(business.planExpiresAt).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  }) })}
                </p>
              )}
            </div>
            {hasSubscription && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePortal}
                disabled={loading === 'portal'}
              >
                {loading === 'portal' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                {t('manageSubscription')}
              </Button>
            )}
          </div>

          {/* Current plan features */}
          <div className="mt-4 grid grid-cols-2 gap-1 sm:grid-cols-3">
            {currentPlan.features.map((feature) => (
              <div key={feature} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                {getFeatureDescription(feature)}
              </div>
            ))}
          </div>
          {currentPlan.seatLimit !== null && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('seatsIncluded', { count: currentPlan.seatLimit })}
            </p>
          )}
        </div>

        {/* Available plans for upgrade */}
        {currentPlanId !== 'business' && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">{t('availableUpgrades')}</h4>
            <div className="grid gap-3 md:grid-cols-3">
              {allPlans
                .filter((plan) => PLAN_ORDER.indexOf(plan.id) > currentPlanIndex)
                .map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-lg border p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{plan.name}</h4>
                        {plan.id === 'pro' && (
                          <Badge variant="secondary" className="text-xs">{t('popular')}</Badge>
                        )}
                      </div>
                      <p className="text-xl font-bold mt-1">
                        {plan.price.monthly} EUR
                        <span className="text-xs font-normal text-muted-foreground"> {t('perMonth')}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {plan.seatLimit === null ? t('unlimitedSeats') : t('seatsIncluded', { count: plan.seatLimit })}
                      </p>
                    </div>
                    <Button
                      className="mt-3 w-full"
                      size="sm"
                      variant={plan.id === 'pro' ? 'default' : 'outline'}
                      onClick={() => handleCheckout(plan.id)}
                      disabled={!!loading}
                    >
                      {loading === plan.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                      )}
                      {t('upgrade')}
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Manage existing subscription */}
        {hasSubscription && (
          <p className="text-xs text-muted-foreground">
            {t('portalNote')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
