import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { EmbedChatWrapper } from '@/components/embed/EmbedChatWrapper'
import { getBusinessLocale } from '@/lib/locale'
import { getMessagesForLocale, getEmailTranslations } from '@/lib/email-i18n'
import { BusinessLocaleProvider } from '@/components/BusinessLocaleProvider'

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

  const locale = await getBusinessLocale(business.id)
  const [messages, t] = await Promise.all([
    getMessagesForLocale(locale),
    getEmailTranslations(locale, 'chat'),
  ])

  const welcomeMessage = settings.chatbotWelcomeMessage || t('defaultWelcome', { businessName: business.name })
  const liveChatEnabled = settings.liveChatEnabled || false
  const chatDefaultMode = settings.chatDefaultMode || 'ai'

  return (
    <BusinessLocaleProvider locale={locale} messages={messages}>
      <EmbedChatWrapper
      businessId={business.id}
      businessName={business.name}
      slug={business.slug}
      primaryColor={primaryColor}
      welcomeMessage={welcomeMessage}
      liveChatEnabled={liveChatEnabled}
      chatDefaultMode={chatDefaultMode}
      />
    </BusinessLocaleProvider>
  )
}
