import { NextRequest, NextResponse } from 'next/server'
import { stripe, getPlanIdFromPriceId } from '@/lib/stripe'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:webhooks:stripe')

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const businessId = session.metadata?.businessId
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id

      if (businessId && subscriptionId) {
        // Fetch the subscription to get the price/plan
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0]?.price.id
        const planId = priceId ? getPlanIdFromPriceId(priceId) : null

        await db
          .update(businesses)
          .set({
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: typeof session.customer === 'string'
              ? session.customer
              : session.customer?.id || undefined,
            planId: planId || subscription.metadata?.planId || 'starter',
            planStartedAt: new Date(),
            planExpiresAt: new Date(subscription.items.data[0]?.current_period_end * 1000),
            updatedAt: new Date(),
          })
          .where(eq(businesses.id, businessId))
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const businessId = subscription.metadata?.businessId

      if (businessId) {
        const priceId = subscription.items.data[0]?.price.id
        const planId = priceId ? getPlanIdFromPriceId(priceId) : null

        const updateData: Record<string, unknown> = {
          planExpiresAt: new Date(subscription.items.data[0]?.current_period_end * 1000),
          updatedAt: new Date(),
        }

        if (planId) {
          updateData.planId = planId
        }

        // Handle cancellation at period end
        if (subscription.cancel_at_period_end) {
          updateData.planExpiresAt = new Date(subscription.items.data[0]?.current_period_end * 1000)
        }

        await db
          .update(businesses)
          .set(updateData)
          .where(eq(businesses.id, businessId))
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const businessId = subscription.metadata?.businessId

      if (businessId) {
        await db
          .update(businesses)
          .set({
            planId: 'free',
            stripeSubscriptionId: null,
            planExpiresAt: null,
            updatedAt: new Date(),
          })
          .where(eq(businesses.id, businessId))
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id

      if (customerId) {
        // Log payment failure - the subscription will handle status via subscription.updated
        log.warn(`Payment failed for customer ${customerId}`)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
