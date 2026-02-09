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
import { Calendar } from '@/components/ui/calendar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
} from 'lucide-react'
import { cn, formatTime, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { de } from 'date-fns/locale'
import { format, isBefore, startOfDay } from 'date-fns'

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

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'customer':
        return (
          <div className="space-y-4">
            <Tabs value={customerTab} onValueChange={(v) => setCustomerTab(v as 'existing' | 'new')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Bestehender Kunde</TabsTrigger>
                <TabsTrigger value="new">Neuer Kunde</TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Kunde suchen (Name, E-Mail, Telefon)..."
                    value={customerSearch}
                    onChange={(e) => {
                      const val = e.target.value
                      setCustomerSearch(val)
                      if (val === '') searchCustomers('')
                    }}
                    className="pl-10"
                  />
                </div>

                {loadingCustomers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : customers.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500">
                    {customerSearch.length === 1
                      ? 'Mindestens 2 Zeichen eingeben'
                      : 'Keine Kunden gefunden'}
                  </p>
                ) : (
                  <div className="max-h-[200px] space-y-1 overflow-y-auto">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => setSelectedCustomer(customer)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors',
                          selectedCustomer?.id === customer.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-gray-50'
                        )}
                      >
                        <div>
                          <div className="font-medium">
                            {customer.name || 'Unbenannt'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {customer.email || customer.phone || '-'}
                          </div>
                        </div>
                        {selectedCustomer?.id === customer.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="new" className="space-y-4">
                <div>
                  <Label>Name <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Max Mustermann"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>E-Mail</Label>
                  <Input
                    type="email"
                    placeholder="max@example.com"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input
                    type="tel"
                    placeholder="+49 123 456789"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )

      case 'service':
        return (
          <div className="space-y-4">
            <div>
              <Label>Dienstleistung <span className="text-red-500">*</span></Label>
              {loadingServices ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : (
                <Select
                  value={selectedService?.id || ''}
                  onValueChange={(id) => {
                    const service = services.find((s) => s.id === id)
                    setSelectedService(service || null)
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Dienstleistung wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex items-center justify-between gap-4">
                          <span>{service.name}</span>
                          <span className="text-gray-500">
                            {service.durationMinutes} Min
                            {service.price && ` - ${formatCurrency(service.price, 'EUR')}`}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label>Mitarbeiter (optional)</Label>
              {loadingStaff ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : (
                <Select
                  value={selectedStaff || 'auto'}
                  onValueChange={(id) => {
                    setSelectedStaff(id === 'auto' ? null : id)
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Automatisch zuweisen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatisch zuweisen</SelectItem>
                    {staffList.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name}
                        {staff.title && ` - ${staff.title}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )

      case 'datetime':
        return (
          <div className="space-y-4">
            <div>
              <Label>Datum <span className="text-red-500">*</span></Label>
              <div className="mt-2 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={de}
                  disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                  className="rounded-md border"
                />
              </div>
            </div>

            {selectedDate && (
              <div>
                <Label>Uhrzeit <span className="text-red-500">*</span></Label>
                {loadingSlots ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : timeSlots.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500">
                    Keine Zeitslots verfuegbar
                  </p>
                ) : (
                  <div className="mt-2 grid max-h-[200px] grid-cols-4 gap-2 overflow-y-auto">
                    {timeSlots.map((slot) => {
                      const timeStr = formatTime(slot.start, timezone)
                      return (
                        <button
                          key={slot.start}
                          onClick={() => setSelectedTime(slot.start)}
                          disabled={!slot.available}
                          className={cn(
                            'flex items-center justify-center rounded-md border px-2 py-2 text-sm transition-colors',
                            selectedTime === slot.start
                              ? 'border-primary bg-primary text-primary-foreground'
                              : slot.available
                              ? 'hover:border-gray-400 hover:bg-gray-50'
                              : 'cursor-not-allowed bg-gray-100 text-gray-400 line-through'
                          )}
                        >
                          {timeStr}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'options':
        return (
          <div className="space-y-4">
            <div className="rounded-lg border bg-gray-50 p-4">
              <h4 className="font-medium">Zusammenfassung</h4>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Kunde:</dt>
                  <dd>
                    {customerTab === 'existing'
                      ? selectedCustomer?.name || 'Unbenannt'
                      : newCustomer.name}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Dienstleistung:</dt>
                  <dd>{selectedService?.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Mitarbeiter:</dt>
                  <dd>
                    {selectedStaff
                      ? staffList.find((s) => s.id === selectedStaff)?.name
                      : 'Automatisch'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Datum & Zeit:</dt>
                  <dd>
                    {selectedDate && format(selectedDate, 'dd.MM.yyyy', { locale: de })}{' '}
                    {selectedTime && formatTime(selectedTime, timezone)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Preis:</dt>
                  <dd>
                    {customPrice.trim()
                      ? formatCurrency(customPrice, 'EUR')
                      : selectedService?.price
                      ? formatCurrency(selectedService.price, 'EUR')
                      : '-'}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <Label>Preis ueberschreiben (optional)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={selectedService?.price || 'Kein Preis'}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Kundennotizen (optional)</Label>
              <Textarea
                placeholder="Notizen fuer den Kunden..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label>Interne Notizen (optional)</Label>
              <Textarea
                placeholder="Nur fuer Mitarbeiter sichtbar..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendEmail"
                  checked={sendConfirmationEmail}
                  onCheckedChange={(checked) =>
                    setSendConfirmationEmail(checked as boolean)
                  }
                />
                <Label htmlFor="sendEmail" className="cursor-pointer">
                  Bestaetigungsmail senden
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skipAvailability"
                  checked={skipAvailabilityCheck}
                  onCheckedChange={(checked) =>
                    setSkipAvailabilityCheck(checked as boolean)
                  }
                />
                <Label htmlFor="skipAvailability" className="cursor-pointer">
                  Verfuegbarkeitspruefung ueberspringen
                </Label>
              </div>
              {skipAvailabilityCheck && (
                <p className="flex items-start gap-1 text-xs text-amber-600">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  Achtung: Kann zu Doppelbuchungen fuehren
                </p>
              )}
            </div>
          </div>
        )
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

        <div className="min-h-[300px] py-4">{renderStepContent()}</div>

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
