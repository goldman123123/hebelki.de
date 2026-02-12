'use client'

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
import { Loader2, Search, Check, AlertCircle } from 'lucide-react'
import { cn, formatTime, formatCurrency } from '@/lib/utils'
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

type Step = 'customer' | 'service' | 'datetime' | 'options'

export interface BookingStepContentProps {
  currentStep: Step
  // Customer step
  customerTab: 'existing' | 'new'
  setCustomerTab: (tab: 'existing' | 'new') => void
  customerSearch: string
  setCustomerSearch: (search: string) => void
  searchCustomers: (query: string) => void
  loadingCustomers: boolean
  customers: Customer[]
  selectedCustomer: Customer | null
  setSelectedCustomer: (customer: Customer) => void
  newCustomer: { name: string; email: string; phone: string }
  setNewCustomer: (customer: { name: string; email: string; phone: string }) => void
  // Service step
  services: Service[]
  loadingServices: boolean
  selectedService: Service | null
  setSelectedService: (service: Service | null) => void
  staffList: Staff[]
  loadingStaff: boolean
  selectedStaff: string | null
  setSelectedStaff: (staffId: string | null) => void
  // DateTime step
  selectedDate: Date | undefined
  setSelectedDate: (date: Date | undefined) => void
  loadingSlots: boolean
  timeSlots: TimeSlot[]
  selectedTime: string | null
  setSelectedTime: (time: string) => void
  timezone: string
  // Options step
  customPrice: string
  setCustomPrice: (price: string) => void
  customerNotes: string
  setCustomerNotes: (notes: string) => void
  internalNotes: string
  setInternalNotes: (notes: string) => void
  sendConfirmationEmail: boolean
  setSendConfirmationEmail: (send: boolean) => void
  skipAvailabilityCheck: boolean
  setSkipAvailabilityCheck: (skip: boolean) => void
}

export function BookingStepContent(props: BookingStepContentProps) {
  switch (props.currentStep) {
    case 'customer':
      return <CustomerStep {...props} />
    case 'service':
      return <ServiceStep {...props} />
    case 'datetime':
      return <DateTimeStep {...props} />
    case 'options':
      return <OptionsStep {...props} />
  }
}

function CustomerStep({
  customerTab, setCustomerTab, customerSearch, setCustomerSearch,
  searchCustomers, loadingCustomers, customers, selectedCustomer,
  setSelectedCustomer, newCustomer, setNewCustomer,
}: BookingStepContentProps) {
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
}

function ServiceStep({
  services, loadingServices, selectedService, setSelectedService,
  staffList, loadingStaff, selectedStaff, setSelectedStaff,
}: BookingStepContentProps) {
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
}

function DateTimeStep({
  selectedDate, setSelectedDate, loadingSlots, timeSlots,
  selectedTime, setSelectedTime, timezone,
}: BookingStepContentProps) {
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
}

function OptionsStep({
  customerTab, selectedCustomer, newCustomer, selectedService,
  selectedStaff, staffList, selectedDate, selectedTime, timezone,
  customPrice, setCustomPrice, customerNotes, setCustomerNotes,
  internalNotes, setInternalNotes, sendConfirmationEmail,
  setSendConfirmationEmail, skipAvailabilityCheck, setSkipAvailabilityCheck,
}: BookingStepContentProps) {
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
            onCheckedChange={(checked) => setSendConfirmationEmail(checked as boolean)}
          />
          <Label htmlFor="sendEmail" className="cursor-pointer">
            Bestaetigungsmail senden
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="skipAvailability"
            checked={skipAvailabilityCheck}
            onCheckedChange={(checked) => setSkipAvailabilityCheck(checked as boolean)}
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
