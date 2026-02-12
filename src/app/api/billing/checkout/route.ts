import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { stripe, PLAN_PRICE_MAP } from '@/lib/stripe'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { PlanId } from '@/modules/core/entitlements'

const checkoutSchema = z.object({
  planId: z.enum(['starter', 'pro', 'business']),
})

export async function POST(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const body = await request.json()
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const { planId } = parsed.data
  const priceId = PLAN_PRICE_MAP[planId as PlanId]
  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 400 })
  }

  const business = authResult.business

  // Get or create Stripe customer
  let customerId = business.stripeCustomerId

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: business.name,
      email: business.email || undefined,
      metadata: {
        businessId: business.id,
        businessSlug: business.slug,
      },
    })
    customerId = customer.id

    // Save customer ID to database
    await db
      .update(businesses)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(businesses.id, business.id))
  }

  // Create checkout session
  const origin = request.headers.get('origin') || 'https://www.hebelki.de'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/unternehmen?billing=success`,
    cancel_url: `${origin}/unternehmen?billing=cancelled`,
    subscription_data: {
      metadata: {
        businessId: business.id,
        planId,
      },
    },
    metadata: {
      businessId: business.id,
      planId,
    },
  })

  return NextResponse.json({ url: session.url })
}
