import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { ChatInterface } from '@/modules/chatbot/components/ChatInterface'

/**
 * Public Chat Page
 *
 * Accessible at: hebelki.de/{slug}/chat
 * Provides a public chat interface for each business
 */

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function PublicChatPage({ params }: PageProps) {
  const { slug } = await params

  // Fetch business by slug
  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1)
    .then(rows => rows[0])

  // Return 404 if business not found
  if (!business) {
    notFound()
  }

  // Extract chatbot settings from business settings
  const settings = typeof business.settings === 'object' && business.settings !== null
    ? (business.settings as {
        chatbotWelcomeMessage?: string
        chatbotColor?: string
      })
    : {}

  const welcomeMessage = settings.chatbotWelcomeMessage || `Hallo und herzlich willkommen bei ${business.name}! Wie kann ich Ihnen helfen?`
  const primaryColor = settings.chatbotColor || business.primaryColor || '#3B82F6'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with business branding */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="flex items-center gap-4">
            {business.logoUrl && (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            )}
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ color: primaryColor }}
              >
                {business.name}
              </h1>
              <p className="text-sm text-gray-600">
                Chat mit uns
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat interface */}
      <div className="mx-auto max-w-4xl px-4 py-6">
        <ChatInterface
          businessId={business.id}
          businessName={business.name}
          primaryColor={primaryColor}
          welcomeMessage={welcomeMessage}
        />
      </div>

      {/* Footer */}
      <footer className="mt-8 border-t bg-white py-6">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm text-gray-500">
            Powered by{' '}
            <a
              href="https://www.hebelki.de"
              className="font-medium hover:underline"
              style={{ color: primaryColor }}
            >
              Hebelki
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params

  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1)
    .then(rows => rows[0])

  if (!business) {
    return {
      title: 'Business nicht gefunden',
    }
  }

  return {
    title: `Chat mit ${business.name} | Hebelki`,
    description: `Chatten Sie mit ${business.name} und buchen Sie Ihren Termin online.`,
  }
}
