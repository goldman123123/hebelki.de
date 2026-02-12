/**
 * Entitlements Module (Server-Only)
 *
 * Re-exports plan definitions from ./plans (client-safe)
 * and adds DB-dependent seat/member functions.
 *
 * Client components should import from '@/modules/core/entitlements/plans' directly.
 */

// Re-export everything from plans (client-safe)
export * from './plans'

import { db } from '@/lib/db'
import { businessMembers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { Business } from '../auth'
import { getPlan, getFeatureDescription, FeatureNotAvailableError, SeatLimitError } from './plans'
import type { PlanId, Feature } from './plans'

// ============================================
// BUSINESS-LEVEL HELPERS (need Business type)
// ============================================

export function getBusinessPlan(business: Business) {
  const planId = (business.planId as PlanId) || 'free'
  return getPlan(planId)
}

export function hasFeature(business: Business, feature: Feature): boolean {
  const plan = getBusinessPlan(business)
  return plan.features.includes(feature)
}

export function hasAllFeatures(business: Business, features: Feature[]): boolean {
  return features.every(feature => hasFeature(business, feature))
}

export function hasAnyFeature(business: Business, features: Feature[]): boolean {
  return features.some(feature => hasFeature(business, feature))
}

export function requireFeature(business: Business, feature: Feature): void {
  if (!hasFeature(business, feature)) {
    const plan = getBusinessPlan(business)
    throw new FeatureNotAvailableError(
      `Feature nicht verfügbar. "${getFeatureDescription(feature)}" erfordert ein Upgrade. Aktueller Tarif: ${plan.name}`
    )
  }
}

export function requireAllFeatures(business: Business, features: Feature[]): void {
  const missingFeatures = features.filter(f => !hasFeature(business, f))

  if (missingFeatures.length > 0) {
    const plan = getBusinessPlan(business)
    const featureNames = missingFeatures.map(f => getFeatureDescription(f)).join(', ')
    throw new FeatureNotAvailableError(
      `Features nicht verfügbar: ${featureNames}. Aktueller Tarif: ${plan.name}. Bitte upgraden.`
    )
  }
}

// ============================================
// SEAT LIMIT CHECKS (DB-dependent)
// ============================================

export async function getSeatsUsed(businessId: string): Promise<number> {
  const results = await db
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .where(and(
      eq(businessMembers.businessId, businessId),
      eq(businessMembers.status, 'active')
    ))

  return results.length
}

export async function getSeatsRemaining(business: Business): Promise<number | null> {
  const plan = getBusinessPlan(business)

  if (plan.seatLimit === null) {
    return null  // Unlimited
  }

  const used = await getSeatsUsed(business.id)
  return Math.max(0, plan.seatLimit - used)
}

export async function canAddMember(business: Business): Promise<boolean> {
  const plan = getBusinessPlan(business)

  if (plan.seatLimit === null) {
    return true  // Unlimited
  }

  const used = await getSeatsUsed(business.id)
  return used < plan.seatLimit
}

export async function requireSeatsAvailable(business: Business): Promise<void> {
  if (!(await canAddMember(business))) {
    const plan = getBusinessPlan(business)
    const used = await getSeatsUsed(business.id)

    throw new SeatLimitError(
      `Mitgliederlimit erreicht. ${plan.name}-Tarif erlaubt ${plan.seatLimit} ${
        plan.seatLimit === 1 ? 'Platz' : 'Plätze'
      } (${used} aktuell belegt). Bitte upgraden Sie Ihren Tarif, um weitere Mitglieder hinzuzufügen.`
    )
  }
}
