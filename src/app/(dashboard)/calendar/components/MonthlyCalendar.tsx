'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, User, Mail, Phone, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboard:calendar:MonthlyCalendar')

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
    capacity: number | null
  } | null
  staff: {
    name: string
  } | null
  customer: {
    name: string | null
    email: string | null
    phone: string | null
  } | null
}

interface MonthlyCalendarProps {
  bookingsByDay: Record<string, Booking[]>
  businessId: string
  timezone: string
  year: number
  month: number
  staffId?: string
  staffList: Array<{ id: string; name: string }>
}

export function MonthlyCalendar({ bookingsByDay, businessId, timezone, year, month, staffId, staffList }: MonthlyCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleMonthChange = (newMonth: Date) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', String(newMonth.getFullYear()))
    params.set('month', String(newMonth.getMonth() + 1))
    router.push(`/calendar?${params.toString()}`)
  }

  const handleStaffChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('staffId')
    } else {
      params.set('staffId', value)
    }
    router.push(`/calendar?${params.toString()}`)
  }

  const getBookingCount = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd')
    return bookingsByDay[key]?.length || 0
  }

  const getDayStatus = (date: Date) => {
    const count = getBookingCount(date)
    if (count === 0) return 'available'
    if (count <= 3) return 'light'
    if (count <= 6) return 'medium'
    return 'busy'
  }

  const handleDayClick = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
    }
  }

  const selectedBookings = selectedDate
    ? bookingsByDay[format(selectedDate, 'yyyy-MM-dd')] || []
    : []

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'no_show':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />
      case 'pending':
        return <AlertCircle className="h-4 w-4" />
      case 'cancelled':
      case 'no_show':
        return <XCircle className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    setUpdatingBookingId(bookingId)
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        window.location.reload() // Refresh to show updated data
      } else {
        alert('Failed to update booking status')
      }
    } catch (error) {
      log.error('Error updating booking:', error)
      alert('Error updating booking status')
    } finally {
      setUpdatingBookingId(null)
    }
  }

  // Group bookings by service and time for capacity display
  const groupedBookings = selectedBookings.reduce((acc, booking) => {
    const timeKey = formatTime(booking.booking.startsAt, timezone)
    const serviceKey = booking.service?.name || 'Unknown Service'
    const key = `${timeKey}-${serviceKey}`

    if (!acc[key]) {
      acc[key] = {
        time: timeKey,
        service: booking.service,
        bookings: []
      }
    }
    acc[key].bookings.push(booking)
    return acc
  }, {} as Record<string, { time: string; service: Booking['service']; bookings: Booking[] }>)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Section */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Select Date</CardTitle>
              {staffList.length > 0 && (
                <Select value={staffId || 'all'} onValueChange={handleStaffChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Alle Mitarbeiter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                    {staffList.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg border">
              <span className="text-sm font-medium text-gray-700">Legend:</span>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-gray-100 rounded"></div>
                <span className="text-gray-600">No bookings</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-blue-100 rounded"></div>
                <span className="text-gray-600">1-3 bookings</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-yellow-100 rounded"></div>
                <span className="text-gray-600">4-6 bookings</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-red-100 rounded"></div>
                <span className="text-gray-600">7+ bookings</span>
              </div>
            </div>

            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDayClick}
              defaultMonth={new Date(year, month - 1)}
              onMonthChange={handleMonthChange}
              className="rounded-md border"
              modifiers={{
                light: (date) => getDayStatus(date) === 'light',
                medium: (date) => getDayStatus(date) === 'medium',
                busy: (date) => getDayStatus(date) === 'busy'
              }}
              modifiersClassNames={{
                light: 'bg-blue-100 text-blue-900',
                medium: 'bg-yellow-100 text-yellow-900',
                busy: 'bg-red-100 text-red-900'
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Bookings Detail Section */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
                </CardTitle>
                {selectedDate && (
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Select a date to view bookings</p>
              </div>
            ) : selectedBookings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No bookings for this date</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedBookings)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, group]) => (
                    <div key={key} className="border rounded-lg p-4 bg-gray-50">
                      {/* Time Slot Header */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-gray-600" />
                          <div>
                            <h3 className="font-semibold text-lg">{group.time}</h3>
                            <p className="text-sm text-gray-600">{group.service?.name || 'Unknown Service'}</p>
                          </div>
                        </div>
                        {group.service?.capacity && group.service.capacity > 1 && (
                          <Badge variant="secondary" className="text-sm">
                            {group.bookings.length}/{group.service.capacity} spots filled
                          </Badge>
                        )}
                      </div>

                      {/* Individual Bookings */}
                      <div className="space-y-3">
                        {group.bookings.map((row) => (
                          <div
                            key={row.booking.id}
                            className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-4">
                              {/* Customer Info */}
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <span className="font-semibold text-gray-900">
                                    {row.customer?.name || 'Unknown Customer'}
                                  </span>
                                  <Badge className={cn('text-xs', getStatusColor(row.booking.status))}>
                                    <span className="flex items-center gap-1">
                                      {getStatusIcon(row.booking.status)}
                                      {row.booking.status || 'pending'}
                                    </span>
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mail className="h-4 w-4" />
                                  <span>{row.customer?.email}</span>
                                </div>

                                {row.customer?.phone && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="h-4 w-4" />
                                    <span>{row.customer.phone}</span>
                                  </div>
                                )}

                                {row.staff && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Staff:</span> {row.staff.name}
                                  </p>
                                )}

                                {row.booking.notes && (
                                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700 italic">
                                    <span className="font-medium not-italic">Note:</span> {row.booking.notes}
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-col gap-2">
                                {row.booking.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleStatusUpdate(row.booking.id, 'confirmed')}
                                      disabled={updatingBookingId === row.booking.id}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      {updatingBookingId === row.booking.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4" />
                                      )}
                                      <span className="ml-1">Accept</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStatusUpdate(row.booking.id, 'cancelled')}
                                      disabled={updatingBookingId === row.booking.id}
                                      className="border-red-200 text-red-600 hover:bg-red-50"
                                    >
                                      <XCircle className="h-4 w-4" />
                                      <span className="ml-1">Decline</span>
                                    </Button>
                                  </>
                                )}
                                {row.booking.status === 'confirmed' && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleStatusUpdate(row.booking.id, 'completed')}
                                      disabled={updatingBookingId === row.booking.id}
                                      className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                      {updatingBookingId === row.booking.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4" />
                                      )}
                                      <span className="ml-1">Complete</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStatusUpdate(row.booking.id, 'cancelled')}
                                      disabled={updatingBookingId === row.booking.id}
                                    >
                                      <XCircle className="h-4 w-4" />
                                      <span className="ml-1">Cancel</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStatusUpdate(row.booking.id, 'no_show')}
                                      disabled={updatingBookingId === row.booking.id}
                                    >
                                      <AlertCircle className="h-4 w-4" />
                                      <span className="ml-1">No Show</span>
                                    </Button>
                                  </>
                                )}
                                {(row.booking.status === 'completed' || row.booking.status === 'cancelled' || row.booking.status === 'no_show') && (
                                  <Badge variant="secondary" className="justify-center">
                                    {row.booking.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
