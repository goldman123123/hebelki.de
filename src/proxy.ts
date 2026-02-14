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
  // Legal pages — German (must be public per German law)
  '/datenschutz', // Privacy Policy (GDPR required)
  '/allgemeine-geschaeftsbedingungen', // Terms of Service
  '/agb', // Short redirect to AGB
  '/impressum', // Legal Notice (German Impressumspflicht)
  // Legal pages — English
  '/privacy',
  '/terms',
  '/legal-notice',
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

// Hosts for the book.gy English domain
const BOOK_GY_HOSTS = [
  'www.book.gy',
  'book.gy',
]

function isHebelkiHost(host: string): boolean {
  // Strip port for comparison (e.g., localhost:3005)
  const hostname = host.split(':')[0]
  return HEBELKI_HOSTS.includes(hostname) || hostname.endsWith('.vercel.app')
}

function isBookGyHost(host: string): boolean {
  const hostname = host.split(':')[0]
  return BOOK_GY_HOSTS.includes(hostname)
}

/**
 * Derive locale from hostname.
 * book.gy → 'en', everything else → 'de'
 */
function getLocaleFromHostname(host: string): 'de' | 'en' {
  return isBookGyHost(host) ? 'en' : 'de'
}

export default clerkMiddleware(async (auth, request) => {
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0]

  // --- Locale detection from hostname ---
  const locale = getLocaleFromHostname(host)

  // Set x-locale request header for next-intl's getRequestConfig
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-locale', locale)

  // Build response with locale cookie + forwarded headers
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Set ui_locale cookie (persists for server actions, internal navigation)
  response.cookies.set('ui_locale', locale, {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })

  // Custom domain routing: if the Host is not a hebelki host and not book.gy,
  // rewrite to the booking page with a custom domain query param.
  // The booking page will look up the business by customDomain.
  if (host && !isHebelkiHost(host) && !isBookGyHost(host)) {
    const url = request.nextUrl.clone()
    const pathname = url.pathname

    // Only rewrite root and booking-related paths on custom domains
    if (pathname === '/' || pathname === '') {
      url.pathname = '/book/_custom'
      url.searchParams.set('domain', hostname)
      return NextResponse.rewrite(url, {
        request: { headers: requestHeaders },
      })
    }
  }

  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  return response
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
