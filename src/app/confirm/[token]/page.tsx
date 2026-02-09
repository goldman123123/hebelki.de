import { getBookingByToken } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { bookings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { emitEventStandalone } from '@/modules/core/events'
import { processEvents } from '@/modules/core/events/processor'
import { CheckCircle, AlertCircle, Clock, Info } from 'lucide-react'

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Buchung nicht gefunden</h1>
          <p className="text-gray-600">
            Der Bestätigungslink ist ungültig oder die Buchung existiert nicht mehr.
          </p>
        </div>
      </div>
    )
  }

  const { booking, service, staffMember, customer, business } = result

  const formatDate = (date: Date) => date.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: business?.timezone || 'Europe/Berlin',
  })

  const formatTime = (date: Date) => date.toLocaleTimeString('de-DE', {
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bereits bestätigt</h1>
          <p className="text-gray-600 mb-6">
            Ihre Buchung wurde bereits bestätigt.
          </p>
          <BookingDetails
            serviceName={service?.name}
            date={formatDate(booking.startsAt)}
            time={`${formatTime(booking.startsAt)} - ${formatTime(booking.endsAt)} Uhr`}
            staffName={staffMember?.name}
            businessName={business?.name}
          />
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Buchung storniert</h1>
          <p className="text-gray-600">
            Diese Buchung wurde bereits storniert und kann nicht mehr bestätigt werden.
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Wartet auf Genehmigung</h1>
          <p className="text-gray-600 mb-6">
            Ihre Buchung wurde bestätigt und wartet auf die Genehmigung durch das Team.
            Sie erhalten eine weitere E-Mail, sobald Ihre Buchung genehmigt wurde.
          </p>
          <BookingDetails
            serviceName={service?.name}
            date={formatDate(booking.startsAt)}
            time={`${formatTime(booking.startsAt)} - ${formatTime(booking.endsAt)} Uhr`}
            staffName={staffMember?.name}
            businessName={business?.name}
          />
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ungültiger Status</h1>
          <p className="text-gray-600">
            Diese Buchung kann im aktuellen Status nicht bestätigt werden.
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Buchung bestätigt!</h1>
          <p className="text-gray-600 mb-6">
            Vielen Dank! Ihr Termin bei <strong>{business?.name}</strong> ist bestätigt.
            Wir freuen uns auf Ihren Besuch.
          </p>
          <BookingDetails
            serviceName={service?.name}
            date={formatDate(booking.startsAt)}
            time={`${formatTime(booking.startsAt)} - ${formatTime(booking.endsAt)} Uhr`}
            staffName={staffMember?.name}
            businessName={business?.name}
          />
        </div>
      </div>
    )
  }

  // requiresAdminApproval = true → moved to pending
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Buchung bestätigt</h1>
        <p className="text-gray-600 mb-6">
          Vielen Dank für Ihre Bestätigung! Ihre Buchung wird nun vom Team bei <strong>{business?.name}</strong> geprüft.
          Sie erhalten eine weitere E-Mail, sobald Ihre Buchung genehmigt wurde.
        </p>
        <BookingDetails
          serviceName={service?.name}
          date={formatDate(booking.startsAt)}
          time={`${formatTime(booking.startsAt)} - ${formatTime(booking.endsAt)} Uhr`}
          staffName={staffMember?.name}
          businessName={business?.name}
        />
      </div>
    </div>
  )
}

function BookingDetails({ serviceName, date, time, staffName, businessName }: {
  serviceName?: string | null
  date: string
  time: string
  staffName?: string | null
  businessName?: string | null
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-left">
      <h3 className="font-semibold text-gray-900 mb-3">Buchungsdetails</h3>
      <div className="space-y-2 text-sm">
        {businessName && (
          <div className="flex justify-between">
            <span className="text-gray-500">Unternehmen</span>
            <span className="font-medium">{businessName}</span>
          </div>
        )}
        {serviceName && (
          <div className="flex justify-between">
            <span className="text-gray-500">Service</span>
            <span className="font-medium">{serviceName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Datum</span>
          <span className="font-medium">{date}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Uhrzeit</span>
          <span className="font-medium">{time}</span>
        </div>
        {staffName && (
          <div className="flex justify-between">
            <span className="text-gray-500">Mitarbeiter</span>
            <span className="font-medium">{staffName}</span>
          </div>
        )}
      </div>
    </div>
  )
}
