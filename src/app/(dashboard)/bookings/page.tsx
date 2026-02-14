'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { BookingFilters } from '@/components/dashboard/BookingFilters'
import { BookingActions } from '@/components/dashboard/BookingActions'
import { CreateBookingDialog } from '@/components/dashboard/CreateBookingDialog'
import { BookingCard } from './components/BookingCard'
import { formatDate, formatTime, formatCurrency } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Search } from 'lucide-react'

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
  const t = useTranslations('dashboard.bookings')
  const [filter, setFilter] = useState('all')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [timezone, setTimezone] = useState('Europe/Berlin')
  const [slug, setSlug] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const isMobile = useIsMobile()

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch business settings to get timezone
      const settingsRes = await fetch('/api/admin/settings')
      const settingsData = await settingsRes.json()
      if (settingsData.business?.timezone) {
        setTimezone(settingsData.business.timezone)
      }
      if (settingsData.business?.slug) {
        setSlug(settingsData.business.slug)
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

  const filteredBookings = search.trim()
    ? bookings.filter((b) => {
        const q = search.toLowerCase()
        return (
          b.customer?.name?.toLowerCase().includes(q) ||
          b.customer?.email?.toLowerCase().includes(q) ||
          b.service?.name?.toLowerCase().includes(q) ||
          b.staffMember?.name?.toLowerCase().includes(q)
        )
      })
    : bookings

  return (
    <div>
      <div className="mb-6 md:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
          {slug && (
            <p className="text-sm text-gray-500">
              {t('bookingUrl')}:{' '}
              <a
                href={`/book/${slug}`}
                className="text-primary hover:underline"
                target="_blank"
              >
                /book/{slug}
              </a>
            </p>
          )}
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t('newBooking')}
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <BookingFilters
          activeFilter={filter}
          onFilterChange={setFilter}
          counts={counts}
        />
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('filteredTitle', { filter })}
          </CardTitle>
          <CardDescription>
            {t('bookingsFound', { count: filteredBookings.length })}
            {search.trim() && filteredBookings.length !== bookings.length && (
              <span className="text-gray-400"> ({t('ofTotal', { total: bookings.length })})</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              {t('noBookings')}
            </p>
          ) : isMobile ? (
            /* Mobile: Card list */
            <div className="space-y-3">
              {filteredBookings.map((b) => (
                <BookingCard
                  key={b.booking.id}
                  booking={b}
                  timezone={timezone}
                  onStatusChange={fetchBookings}
                />
              ))}
            </div>
          ) : (
            /* Desktop: Table */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.dateTime')}</TableHead>
                  <TableHead>{t('table.customer')}</TableHead>
                  <TableHead>{t('table.service')}</TableHead>
                  <TableHead>{t('table.staff')}</TableHead>
                  <TableHead>{t('table.price')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead className="text-right">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map(({ booking, service, staffMember, customer }) => (
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
                        {customer?.name || t('unknown')}
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

      <CreateBookingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchBookings}
      />
    </div>
  )
}
