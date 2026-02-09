'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/forms'
import { FormTextarea } from '@/components/forms/FormField'
import { Check, X, Loader2 } from 'lucide-react'

interface BookingDetailActionsProps {
  bookingId: string
  status: string
}

export function BookingDetailActions({ bookingId, status }: BookingDetailActionsProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  async function handleStatusChange(newStatus: string, options?: Record<string, unknown>) {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...options }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleReject() {
    await handleStatusChange('cancelled', {
      cancellationReason: rejectReason || 'Cancelled by staff',
      cancelledBy: 'staff',
    })
    setShowRejectDialog(false)
    setRejectReason('')
  }

  if (status === 'unconfirmed') {
    return (
      <div className="space-y-3">
        <div className="rounded-md bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">
          Wartet auf Kundenbestätigung per E-Mail. Der Kunde hat einen Bestätigungslink per E-Mail erhalten.
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => handleStatusChange('confirmed')}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Manuell bestätigen
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowRejectDialog(true)}
            disabled={isSubmitting}
          >
            <X className="mr-2 h-4 w-4" />
            Ablehnen
          </Button>
        </div>

        <FormDialog
          open={showRejectDialog}
          onOpenChange={setShowRejectDialog}
          title="Buchung ablehnen"
          description="Bitte geben Sie einen Grund für die Ablehnung an. Der Kunde wird benachrichtigt."
          onSubmit={handleReject}
          isSubmitting={isSubmitting}
          submitLabel="Ablehnen"
          variant="destructive"
        >
          <FormTextarea
            label="Grund"
            name="reason"
            placeholder="Grund für die Ablehnung..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
        </FormDialog>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => handleStatusChange('confirmed')}
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Approve Booking
        </Button>
        <Button
          variant="destructive"
          onClick={() => setShowRejectDialog(true)}
          disabled={isSubmitting}
        >
          <X className="mr-2 h-4 w-4" />
          Reject Booking
        </Button>

        <FormDialog
          open={showRejectDialog}
          onOpenChange={setShowRejectDialog}
          title="Reject Booking"
          description="Please provide a reason for rejecting this booking. The customer will be notified."
          onSubmit={handleReject}
          isSubmitting={isSubmitting}
          submitLabel="Reject"
          variant="destructive"
        >
          <FormTextarea
            label="Reason"
            name="reason"
            placeholder="Enter reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
        </FormDialog>
      </div>
    )
  }

  if (status === 'confirmed') {
    return (
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => handleStatusChange('completed')}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Mark Completed
        </Button>
        <Button
          variant="outline"
          onClick={() => handleStatusChange('no_show')}
          disabled={isSubmitting}
        >
          Mark No Show
        </Button>
        <Button
          variant="destructive"
          onClick={() => setShowRejectDialog(true)}
          disabled={isSubmitting}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel Booking
        </Button>

        <FormDialog
          open={showRejectDialog}
          onOpenChange={setShowRejectDialog}
          title="Cancel Booking"
          description="Please provide a reason for cancelling this booking. The customer will be notified."
          onSubmit={handleReject}
          isSubmitting={isSubmitting}
          submitLabel="Cancel Booking"
          variant="destructive"
        >
          <FormTextarea
            label="Reason"
            name="reason"
            placeholder="Enter reason for cancellation..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
        </FormDialog>
      </div>
    )
  }

  return (
    <p className="text-gray-500">
      No actions available for {status} bookings.
    </p>
  )
}
