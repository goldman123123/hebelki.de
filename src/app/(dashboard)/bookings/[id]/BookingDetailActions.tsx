'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/forms'
import { FormTextarea } from '@/components/forms/FormField'
import { Check, X, Loader2 } from 'lucide-react'

interface BookingDetailActionsProps {
  bookingId: string
  status: string
}

export function BookingDetailActions({ bookingId, status }: BookingDetailActionsProps) {
  const t = useTranslations('dashboard.bookings.detail')
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
          {t('waitingConfirmation')}
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
            {t('manualConfirm')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowRejectDialog(true)}
            disabled={isSubmitting}
          >
            <X className="mr-2 h-4 w-4" />
            {t('reject')}
          </Button>
        </div>

        <FormDialog
          open={showRejectDialog}
          onOpenChange={setShowRejectDialog}
          title={t('rejectBooking')}
          description={t('rejectBookingDesc')}
          onSubmit={handleReject}
          isSubmitting={isSubmitting}
          submitLabel={t('reject')}
          variant="destructive"
        >
          <FormTextarea
            label={t('reason')}
            name="reason"
            placeholder={t('reasonPlaceholder')}
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
          {t('approveBooking')}
        </Button>
        <Button
          variant="destructive"
          onClick={() => setShowRejectDialog(true)}
          disabled={isSubmitting}
        >
          <X className="mr-2 h-4 w-4" />
          {t('rejectAction')}
        </Button>

        <FormDialog
          open={showRejectDialog}
          onOpenChange={setShowRejectDialog}
          title={t('rejectBooking')}
          description={t('rejectBookingDesc')}
          onSubmit={handleReject}
          isSubmitting={isSubmitting}
          submitLabel={t('reject')}
          variant="destructive"
        >
          <FormTextarea
            label={t('reason')}
            name="reason"
            placeholder={t('reasonPlaceholder')}
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
          {t('markCompleted')}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleStatusChange('no_show')}
          disabled={isSubmitting}
        >
          {t('markNoShow')}
        </Button>
        <Button
          variant="destructive"
          onClick={() => setShowRejectDialog(true)}
          disabled={isSubmitting}
        >
          <X className="mr-2 h-4 w-4" />
          {t('cancelBooking')}
        </Button>

        <FormDialog
          open={showRejectDialog}
          onOpenChange={setShowRejectDialog}
          title={t('cancelBookingTitle')}
          description={t('cancelBookingDesc')}
          onSubmit={handleReject}
          isSubmitting={isSubmitting}
          submitLabel={t('cancelBooking')}
          variant="destructive"
        >
          <FormTextarea
            label={t('reason')}
            name="reason"
            placeholder={t('cancelReasonPlaceholder')}
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
      {t('noActions', { status })}
    </p>
  )
}
