'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { BookingActions } from '@/components/dashboard/BookingActions'
import { formatDate, formatTime, formatCurrency } from '@/lib/utils'
import { Calendar, User, Briefcase, Users } from 'lucide-react'

interface Booking {
  booking: {
    id: string
    startsAt: string
    price: string | null
    status: string | null
    notes: string | null
  }
  service: { name: string } | null
  staffMember: { name: string } | null
  customer: { name: string | null; email: string } | null
}

interface BookingCardProps {
  booking: Booking
  timezone: string
  onStatusChange: () => void
}

export function BookingCard({ booking: { booking, service, staffMember, customer }, timezone, onStatusChange }: BookingCardProps) {
  const t = useTranslations('dashboard.bookings.detail')
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Customer name & status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 truncate">
                {customer?.name || t('unknown')}
              </span>
              <StatusBadge status={booking.status || 'pending'} />
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-1 gap-1.5 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span>{formatDate(booking.startsAt, timezone)}, {formatTime(booking.startsAt, timezone)}</span>
              </div>
              {service && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="truncate">{service.name}</span>
                </div>
              )}
              {staffMember && (
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="truncate">{staffMember.name}</span>
                </div>
              )}
              {customer?.email && (
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
            </div>

            {/* Price */}
            {booking.price && (
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(booking.price, 'EUR')}
              </p>
            )}
          </div>

          {/* Actions */}
          <BookingActions
            bookingId={booking.id}
            status={booking.status || 'pending'}
            onStatusChange={onStatusChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
