'use client'

import { Button } from '@/components/ui/button'
import { formatDate, formatTime } from '@/lib/utils'
import { CheckCircle2, Calendar, Clock, User, Building2 } from 'lucide-react'
import type { Service, Staff } from './BookingWidget'

interface ConfirmationProps {
  bookingId: string
  service: Service
  staff: Staff | null
  dateTime: Date
  businessName: string
  requireApproval: boolean
  onBookAnother: () => void
}

export function Confirmation({
  bookingId,
  service,
  staff,
  dateTime,
  businessName,
  requireApproval,
  onBookAnother,
}: ConfirmationProps) {
  return (
    <div className="text-center">
      {/* Success icon */}
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
      </div>

      {/* Title */}
      <h2 className="mb-2 text-xl font-semibold text-gray-900">
        {requireApproval ? 'Booking Request Sent!' : 'Booking Confirmed!'}
      </h2>

      {/* Message */}
      <p className="mb-6 text-gray-600">
        {requireApproval
          ? `Your booking request has been sent to ${businessName}. You'll receive a confirmation email once it's approved.`
          : `Your appointment has been confirmed. A confirmation email has been sent to your inbox.`}
      </p>

      {/* Booking details */}
      <div className="mb-6 rounded-lg bg-gray-50 p-4 text-left">
        <h3 className="mb-3 text-sm font-medium text-gray-700">
          Booking Details
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Building2 className="h-4 w-4" />
            <span className="font-medium text-gray-900">{businessName}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span className="font-medium">{service.name}</span>
            <span className="text-gray-400">•</span>
            <span>{service.durationMinutes} min</span>
          </div>
          {staff && (
            <div className="flex items-center gap-2 text-gray-600">
              <User className="h-4 w-4" />
              <span>{staff.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(dateTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{formatTime(dateTime)}</span>
          </div>
        </div>

        {/* Booking reference */}
        <div className="mt-4 border-t border-gray-200 pt-3">
          <p className="text-xs text-gray-500">
            Booking reference:{' '}
            <span className="font-mono font-medium text-gray-700">
              {bookingId.slice(0, 8).toUpperCase()}
            </span>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={onBookAnother}
        >
          Book Another Appointment
        </Button>
      </div>
    </div>
  )
}
