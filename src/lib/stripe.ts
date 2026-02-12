import Stripe from 'stripe'
import type { PlanId } from '@/modules/core/entitlements'

let _stripe: Stripe | null = null

/** Lazy-initialized Stripe client — only throws when actually used, not at import time */
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not defined')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return _stripe
}

/** @deprecated Use getStripe() instead — kept for backwards compatibility */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

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
