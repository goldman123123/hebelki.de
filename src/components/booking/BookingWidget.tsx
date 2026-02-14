'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ServicePicker } from './ServicePicker'
import { StaffPicker } from './StaffPicker'
import { DatePicker } from './DatePicker'
import { TimePicker } from './TimePicker'
import { CustomerForm } from './CustomerForm'
import { Confirmation } from './Confirmation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Check } from 'lucide-react'

export interface Business {
  id: string
  name: string
  slug: string
  timezone: string
  currency: string
  minBookingNoticeHours: number
  maxAdvanceBookingDays: number
  requireApproval: boolean
  primaryColor: string
}

export interface Service {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  bufferMinutes: number
  price: string | null
  category: string | null
}

export interface Staff {
  id: string
  name: string
  title: string | null
  avatarUrl: string | null
}

export interface BookingData {
  serviceId: string
  staffId?: string
  date: Date
  time: Date
  customerName: string
  customerEmail: string
  customerPhone: string
  notes: string
}

interface BookingWidgetProps {
  business: Business
  services: Service[]
  staff: Staff[]
  onStepChange?: (step: Step) => void
  onBookingComplete?: (data: { bookingId: string; service: string; dateTime: string }) => void
}

export type Step = 'service' | 'staff' | 'date' | 'time' | 'customer' | 'confirmation'

const STEPS: Step[] = ['service', 'staff', 'date', 'time', 'customer', 'confirmation']

export function BookingWidget({ business, services, staff, onStepChange, onBookingComplete }: BookingWidgetProps) {
  const t = useTranslations('booking')
  const locale = useLocale()
  const dateLocale = locale === 'de' ? 'de-DE' : 'en-US'
  const [currentStep, setCurrentStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<Date | null>(null)
  const [bookingResult, setBookingResult] = useState<{
    id: string
    confirmationToken: string
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStepIndex = STEPS.indexOf(currentStep)

  const goToStep = (step: Step) => {
    setCurrentStep(step)
    setError(null)
    onStepChange?.(step)
  }

  const goBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      goToStep(STEPS[prevIndex])
    }
  }

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
    // If no staff or only one staff, skip staff selection
    if (staff.length === 0) {
      goToStep('date')
    } else if (staff.length === 1) {
      setSelectedStaff(staff[0])
      goToStep('date')
    } else {
      goToStep('staff')
    }
  }

  const handleStaffSelect = (staffMember: Staff | null) => {
    setSelectedStaff(staffMember)
    goToStep('date')
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    goToStep('time')
  }

  const handleTimeSelect = (time: Date) => {
    setSelectedTime(time)
    goToStep('customer')
  }

  const handleCustomerSubmit = async (data: {
    name: string
    email: string
    phone: string
    notes: string
  }) => {
    if (!selectedService || !selectedDate || !selectedTime) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/${business.slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService.id,
          staffId: selectedStaff?.id,
          startsAt: selectedTime.toISOString(),
          customerName: data.name,
          customerEmail: data.email,
          customerPhone: data.phone,
          notes: data.notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create booking')
      }

      const result = await response.json()
      setBookingResult(result)
      goToStep('confirmation')
      onBookingComplete?.({
        bookingId: result.id,
        service: selectedService.name,
        dateTime: selectedTime.toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetBooking = () => {
    setSelectedService(null)
    setSelectedStaff(null)
    setSelectedDate(null)
    setSelectedTime(null)
    setBookingResult(null)
    setError(null)
    goToStep('service')
  }

  return (
    <Card className="overflow-hidden">
      {/* Progress indicator */}
      {currentStep !== 'confirmation' && (
        <div className="border-b bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBack}
                  className="mr-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <span className="text-sm font-medium text-gray-700">
                {t('step', { current: currentStepIndex + 1, total: STEPS.length - 1 })}
              </span>
            </div>
            <div className="flex gap-1">
              {STEPS.slice(0, -1).map((step, index) => (
                <div
                  key={step}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    index <= currentStepIndex ? 'bg-primary' : 'bg-gray-200'
                  }`}
                  style={
                    index <= currentStepIndex
                      ? { backgroundColor: business.primaryColor }
                      : undefined
                  }
                />
              ))}
            </div>
          </div>

          {/* Selected items summary */}
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedService && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                <Check className="h-3 w-3 text-green-500" />
                {selectedService.name}
              </span>
            )}
            {selectedStaff && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                <Check className="h-3 w-3 text-green-500" />
                {selectedStaff.name}
              </span>
            )}
            {selectedDate && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                <Check className="h-3 w-3 text-green-500" />
                {selectedDate.toLocaleDateString(dateLocale, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {selectedTime && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                <Check className="h-3 w-3 text-green-500" />
                {selectedTime.toLocaleTimeString(dateLocale, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="border-b border-red-100 bg-red-50 px-6 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Step content */}
      <div className="p-6">
        {currentStep === 'service' && (
          <ServicePicker
            services={services}
            currency={business.currency}
            onSelect={handleServiceSelect}
          />
        )}

        {currentStep === 'staff' && (
          <StaffPicker
            staff={staff}
            onSelect={handleStaffSelect}
            allowAny={true}
          />
        )}

        {currentStep === 'date' && selectedService && (
          <DatePicker
            businessSlug={business.slug}
            serviceId={selectedService.id}
            staffId={selectedStaff?.id}
            maxAdvanceBookingDays={business.maxAdvanceBookingDays}
            onSelect={handleDateSelect}
          />
        )}

        {currentStep === 'time' && selectedService && selectedDate && (
          <TimePicker
            businessSlug={business.slug}
            serviceId={selectedService.id}
            staffId={selectedStaff?.id}
            date={selectedDate}
            onSelect={handleTimeSelect}
          />
        )}

        {currentStep === 'customer' && selectedService && selectedTime && (
          <CustomerForm
            service={selectedService}
            staff={selectedStaff}
            dateTime={selectedTime}
            currency={business.currency}
            onSubmit={handleCustomerSubmit}
            isSubmitting={isSubmitting}
          />
        )}

        {currentStep === 'confirmation' && bookingResult && selectedService && (
          <Confirmation
            bookingId={bookingResult.id}
            service={selectedService}
            staff={selectedStaff}
            dateTime={selectedTime!}
            businessName={business.name}
            requireApproval={business.requireApproval}
            onBookAnother={resetBooking}
          />
        )}
      </div>
    </Card>
  )
}
