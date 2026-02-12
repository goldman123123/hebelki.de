'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { BookingStepContent } from './BookingStepContent'

interface Customer {
  id: string
  name: string | null
  email: string | null
  phone: string | null
}

interface Service {
  id: string
  name: string
  durationMinutes: number
  price: string | null
}

interface Staff {
  id: string
  name: string
  title: string | null
}

interface TimeSlot {
  start: string
  end: string
  available: boolean
}

interface CreateBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type Step = 'customer' | 'service' | 'datetime' | 'options'

export function CreateBookingDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateBookingDialogProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState<Step>('customer')

  // Customer selection
  const [customerTab, setCustomerTab] = useState<'existing' | 'new'>('existing')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
  })

  // Service & Staff selection
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loadingStaff, setLoadingStaff] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)

  // Date & Time selection
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [timezone, setTimezone] = useState('Europe/Berlin')

  // Options
  const [skipAvailabilityCheck, setSkipAvailabilityCheck] = useState(false)
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(true)
  const [customPrice, setCustomPrice] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  // Submission
  const [submitting, setSubmitting] = useState(false)

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep('customer')
      setCustomerTab('existing')
      setCustomerSearch('')
      setCustomers([])
      setSelectedCustomer(null)
      setNewCustomer({ name: '', email: '', phone: '' })
      setSelectedService(null)
      setSelectedStaff(null)
      setSelectedDate(undefined)
      setTimeSlots([])
      setSelectedTime(null)
      setSkipAvailabilityCheck(false)
      setSendConfirmationEmail(true)
      setCustomPrice('')
      setCustomerNotes('')
      setInternalNotes('')
    }
  }, [open])

  // Load services when dialog opens
  useEffect(() => {
    if (open) {
      fetchServices()
      fetchStaff()
    }
  }, [open])

  // Search customers (empty search = recent customers)
  const searchCustomers = useCallback(async (query: string) => {
    if (query.length === 1) {
      return
    }

    setLoadingCustomers(true)
    try {
      let url = '/api/admin/customers?limit=10&simple=true'
      if (query.length >= 2) {
        url += `&search=${encodeURIComponent(query)}`
      }
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setCustomers(data.customers || [])
      }
    } catch (error) {
      console.error('Failed to search customers:', error)
    } finally {
      setLoadingCustomers(false)
    }
  }, [])

  // Load recent customers when dialog opens
  useEffect(() => {
    if (open && customerTab === 'existing') {
      searchCustomers('')
    }
  }, [open, customerTab, searchCustomers])

  // Debounced search
  useEffect(() => {
    if (!customerSearch) return
    const timer = setTimeout(() => {
      if (customerTab === 'existing') {
        searchCustomers(customerSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [customerSearch, customerTab, searchCustomers])

  // Fetch services
  const fetchServices = async () => {
    setLoadingServices(true)
    try {
      const res = await fetch('/api/admin/services')
      const data = await res.json()
      if (res.ok) {
        setServices(data.services || [])
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
    } finally {
      setLoadingServices(false)
    }
  }

  // Fetch staff
  const fetchStaff = async () => {
    setLoadingStaff(true)
    try {
      const res = await fetch('/api/admin/staff')
      const data = await res.json()
      if (res.ok) {
        setStaffList(data.staff || [])
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    } finally {
      setLoadingStaff(false)
    }
  }

  // Fetch time slots when date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !selectedService) {
        setTimeSlots([])
        setSelectedTime(null)
        return
      }

      setLoadingSlots(true)
      setSelectedTime(null)
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        let url = `/api/admin/availability/slots?serviceId=${selectedService.id}&date=${dateStr}`
        if (selectedStaff) {
          url += `&staffId=${selectedStaff}`
        }

        const res = await fetch(url)
        const data = await res.json()
        if (res.ok) {
          setTimeSlots(data.slots || [])
          setTimezone(data.timezone || 'Europe/Berlin')
        }
      } catch (error) {
        console.error('Failed to fetch time slots:', error)
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchSlots()
  }, [selectedDate, selectedService, selectedStaff])

  // Step navigation
  const canProceed = () => {
    switch (currentStep) {
      case 'customer':
        if (customerTab === 'existing') {
          return selectedCustomer !== null
        }
        return newCustomer.name.trim().length > 0
      case 'service':
        return selectedService !== null
      case 'datetime':
        return selectedDate !== undefined && selectedTime !== null
      case 'options':
        return true
      default:
        return false
    }
  }

  const goToNextStep = () => {
    const steps: Step[] = ['customer', 'service', 'datetime', 'options']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const goToPreviousStep = () => {
    const steps: Step[] = ['customer', 'service', 'datetime', 'options']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  // Submit booking
  const handleSubmit = async () => {
    if (!selectedService || !selectedTime) {
      toast.error('Bitte alle Pflichtfelder ausfuellen')
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        serviceId: selectedService.id,
        staffId: selectedStaff || null,
        startsAt: selectedTime,
        skipAvailabilityCheck,
        sendConfirmationEmail,
        customerNotes: customerNotes.trim() || null,
        internalNotes: internalNotes.trim() || null,
      }

      if (customPrice.trim()) {
        payload.customPrice = customPrice.trim()
      }

      // Add customer data
      if (customerTab === 'existing' && selectedCustomer) {
        payload.customerId = selectedCustomer.id
      } else {
        payload.customerName = newCustomer.name.trim()
        payload.customerEmail = newCustomer.email.trim() || null
        payload.customerPhone = newCustomer.phone.trim() || null
      }

      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Buchung erstellt')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(data.error || 'Fehler beim Erstellen der Buchung')
      }
    } catch (error) {
      console.error('Failed to create booking:', error)
      toast.error('Fehler beim Erstellen der Buchung')
    } finally {
      setSubmitting(false)
    }
  }

  const stepTitles: Record<Step, string> = {
    customer: 'Kunde waehlen',
    service: 'Dienstleistung waehlen',
    datetime: 'Datum & Zeit waehlen',
    options: 'Optionen & Bestaetigen',
  }

  const stepNumbers: Record<Step, number> = {
    customer: 1,
    service: 2,
    datetime: 3,
    options: 4,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neue Buchung erstellen</DialogTitle>
          <DialogDescription>
            Schritt {stepNumbers[currentStep]} von 4: {stepTitles[currentStep]}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex justify-between px-4">
          {(['customer', 'service', 'datetime', 'options'] as Step[]).map((step, idx) => (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                  currentStep === step
                    ? 'bg-primary text-primary-foreground'
                    : stepNumbers[step] < stepNumbers[currentStep]
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                )}
              >
                {stepNumbers[step] < stepNumbers[currentStep] ? (
                  <Check className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < 3 && (
                <div
                  className={cn(
                    'mx-2 h-0.5 w-8',
                    stepNumbers[step] < stepNumbers[currentStep]
                      ? 'bg-green-300'
                      : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="min-h-[300px] py-4">
          <BookingStepContent
            currentStep={currentStep}
            customerTab={customerTab}
            setCustomerTab={setCustomerTab}
            customerSearch={customerSearch}
            setCustomerSearch={setCustomerSearch}
            searchCustomers={searchCustomers}
            loadingCustomers={loadingCustomers}
            customers={customers}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            newCustomer={newCustomer}
            setNewCustomer={setNewCustomer}
            services={services}
            loadingServices={loadingServices}
            selectedService={selectedService}
            setSelectedService={setSelectedService}
            staffList={staffList}
            loadingStaff={loadingStaff}
            selectedStaff={selectedStaff}
            setSelectedStaff={setSelectedStaff}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            loadingSlots={loadingSlots}
            timeSlots={timeSlots}
            selectedTime={selectedTime}
            setSelectedTime={setSelectedTime}
            timezone={timezone}
            customPrice={customPrice}
            setCustomPrice={setCustomPrice}
            customerNotes={customerNotes}
            setCustomerNotes={setCustomerNotes}
            internalNotes={internalNotes}
            setInternalNotes={setInternalNotes}
            sendConfirmationEmail={sendConfirmationEmail}
            setSendConfirmationEmail={setSendConfirmationEmail}
            skipAvailabilityCheck={skipAvailabilityCheck}
            setSkipAvailabilityCheck={setSkipAvailabilityCheck}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {currentStep !== 'customer' && (
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={submitting}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Zurueck
            </Button>
          )}

          {currentStep !== 'options' ? (
            <Button onClick={goToNextStep} disabled={!canProceed()}>
              Weiter
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || !canProceed()}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Erstellen...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Buchung erstellen
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
