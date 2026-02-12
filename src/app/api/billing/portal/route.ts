import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const business = authResult.business

  if (!business.stripeCustomerId) {
    return NextResponse.json({ error: 'Kein Abonnement vorhanden' }, { status: 400 })
  }

  const origin = request.headers.get('origin') || 'https://www.hebelki.de'

  const session = await stripe.billingPortal.sessions.create({
    customer: business.stripeCustomerId,
    return_url: `${origin}/unternehmen`,
  })

  return NextResponse.json({ url: session.url })
}
