import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserFirstBusiness } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { bookings, services, staff, customers } from '@/lib/db/schema'
import { eq, gte, lte, and } from 'drizzle-orm'
import { endOfMonth, format } from 'date-fns'
import { MonthlyCalendar } from './components/MonthlyCalendar'
import { getStaffByBusiness } from '@/lib/db/queries'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; staffId?: string }>
}) {
  const params = await searchParams
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const memberData = await getUserFirstBusiness()
  if (!memberData?.business) redirect('/onboarding')

  const business = memberData.business

  // Use search params or default to current month
  const now = new Date()
  const year = params.year ? parseInt(params.year) : now.getFullYear()
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1
  const staffId = params.staffId || undefined

  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = endOfMonth(monthStart)

  // Fetch staff list for dropdown
  const staffList = await getStaffByBusiness(business.id)

  // Build query conditions
  const conditions = [
    eq(bookings.businessId, business.id),
    gte(bookings.startsAt, monthStart),
    lte(bookings.startsAt, monthEnd),
  ]
  if (staffId) {
    conditions.push(eq(bookings.staffId, staffId))
  }

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
    .where(and(...conditions))
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
          <p className="text-gray-600 mt-1">Buchungen für {format(monthStart, 'MMMM yyyy')} verwalten</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Gesamt</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Ausstehend</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Bestätigt</p>
          <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Abgeschlossen</p>
          <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Storniert</p>
          <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
        </div>
      </div>

      <MonthlyCalendar
        bookingsByDay={bookingsByDay}
        businessId={business.id}
        timezone={business.timezone || 'Europe/Berlin'}
        year={year}
        month={month}
        staffId={staffId}
        staffList={staffList.map(s => ({ id: s.id, name: s.name }))}
      />
    </div>
  )
}
