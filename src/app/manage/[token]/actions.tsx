'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { DatePicker } from '@/components/booking/DatePicker'
import { TimePicker } from '@/components/booking/TimePicker'
import { XCircle, CalendarClock, Loader2, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react'

type FlowState =
  | 'idle'
  | 'cancel'
  | 'reschedule_date'
  | 'reschedule_time'
  | 'confirm_reschedule'
  | 'done'

interface ManageActionsProps {
  token: string
  bookingId: string
  businessSlug: string
  serviceId: string
  staffId?: string
  serviceDurationMinutes: number
  cancellationPolicyHours: number
  startsAt: string
  timezone: string
}

export function ManageActions({
  token,
  businessSlug,
  serviceId,
  staffId,
  serviceDurationMinutes,
  cancellationPolicyHours,
  startsAt,
  timezone,
}: ManageActionsProps) {
  const t = useTranslations('manage')
  const tc = useTranslations('common')
  const locale = useLocale()
  const dateLocale = locale === 'de' ? 'de-DE' : 'en-US'
  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<Date | null>(null)

  const bookingStart = new Date(startsAt)
  const hoursUntilBooking = (bookingStart.getTime() - Date.now()) / (1000 * 60 * 60)
  const withinPolicy = cancellationPolicyHours > 0 && hoursUntilBooking < cancellationPolicyHours

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

  const handleCancel = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/manage/${token}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancellationReason || undefined }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('cancelError'))
      }

      setFlowState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReschedule = async () => {
    if (!selectedTime) return
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/manage/${token}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStartsAt: selectedTime.toISOString() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('rescheduleError'))
      }

      setFlowState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Done state - show success and reload
  if (flowState === 'done') {
    return (
      <div className="text-center py-4">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <p className="font-medium text-gray-900 mb-2">{t('successTitle')}</p>
        <p className="text-sm text-gray-600 mb-4">
          {t('successMessage')}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {t('refreshPage')}
        </button>
      </div>
    )
  }

  // Idle state - show action buttons
  if (flowState === 'idle') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setFlowState('reschedule_date')}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <CalendarClock className="h-4 w-4" />
          {t('reschedule')}
        </button>
        <button
          onClick={() => setFlowState('cancel')}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
        >
          <XCircle className="h-4 w-4" />
          {t('cancelBooking')}
        </button>
      </div>
    )
  }

  // Cancel flow
  if (flowState === 'cancel') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFlowState('idle'); setError(null) }}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h3 className="font-semibold text-gray-900">{t('cancelTitle')}</h3>
        </div>

        {withinPolicy && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">{t('cancelShortNotice')}</p>
              <p className="text-yellow-700">
                {t('cancelShortNoticeInfo', { hours: cancellationPolicyHours })}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('cancelReasonLabel')}
          </label>
          <textarea
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
            placeholder={t('cancelReasonPlaceholder')}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => { setFlowState('idle'); setError(null) }}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            {tc('cancel')}
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              t('confirmCancel')
            )}
          </button>
        </div>
      </div>
    )
  }

  // Reschedule - Step 1: Date picker
  if (flowState === 'reschedule_date') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFlowState('idle'); setError(null); setSelectedDate(null) }}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h3 className="font-semibold text-gray-900">{t('selectNewDate')}</h3>
        </div>

        <DatePicker
          businessSlug={businessSlug}
          serviceId={serviceId}
          staffId={staffId}
          maxAdvanceBookingDays={60}
          onSelect={(date) => {
            setSelectedDate(date)
            setFlowState('reschedule_time')
          }}
        />
      </div>
    )
  }

  // Reschedule - Step 2: Time picker
  if (flowState === 'reschedule_time' && selectedDate) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFlowState('reschedule_date'); setError(null); setSelectedTime(null) }}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h3 className="font-semibold text-gray-900">
            {t('selectNewTime', { date: formatDate(selectedDate) })}
          </h3>
        </div>

        <TimePicker
          businessSlug={businessSlug}
          serviceId={serviceId}
          staffId={staffId}
          date={selectedDate}
          onSelect={(time) => {
            setSelectedTime(time)
            setFlowState('confirm_reschedule')
          }}
        />
      </div>
    )
  }

  // Reschedule - Step 3: Confirm
  if (flowState === 'confirm_reschedule' && selectedTime) {
    const newEndsAt = new Date(selectedTime.getTime() + serviceDurationMinutes * 60 * 1000)

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFlowState('reschedule_time'); setError(null) }}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h3 className="font-semibold text-gray-900">{t('confirmReschedule')}</h3>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-sm text-gray-500">{t('currentAppointment')}</p>
            <p className="font-medium text-gray-900 line-through">
              {formatDate(bookingStart)}, {formatTime(bookingStart)} Uhr
            </p>
          </div>
          <div className="border-t pt-3">
            <p className="text-sm text-gray-500">{t('newAppointment')}</p>
            <p className="font-medium text-green-700">
              {formatDate(selectedTime)}, {formatTime(selectedTime)} - {formatTime(newEndsAt)} Uhr
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => { setFlowState('idle'); setError(null); setSelectedDate(null); setSelectedTime(null) }}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            {tc('cancel')}
          </button>
          <button
            onClick={handleReschedule}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              t('confirmRescheduleBtn')
            )}
          </button>
        </div>
      </div>
    )
  }

  return null
}
