import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getBusinessBySlug, getBusinessByCustomDomain, getServicesByBusiness, getStaffByBusiness } from '@/lib/db/queries'
import { BookingWidget } from '@/components/booking/BookingWidget'
import { getBusinessLocale } from '@/lib/locale'
import { getMessagesForLocale } from '@/lib/email-i18n'
import { getEmailTranslations } from '@/lib/email-i18n'
import { BusinessLocaleProvider } from '@/components/BusinessLocaleProvider'

interface BookingPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ domain?: string }>
}

async function resolveBusinessBySlugOrDomain(slug: string, domain?: string) {
  // Custom domain rewrite: middleware sets slug to "_custom" with domain query param
  if (slug === '_custom' && domain) {
    return getBusinessByCustomDomain(domain)
  }
  return getBusinessBySlug(slug)
}

export async function generateMetadata({ params, searchParams }: BookingPageProps) {
  const { slug } = await params
  const { domain } = await searchParams
  const business = await resolveBusinessBySlugOrDomain(slug, domain)

  if (!business) {
    return { title: 'Business Not Found' }
  }

  const locale = await getBusinessLocale(business.id)
  const t = await getEmailTranslations(locale, 'booking')

  return {
    title: t('pageTitle', { businessName: business.name }),
    description: t('pageDescription', { businessName: business.name }),
  }
}

export default async function BookingPage({ params, searchParams }: BookingPageProps) {
  const { slug } = await params
  const { domain } = await searchParams
  const business = await resolveBusinessBySlugOrDomain(slug, domain)

  if (!business) {
    notFound()
  }

  const locale = await getBusinessLocale(business.id)
  const [services, staffMembers, messages, t] = await Promise.all([
    getServicesByBusiness(business.id),
    getStaffByBusiness(business.id),
    getMessagesForLocale(locale),
    getEmailTranslations(locale, 'booking'),
  ])

  const settings = (business.settings || {}) as Record<string, string>

  return (
    <BusinessLocaleProvider locale={locale} messages={messages}>
      <div
        className="min-h-screen bg-gray-50"
        style={{ '--primary-color': business.primaryColor } as React.CSSProperties}
      >
        <div className="mx-auto max-w-2xl px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            {business.logoUrl && (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="mx-auto mb-4 h-16 w-auto"
              />
            )}
            <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
            <p className="mt-1 text-sm text-gray-600">{t('subtitle')}</p>
          </div>

          {/* Booking Widget */}
          <BookingWidget
            business={{
              id: business.id,
              name: business.name,
              slug: business.slug,
              timezone: business.timezone || 'Europe/Berlin',
              currency: business.currency || 'EUR',
              minBookingNoticeHours: business.minBookingNoticeHours || 24,
              maxAdvanceBookingDays: business.maxAdvanceBookingDays || 60,
              requireApproval: business.requireApproval || false,
              primaryColor: business.primaryColor || '#3B82F6',
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

          {/* Legal footer */}
          <div className="mt-8 border-t pt-6 text-center text-xs text-gray-500 space-y-2">
            {settings.dpoName && (
              <p>
                {t('dpo')} {settings.dpoName as string}
                {settings.dpoEmail && (
                  <> &ndash; <a href={`mailto:${settings.dpoEmail}`} className="underline hover:text-gray-700">{settings.dpoEmail as string}</a></>
                )}
              </p>
            )}
            <p>
              <Link href="/datenschutz" className="underline hover:text-gray-700">{t('privacyPolicy')}</Link>
              {' | '}
              <Link href="/impressum" className="underline hover:text-gray-700">{t('imprint')}</Link>
            </p>
          </div>
        </div>
      </div>
    </BusinessLocaleProvider>
  )
}
