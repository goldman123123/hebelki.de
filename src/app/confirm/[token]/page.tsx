import { getBookingByToken } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { bookings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { emitEventStandalone } from '@/modules/core/events'
import { processEvents } from '@/modules/core/events/processor'
import Link from 'next/link'
import { CheckCircle, AlertCircle, Clock, Info } from 'lucide-react'
import { getBusinessLocale } from '@/lib/locale'
import { getEmailTranslations } from '@/lib/email-i18n'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function ConfirmBookingPage({ params }: PageProps) {
  const { token } = await params

  // Look up booking by confirmation token
  const result = await getBookingByToken(token)

  if (!result || !result.booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking not found</h1>
          <p className="text-gray-600">Invalid link</p>
        </div>
      </div>
    )
  }

  const { booking, service, staffMember, customer, business } = result

  // Resolve business locale for translations
  const locale = business ? await getBusinessLocale(business.id) : 'de'
  const t = await getEmailTranslations(locale, 'confirm')
  const dateLocale = locale === 'de' ? 'de-DE' : 'en-US'

  const formatDate = (date: Date) => date.toLocaleDateString(dateLocale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: business?.timezone || 'Europe/Berlin',
  })

  const formatTime = (date: Date) => date.toLocaleTimeString(dateLocale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: business?.timezone || 'Europe/Berlin',
  })

  // Booking is already confirmed or completed
  if (booking.status === 'confirmed' || booking.status === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('alreadyConfirmedTitle')}</h1>
          <p className="text-gray-600 mb-6">
            {t('alreadyConfirmedMessage')}
          </p>
          <BookingDetails
            serviceName={service?.name}
            date={formatDate(booking.startsAt)}
            time={`${formatTime(booking.startsAt)} - ${formatTime(booking.endsAt)}`}
            staffName={staffMember?.name}
            businessName={business?.name}
            t={t}
          />
          <Link
            href={`/manage/${token}`}
            className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {t('manageLink')}
          </Link>
        </div>
      </div>
    )
  }

  // Booking is cancelled
  if (booking.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('cancelledTitle')}</h1>
          <p className="text-gray-600">
            {t('cancelledMessage')}
          </p>
        </div>
      </div>
    )
  }

  // Booking is pending (already customer-confirmed, waiting for admin)
  if (booking.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('pendingTitle')}</h1>
          <p className="text-gray-600 mb-6">
            {t('pendingMessage')}
          </p>
          <BookingDetails
            serviceName={service?.name}
            date={formatDate(booking.startsAt)}
            time={`${formatTime(booking.startsAt)} - ${formatTime(booking.endsAt)}`}
            staffName={staffMember?.name}
            businessName={business?.name}
            t={t}
          />
          <Link
            href={`/manage/${token}`}
            className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {t('manageLink')}
          </Link>
        </div>
      </div>
    )
  }

  // Only process 'unconfirmed' bookings
  if (booking.status !== 'unconfirmed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <Info className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('invalidStatusTitle')}</h1>
          <p className="text-gray-600">
            {t('invalidStatusMessage')}
          </p>
        </div>
      </div>
    )
  }

  // Confirm the booking
  const requiresAdminApproval = business?.requireApproval ?? false
  const newStatus = requiresAdminApproval ? 'pending' : 'confirmed'

  await db
    .update(bookings)
    .set({
      status: newStatus,
      ...(newStatus === 'confirmed' ? { confirmedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, booking.id))

  // Emit appropriate event
  if (newStatus === 'confirmed' && customer?.email) {
    try {
      await emitEventStandalone(booking.businessId, 'booking.confirmed', {
        bookingId: booking.id,
        customerEmail: customer.email,
        customerName: customer.name || 'Kunde',
        serviceName: service?.name || 'Service',
        staffName: staffMember?.name,
        businessName: business?.name || 'Business',
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        price: service?.price ? parseFloat(service.price) : undefined,
        currency: business?.currency || 'EUR',
        confirmationToken: booking.confirmationToken || booking.id,
      })
      await processEvents(10).catch(() => {})
    } catch {
      // Don't fail the confirmation page if email fails
    }
  }

  if (newStatus === 'confirmed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('confirmedTitle')}</h1>
          <p className="text-gray-600 mb-6">
            {t('confirmedMessage', { businessName: business?.name || '' })}
          </p>
          <BookingDetails
            serviceName={service?.name}
            date={formatDate(booking.startsAt)}
            time={`${formatTime(booking.startsAt)} - ${formatTime(booking.endsAt)}`}
            staffName={staffMember?.name}
            businessName={business?.name}
            t={t}
          />
          <Link
            href={`/manage/${token}`}
            className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {t('manageLink')}
          </Link>
        </div>
      </div>
    )
  }

  // requiresAdminApproval = true -> moved to pending
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('pendingApprovalTitle')}</h1>
        <p className="text-gray-600 mb-6">
          {t('pendingApprovalMessage', { businessName: business?.name || '' })}
        </p>
        <BookingDetails
          serviceName={service?.name}
          date={formatDate(booking.startsAt)}
          time={`${formatTime(booking.startsAt)} - ${formatTime(booking.endsAt)}`}
          staffName={staffMember?.name}
          businessName={business?.name}
          t={t}
        />
        <Link
          href={`/manage/${token}`}
          className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {t('manageLink')}
        </Link>
      </div>
    </div>
  )
}

function BookingDetails({ serviceName, date, time, staffName, businessName, t }: {
  serviceName?: string | null
  date: string
  time: string
  staffName?: string | null
  businessName?: string | null
  t: (key: string) => string
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-left">
      <h3 className="font-semibold text-gray-900 mb-3">{t('bookingDetails')}</h3>
      <div className="space-y-2 text-sm">
        {businessName && (
          <div className="flex justify-between">
            <span className="text-gray-500">{t('businessLabel')}</span>
            <span className="font-medium">{businessName}</span>
          </div>
        )}
        {serviceName && (
          <div className="flex justify-between">
            <span className="text-gray-500">{t('serviceLabel')}</span>
            <span className="font-medium">{serviceName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">{t('dateLabel')}</span>
          <span className="font-medium">{date}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t('timeLabel')}</span>
          <span className="font-medium">{time}</span>
        </div>
        {staffName && (
          <div className="flex justify-between">
            <span className="text-gray-500">{t('staffLabel')}</span>
            <span className="font-medium">{staffName}</span>
          </div>
        )}
      </div>
    </div>
  )
}
