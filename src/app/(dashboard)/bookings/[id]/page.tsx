import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { getBookingById } from '@/lib/db/queries'
import { formatDate, formatTime, formatCurrency } from '@/lib/utils'
import { ArrowLeft, User, Clock, Mail, Phone, FileText } from 'lucide-react'
import { BookingDetailActions } from './BookingDetailActions'
import { BookingItems } from './BookingItems'
import { InvoiceCard } from '@/components/invoices/InvoiceCard'
import { LieferscheinCard } from '@/components/lieferschein/LieferscheinCard'
import { auth } from '@clerk/nextjs/server'
import { getUserFirstBusiness } from '@/lib/auth-helpers'
import { getInvoiceByBookingId } from '@/lib/invoices'
import { getTranslations } from 'next-intl/server'
import type { InvoiceLineItem } from '@/lib/db/schema'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BookingDetailPage({ params }: PageProps) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const memberData = await getUserFirstBusiness()
  if (!memberData?.business) redirect('/onboarding')

  const business = memberData.business
  const timezone = business.timezone || 'Europe/Berlin'
  const t = await getTranslations('dashboard.bookings.detail')

  const result = await getBookingById(id)

  if (!result) {
    notFound()
  }

  const { booking, service, staffMember, customer } = result

  // Get items and lieferschein status from booking
  const bookingItems = (booking as Record<string, unknown>).items as InvoiceLineItem[] | null
  const lieferscheinR2Key = (booking as Record<string, unknown>).lieferscheinR2Key as string | null

  // Fetch active invoice status for BookingItems warning
  const activeInvoice = await getInvoiceByBookingId(booking.id)
  const invoiceStatus = activeInvoice?.status

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/bookings"
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('backToBookings')}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('bookingDetails')}</h1>
            <p className="text-gray-600">
              {formatDate(booking.startsAt, timezone)} {t('at')} {formatTime(booking.startsAt, timezone)}
            </p>
          </div>
          <StatusBadge status={booking.status || 'pending'} className="text-sm px-3 py-1" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Booking Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('appointment')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">{t('dateTime')}</p>
              <p className="font-medium">
                {formatDate(booking.startsAt, timezone)}
              </p>
              <p className="text-gray-600">
                {formatTime(booking.startsAt, timezone)} - {formatTime(booking.endsAt, timezone)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('service')}</p>
              <p className="font-medium">{service?.name || t('unknownService')}</p>
              {service?.description && (
                <p className="text-sm text-gray-600">{service.description}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('staff')}</p>
              <p className="font-medium">{staffMember?.name || t('anyAvailable')}</p>
              {staffMember?.title && (
                <p className="text-sm text-gray-600">{staffMember.title}</p>
              )}
            </div>
            {booking.price && (
              <div>
                <p className="text-sm text-gray-500">{t('price')}</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(booking.price, 'EUR')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('customer')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">{t('customer')}</p>
              <p className="font-medium">{customer?.name || t('unknown')}</p>
            </div>
            {customer?.email && (
              <div>
                <a
                  href={`mailto:${customer.email}`}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {customer.email}
                </a>
              </div>
            )}
            {customer?.phone && (
              <div>
                <a
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {customer.phone}
                </a>
              </div>
            )}
            {(customer?.street || customer?.city || customer?.postalCode) && (
              <div>
                <p className="text-sm text-gray-500">{t('address')}</p>
                <div className="font-medium">
                  {customer.street && <p>{customer.street}</p>}
                  {(customer.postalCode || customer.city) && (
                    <p>{[customer.postalCode, customer.city].filter(Boolean).join(' ')}</p>
                  )}
                  {customer.country && customer.country !== 'Deutschland' && (
                    <p>{customer.country}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {(booking.notes || booking.internalNotes) && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('notes')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('customerNotes')}</p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-700">{booking.notes}</p>
                </div>
              )}
              {booking.internalNotes && (
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('internalNotes')}</p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-700">{booking.internalNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cancellation Info */}
        {booking.status === 'cancelled' && booking.cancellationReason && (
          <Card className="border-red-200 bg-red-50 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-red-800">{t('cancellation')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-red-600">
                  {t('cancelledBy')}: {booking.cancelledBy || t('unknown')}
                </p>
                <p className="text-red-700">{booking.cancellationReason}</p>
                {booking.cancelledAt && (
                  <p className="text-sm text-red-600">
                    {formatDate(booking.cancelledAt, timezone)} {t('at')} {formatTime(booking.cancelledAt, timezone)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Items (for Lieferschein) */}
        {booking.status !== 'cancelled' && (
          <BookingItems
            bookingId={booking.id}
            initialItems={bookingItems}
            invoiceStatus={invoiceStatus}
          />
        )}

        {/* Lieferschein */}
        {booking.status !== 'cancelled' && (
          <LieferscheinCard
            bookingId={booking.id}
            hasItems={!!bookingItems && bookingItems.length > 0}
            hasLieferschein={!!lieferscheinR2Key}
          />
        )}

        {/* Invoice */}
        {booking.status !== 'cancelled' && (
          <InvoiceCard
            bookingId={booking.id}
            customer={customer ? {
              id: customer.id,
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              street: customer.street,
              city: customer.city,
              postalCode: customer.postalCode,
              country: customer.country,
            } : null}
          />
        )}

        {/* Actions */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('actions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingDetailActions
              bookingId={booking.id}
              status={booking.status || 'pending'}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
