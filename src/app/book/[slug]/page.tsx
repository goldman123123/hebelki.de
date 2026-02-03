import { notFound } from 'next/navigation'
import { getBusinessBySlug, getServicesByBusiness, getStaffByBusiness } from '@/lib/db/queries'
import { BookingWidget } from '@/components/booking/BookingWidget'

interface BookingPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: BookingPageProps) {
  const { slug } = await params
  const business = await getBusinessBySlug(slug)

  if (!business) {
    return { title: 'Business Not Found' }
  }

  return {
    title: `Book an Appointment | ${business.name}`,
    description: `Schedule your appointment with ${business.name} online.`,
  }
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { slug } = await params
  const business = await getBusinessBySlug(slug)

  if (!business) {
    notFound()
  }

  const [services, staffMembers] = await Promise.all([
    getServicesByBusiness(business.id),
    getStaffByBusiness(business.id),
  ])

  return (
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
          <p className="mt-1 text-sm text-gray-600">Book your appointment online</p>
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
      </div>
    </div>
  )
}
