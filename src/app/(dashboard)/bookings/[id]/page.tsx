import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { getBookingById } from '@/lib/db/queries'
import { formatDate, formatTime, formatCurrency } from '@/lib/utils'
import { ArrowLeft, User, Briefcase, Clock, DollarSign, Mail, Phone, FileText } from 'lucide-react'
import { BookingDetailActions } from './BookingDetailActions'
import { auth } from '@clerk/nextjs/server'
import { getUserFirstBusiness } from '@/lib/auth-helpers'

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

  const result = await getBookingById(id)

  if (!result) {
    notFound()
  }

  const { booking, service, staffMember, customer } = result

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/bookings"
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Bookings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
            <p className="text-gray-600">
              {formatDate(booking.startsAt, timezone)} at {formatTime(booking.startsAt, timezone)}
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
              Appointment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Date & Time</p>
              <p className="font-medium">
                {formatDate(booking.startsAt, timezone)}
              </p>
              <p className="text-gray-600">
                {formatTime(booking.startsAt, timezone)} - {formatTime(booking.endsAt, timezone)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Service</p>
              <p className="font-medium">{service?.name || 'Unknown service'}</p>
              {service?.description && (
                <p className="text-sm text-gray-600">{service.description}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Staff</p>
              <p className="font-medium">{staffMember?.name || 'Any available'}</p>
              {staffMember?.title && (
                <p className="text-sm text-gray-600">{staffMember.title}</p>
              )}
            </div>
            {booking.price && (
              <div>
                <p className="text-sm text-gray-500">Price</p>
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
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{customer?.name || 'Unknown'}</p>
            </div>
            {customer?.email && (
              <div>
                <p className="text-sm text-gray-500">Email</p>
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
                <p className="text-sm text-gray-500">Phone</p>
                <a
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {customer.phone}
                </a>
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
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Customer Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-700">{booking.notes}</p>
                </div>
              )}
              {booking.internalNotes && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Internal Notes</p>
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
              <CardTitle className="text-red-800">Cancellation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-red-600">
                  Cancelled by: {booking.cancelledBy || 'Unknown'}
                </p>
                <p className="text-red-700">{booking.cancellationReason}</p>
                {booking.cancelledAt && (
                  <p className="text-sm text-red-600">
                    {formatDate(booking.cancelledAt, timezone)} at {formatTime(booking.cancelledAt, timezone)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
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
