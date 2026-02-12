import Stripe from 'stripe'
import type { PlanId } from '@/modules/core/entitlements'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

/**
 * Map plan IDs to Stripe Price IDs.
 * Free plan has no price (no checkout needed).
 */
export const PLAN_PRICE_MAP: Partial<Record<PlanId, string>> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID || '',
  pro: process.env.STRIPE_PRO_PRICE_ID || '',
  business: process.env.STRIPE_BUSINESS_PRICE_ID || '',
}

/**
 * Reverse map: Stripe Price ID -> Plan ID
 */
export function getPlanIdFromPriceId(priceId: string): PlanId | null {
  for (const [planId, stripePriceId] of Object.entries(PLAN_PRICE_MAP)) {
    if (stripePriceId === priceId) {
      return planId as PlanId
    }
  }
  return null
}
