import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/onboarding(.*)', // Onboarding pages (includes /wizard and /simple)
  '/book/(.*)',
  '/(.*)/chat', // Public chat pages (e.g., /physioplus/chat)
  '/test-crawler', // Test page for Firecrawl
  '/api/(.*)/config',
  '/api/(.*)/services',
  '/api/(.*)/staff',
  '/api/(.*)/availability',
  '/api/(.*)/holds',
  '/api/(.*)/confirm', // Public confirm endpoint for chatbot bookings
  '/api/(.*)/book',
  '/api/chatbot/message', // Public chatbot message endpoint
  '/api/chatbot/businesses', // Public business list for testing
  '/api/chatbot/date', // Public date API for chatbot
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
