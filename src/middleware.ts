import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/onboarding(.*)', // Onboarding pages (includes /wizard and /simple)
  '/book/(.*)',
  '/confirm/(.*)', // Public email confirmation page
  '/(.*)/chat', // Public chat pages (e.g., /physioplus/chat)
  '/test-crawler', // Test page for Firecrawl
  // Legal pages (must be public per German law)
  '/datenschutz', // Privacy Policy (GDPR required)
  '/allgemeine-geschaeftsbedingungen', // Terms of Service
  '/impressum', // Legal Notice (German Impressumspflicht)
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
  '/api/chatbot/businesses', // Public business list for testing
  '/api/chatbot/date', // Public date API for chatbot
  '/api/whatsapp/webhook', // WhatsApp webhook from Twilio
  '/api/onboarding/(.*)', // Onboarding API endpoints (scraping, etc.)
  '/api/test-crawler', // Test endpoint for Firecrawl
  '/api/dev/(.*)', // Dev endpoints (all dev routes are public)
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware(async (auth, request) => {
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
