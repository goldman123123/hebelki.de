'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { BookingFilters } from '@/components/dashboard/BookingFilters'
import { BookingActions } from '@/components/dashboard/BookingActions'
import { formatDate, formatTime, formatCurrency } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface Booking {
  booking: {
    id: string
    startsAt: string
    price: string | null
    status: string | null
    notes: string | null
  }
  service: { name: string } | null
  staffMember: { name: string } | null
  customer: { name: string | null; email: string } | null
}

export default function BookingsPage() {
  const [filter, setFilter] = useState('all')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [timezone, setTimezone] = useState('Europe/Berlin')

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch business settings to get timezone
      const settingsRes = await fetch('/api/admin/settings')
      const settingsData = await settingsRes.json()
      if (settingsData.business?.timezone) {
        setTimezone(settingsData.business.timezone)
      }

      const res = await fetch(`/api/admin/bookings?status=${filter}`)
      const data = await res.json()
      setBookings(data.bookings || [])

      // Calculate counts
      const allRes = await fetch('/api/admin/bookings?status=all')
      const allData = await allRes.json()
      const allBookings = allData.bookings || []

      const newCounts: Record<string, number> = { all: allBookings.length }
      allBookings.forEach((b: Booking) => {
        const status = b.booking.status || 'pending'
        newCounts[status] = (newCounts[status] || 0) + 1
      })
      setCounts(newCounts)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-600">Manage all your appointments</p>
      </div>

      <div className="mb-6">
        <BookingFilters
          activeFilter={filter}
          onFilterChange={setFilter}
          counts={counts}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {filter === 'all' ? 'All Bookings' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Bookings`}
          </CardTitle>
          <CardDescription>
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No bookings found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map(({ booking, service, staffMember, customer }) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="font-medium">
                        {formatDate(booking.startsAt, timezone)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatTime(booking.startsAt, timezone)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {customer?.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {customer?.email || '—'}
                      </div>
                    </TableCell>
                    <TableCell>{service?.name || '—'}</TableCell>
                    <TableCell>{staffMember?.name || '—'}</TableCell>
                    <TableCell>
                      {booking.price
                        ? formatCurrency(booking.price, 'EUR')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status || 'pending'} />
                    </TableCell>
                    <TableCell className="text-right">
                      <BookingActions
                        bookingId={booking.id}
                        status={booking.status || 'pending'}
                        onStatusChange={fetchBookings}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
