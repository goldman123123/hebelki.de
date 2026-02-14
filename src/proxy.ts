import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/onboarding(.*)', // Onboarding pages (includes /wizard and /simple)
  '/book/(.*)',
  '/site/(.*)', // Public business websites
  '/embed/(.*)', // Embeddable widget pages (booking + chat iframes)
  '/confirm/(.*)', // Public email confirmation page
  '/manage/(.*)', // Public booking management page (token-gated)
  '/gdpr/(.*)', // GDPR self-service pages (deletion confirmation)
  '/(.*)/chat', // Public chat pages (e.g., /physioplus/chat)
  '/test-crawler', // Test page for Firecrawl
  // Legal pages (must be public per German law)
  '/datenschutz', // Privacy Policy (GDPR required)
  '/allgemeine-geschaeftsbedingungen', // Terms of Service
  '/agb', // Short redirect to AGB
  '/impressum', // Legal Notice (German Impressumspflicht)
  '/legal/(.*)', // Legal pages (DPIA, subprocessors, etc.)
  '/api/(.*)/config',
  '/api/(.*)/services',
  '/api/(.*)/staff',
  '/api/(.*)/availability',
  '/api/(.*)/holds',
  '/api/(.*)/confirm', // Public confirm endpoint for chatbot bookings
  '/api/(.*)/book',
  '/api/chatbot/message', // Public chatbot message endpoint
  '/api/chatbot/poll', // Public chatbot polling endpoint
  '/api/chatbot/escalate', // Public chatbot escalation endpoint
  '/api/chatbot/date', // Public date API for chatbot
  '/api/voice/incoming', // Twilio voice webhook
  '/api/whatsapp/webhook', // WhatsApp webhook from Twilio
  '/api/manage/(.*)', // Booking management endpoints (token-gated)
  '/api/gdpr/(.*)', // GDPR self-service endpoints (token-gated)
  '/api/webhooks/stripe', // Stripe webhook (signature-verified in handler)
  '/api/onboarding/(.*)', // Onboarding API endpoints (scraping, etc.)
  '/api/test-crawler', // Test endpoint for Firecrawl
  '/demo', // Demo landing page
  '/api/demo/(.*)', // Demo API endpoints
  '/sign-in(.*)',
  '/sign-up(.*)',
])

// Hosts that belong to hebelki itself (not custom domains)
const HEBELKI_HOSTS = [
  'www.hebelki.de',
  'hebelki.de',
  'hebelki-de.vercel.app',
  'localhost',
  '127.0.0.1',
]

function isHebelkiHost(host: string): boolean {
  // Strip port for comparison (e.g., localhost:3005)
  const hostname = host.split(':')[0]
  return HEBELKI_HOSTS.includes(hostname) || hostname.endsWith('.vercel.app')
}

export default clerkMiddleware(async (auth, request) => {
  const host = request.headers.get('host') || ''

  // Custom domain routing: if the Host is not a hebelki host,
  // rewrite to the booking page with a custom domain query param.
  // The booking page will look up the business by customDomain.
  if (host && !isHebelkiHost(host)) {
    const url = request.nextUrl.clone()
    const pathname = url.pathname

    // Only rewrite root and booking-related paths on custom domains
    if (pathname === '/' || pathname === '') {
      url.pathname = '/book/_custom'
      url.searchParams.set('domain', host.split(':')[0])
      return NextResponse.rewrite(url)
    }
  }

  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
