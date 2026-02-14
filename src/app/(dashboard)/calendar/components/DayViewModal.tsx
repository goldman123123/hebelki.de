'use client'

import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { formatTime } from '@/lib/utils'

interface Booking {
  booking: {
    id: string
    startsAt: Date
    endsAt: Date
    status: string | null
    notes: string | null
  }
  service: {
    name: string
  } | null
  staff: {
    name: string
  } | null
  customer: {
    name: string | null
    email: string
  } | null
}

interface DayViewModalProps {
  date: Date
  bookings: Booking[]
  onClose: () => void
  timezone: string
}

export function DayViewModal({ date, bookings, onClose, timezone }: DayViewModalProps) {
  const t = useTranslations('dashboard.calendar')
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('bookingsFor', { date: format(date, 'MMMM d, yyyy') })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {bookings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('noBookingsForDay')}</p>
          ) : (
            bookings.map((row) => (
              <div key={row.booking.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {formatTime(row.booking.startsAt, timezone)} -{' '}
                        {formatTime(row.booking.endsAt, timezone)}
                      </span>
                      <Badge className={getStatusColor(row.booking.status)}>
                        {row.booking.status || 'pending'}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mt-1">
                      {row.customer?.name || t('unknownCustomer')} ({row.customer?.email})
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {t('service')} {row.service?.name || t('unknownService')}
                    </p>
                    {row.staff && (
                      <p className="text-sm text-gray-500">
                        {t('staff')} {row.staff.name}
                      </p>
                    )}
                    {row.booking.notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        {t('notes')} {row.booking.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
