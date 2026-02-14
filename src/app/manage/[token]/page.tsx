import { getBookingByToken } from '@/lib/db/queries'
import { AlertCircle, Calendar, Clock, User, Briefcase, Building2, XCircle } from 'lucide-react'
import { ManageActions } from './actions'
import { getBusinessLocale } from '@/lib/locale'
import { getEmailTranslations } from '@/lib/email-i18n'
import { getMessagesForLocale } from '@/lib/email-i18n'
import { BusinessLocaleProvider } from '@/components/BusinessLocaleProvider'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function ManageBookingPage({ params }: PageProps) {
  const { token } = await params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(token)) {
    return <ErrorPage title="Booking not found" message="The link is invalid." />
  }

  const result = await getBookingByToken(token)

  if (!result || !result.booking) {
    return <ErrorPage title="Booking not found" message="Booking not found." />
  }

  const { booking, service, staffMember, customer, business } = result

  // Resolve business locale
  const locale = business ? await getBusinessLocale(business.id) : 'de'
  const [t, messages] = await Promise.all([
    getEmailTranslations(locale, 'manage'),
    getMessagesForLocale(locale),
  ])
  const dateLocale = locale === 'de' ? 'de-DE' : 'en-US'
  const timezone = business?.timezone || 'Europe/Berlin'

  const formatDate = (date: Date) => date.toLocaleDateString(dateLocale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  })

  const formatTime = (date: Date) => date.toLocaleTimeString(dateLocale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  })

  const isPast = booking.startsAt < new Date()
  const isActive = ['unconfirmed', 'pending', 'confirmed'].includes(booking.status || '')
  const isCancelled = booking.status === 'cancelled'

  const statusLabels: Record<string, string> = {
    unconfirmed: t('status.unconfirmed'),
    pending: t('status.pending'),
    confirmed: t('status.confirmed'),
    cancelled: t('status.cancelled'),
    completed: t('status.completed'),
    no_show: t('status.noShow'),
  }

  return (
    <BusinessLocaleProvider locale={locale} messages={messages}>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          {/* Header */}
          <div className="bg-white rounded-t-lg shadow-md overflow-hidden">
            <div className={`px-6 py-5 text-white ${
              isCancelled ? 'bg-red-500' :
              booking.status === 'completed' || booking.status === 'no_show' ? 'bg-gray-500' :
              'bg-blue-600'
            }`}>
              <h1 className="text-xl font-bold">{t('title')}</h1>
              <p className="text-sm opacity-90 mt-1">
                {business?.name || ''}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="bg-white shadow-md px-6 py-3 border-b">
            <StatusBadge status={booking.status || 'pending'} labels={statusLabels} />
          </div>

          {/* Booking Details */}
          <div className="bg-white shadow-md px-6 py-5">
            <h2 className="font-semibold text-gray-900 mb-4">{t('bookingDetails')}</h2>
            <div className="space-y-3">
              {service?.name && (
                <DetailRow icon={<Briefcase className="h-4 w-4" />} label={t('service')} value={service.name} />
              )}
              <DetailRow
                icon={<Calendar className="h-4 w-4" />}
                label={t('date')}
                value={formatDate(booking.startsAt)}
              />
              <DetailRow
                icon={<Clock className="h-4 w-4" />}
                label={t('time')}
                value={`${formatTime(booking.startsAt)} - ${formatTime(booking.endsAt)}`}
              />
              {staffMember?.name && (
                <DetailRow icon={<User className="h-4 w-4" />} label={t('staff')} value={staffMember.name} />
              )}
              {business?.name && (
                <DetailRow icon={<Building2 className="h-4 w-4" />} label={t('business')} value={business.name} />
              )}
            </div>
          </div>

          {/* Cancellation Info (if cancelled) */}
          {isCancelled && (
            <div className="bg-white shadow-md px-6 py-4 border-t">
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">{t('cancelled')}</p>
                    {booking.cancelledAt && (
                      <p className="text-sm text-red-600 mt-1">
                        {t('cancelledAt', { date: formatDate(booking.cancelledAt), time: formatTime(booking.cancelledAt) })}
                      </p>
                    )}
                    {booking.cancellationReason && (
                      <p className="text-sm text-red-600 mt-1">
                        {t('cancelReason', { reason: booking.cancellationReason })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons (only for active, future bookings) */}
          {isActive && !isPast && (
            <div className="bg-white rounded-b-lg shadow-md px-6 py-5 border-t">
              <ManageActions
                token={token}
                bookingId={booking.id}
                businessSlug={business?.slug || ''}
                serviceId={booking.serviceId || ''}
                staffId={booking.staffId || undefined}
                serviceDurationMinutes={service?.durationMinutes || 30}
                cancellationPolicyHours={business?.cancellationPolicyHours || 0}
                startsAt={booking.startsAt.toISOString()}
                timezone={timezone}
              />
            </div>
          )}

          {/* Past booking notice */}
          {isActive && isPast && (
            <div className="bg-white rounded-b-lg shadow-md px-6 py-4 border-t">
              <p className="text-sm text-gray-500 text-center">
                {t('pastBookingNotice')}
              </p>
            </div>
          )}

          {/* Completed/no_show notice */}
          {(booking.status === 'completed' || booking.status === 'no_show') && (
            <div className="bg-white rounded-b-lg shadow-md px-6 py-4 border-t">
              <p className="text-sm text-gray-500 text-center">
                {booking.status === 'completed'
                  ? t('completedNotice')
                  : t('noShowNotice')}
              </p>
            </div>
          )}

          {/* Footer */}
          {!isActive && !isPast && (
            <div className="rounded-b-lg" />
          )}
          <p className="text-center text-xs text-gray-400 mt-4">
            {t('poweredBy')}
          </p>
        </div>
      </div>
    </BusinessLocaleProvider>
  )
}

function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status, labels }: { status: string; labels: Record<string, string> }) {
  const classMap: Record<string, string> = {
    unconfirmed: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-gray-100 text-gray-800',
    no_show: 'bg-gray-100 text-gray-800',
  }

  const label = labels[status] || status
  const className = classMap[status] || 'bg-gray-100 text-gray-800'

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${className}`}>
      {label}
    </span>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-500">{label}</span>
        <p className="font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  )
}
