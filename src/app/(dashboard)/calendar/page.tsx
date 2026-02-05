import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserFirstBusiness } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { bookings, services, staff, customers } from '@/lib/db/schema'
import { eq, gte, lte, and } from 'drizzle-orm'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { MonthlyCalendar } from './components/MonthlyCalendar'

export default async function CalendarPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const memberData = await getUserFirstBusiness()
  if (!memberData?.business) redirect('/onboarding')

  const business = memberData.business

  // Fetch bookings for current month
  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  const monthBookings = await db
    .select({
      booking: {
        id: bookings.id,
        startsAt: bookings.startsAt,
        endsAt: bookings.endsAt,
        status: bookings.status,
        notes: bookings.notes,
      },
      service: {
        name: services.name,
        capacity: services.capacity,
      },
      staff: {
        name: staff.name,
      },
      customer: {
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
      },
    })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(staff, eq(bookings.staffId, staff.id))
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .where(
      and(
        eq(bookings.businessId, business.id),
        gte(bookings.startsAt, monthStart),
        lte(bookings.startsAt, monthEnd)
      )
    )
    .orderBy(bookings.startsAt)

  // Group by day
  const bookingsByDay = monthBookings.reduce((acc, row) => {
    const day = format(row.booking.startsAt, 'yyyy-MM-dd')
    if (!acc[day]) acc[day] = []
    acc[day].push(row)
    return acc
  }, {} as Record<string, typeof monthBookings>)

  // Calculate stats
  const stats = {
    total: monthBookings.length,
    pending: monthBookings.filter(b => b.booking.status === 'pending').length,
    confirmed: monthBookings.filter(b => b.booking.status === 'confirmed').length,
    completed: monthBookings.filter(b => b.booking.status === 'completed').length,
    cancelled: monthBookings.filter(b => b.booking.status === 'cancelled').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-gray-600 mt-1">View and manage your bookings for {format(today, 'MMMM yyyy')}</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Confirmed</p>
          <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Cancelled</p>
          <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
        </div>
      </div>

      <MonthlyCalendar
        bookingsByDay={bookingsByDay}
        businessId={business.id}
        timezone={business.timezone || 'Europe/Berlin'}
      />
    </div>
  )
}
