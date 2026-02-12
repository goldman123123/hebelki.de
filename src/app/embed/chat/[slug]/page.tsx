import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { EmbedChatWrapper } from '@/components/embed/EmbedChatWrapper'

interface EmbedChatPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ color?: string }>
}

export default async function EmbedChatPage({ params, searchParams }: EmbedChatPageProps) {
  const { slug } = await params
  const { color } = await searchParams

  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1)
    .then(rows => rows[0])

  if (!business) {
    notFound()
  }

  const settings = typeof business.settings === 'object' && business.settings !== null
    ? (business.settings as {
        chatbotWelcomeMessage?: string
        chatbotColor?: string
        liveChatEnabled?: boolean
        chatDefaultMode?: 'ai' | 'live'
      })
    : {}

  const primaryColor = color ? `#${color}` : settings.chatbotColor || business.primaryColor || '#3B82F6'
  const welcomeMessage = settings.chatbotWelcomeMessage || `Hallo und herzlich willkommen bei ${business.name}! Wie kann ich Ihnen helfen?`
  const liveChatEnabled = settings.liveChatEnabled || false
  const chatDefaultMode = settings.chatDefaultMode || 'ai'

  return (
    <EmbedChatWrapper
      businessId={business.id}
      businessName={business.name}
      slug={business.slug}
      primaryColor={primaryColor}
      welcomeMessage={welcomeMessage}
      liveChatEnabled={liveChatEnabled}
      chatDefaultMode={chatDefaultMode}
    />
  )
}
