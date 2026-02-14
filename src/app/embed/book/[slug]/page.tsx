import { notFound } from 'next/navigation'
import { getBusinessBySlug, getServicesByBusiness, getStaffByBusiness } from '@/lib/db/queries'
import { EmbedBookingWrapper } from '@/components/embed/EmbedBookingWrapper'
import { getBusinessLocale } from '@/lib/locale'
import { getMessagesForLocale } from '@/lib/email-i18n'
import { BusinessLocaleProvider } from '@/components/BusinessLocaleProvider'

interface EmbedBookingPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ color?: string }>
}

export default async function EmbedBookingPage({ params, searchParams }: EmbedBookingPageProps) {
  const { slug } = await params
  const { color } = await searchParams
  const business = await getBusinessBySlug(slug)

  if (!business) {
    notFound()
  }

  const [services, staffMembers] = await Promise.all([
    getServicesByBusiness(business.id),
    getStaffByBusiness(business.id),
  ])

  const primaryColor = color ? `#${color}` : business.primaryColor || '#3B82F6'

  const locale = await getBusinessLocale(business.id)
  const messages = await getMessagesForLocale(locale)

  return (
    <BusinessLocaleProvider locale={locale} messages={messages}>
      <div style={{ '--primary-color': primaryColor } as React.CSSProperties}>
        <EmbedBookingWrapper
        business={{
          id: business.id,
          name: business.name,
          slug: business.slug,
          timezone: business.timezone || 'Europe/Berlin',
          currency: business.currency || 'EUR',
          minBookingNoticeHours: business.minBookingNoticeHours || 24,
          maxAdvanceBookingDays: business.maxAdvanceBookingDays || 60,
          requireApproval: business.requireApproval || false,
          primaryColor,
        }}
        services={services.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          durationMinutes: s.durationMinutes,
          bufferMinutes: s.bufferMinutes || 0,
          price: s.price,
          category: s.category,
        }))}
        staff={staffMembers.map(s => ({
          id: s.id,
          name: s.name,
          title: s.title,
          avatarUrl: s.avatarUrl,
        }))}
        />
      </div>
    </BusinessLocaleProvider>
  )
}
