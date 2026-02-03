import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Users, TrendingUp } from 'lucide-react'
import { getBookingStats, getTodaysBookings } from '@/lib/db/queries'
import { formatTime } from '@/lib/utils'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// For MVP, we'll use a hardcoded business ID or get the first one
async function getFirstBusiness() {
  const results = await db.select().from(businesses).limit(1)
  return results[0] || null
}

export default async function DashboardPage() {
  const business = await getFirstBusiness()

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Welcome to Freiplatz</h1>
        <p className="mt-2 text-gray-600">
          No business configured yet. Run the seed script to get started.
        </p>
        <code className="mt-4 rounded bg-gray-100 px-4 py-2 text-sm">
          npm run db:seed
        </code>
      </div>
    )
  }

  const [stats, todaysBookings] = await Promise.all([
    getBookingStats(business.id),
    getTodaysBookings(business.id),
  ])

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
        <p className="text-gray-600">
          Booking URL:{' '}
          <a
            href={`/book/${business.slug}`}
            className="text-primary hover:underline"
            target="_blank"
          >
            /book/{business.slug}
          </a>
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Today's Bookings
            </CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              This Week
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weekBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending Approval
            </CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Bookings
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
          <CardDescription>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todaysBookings.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No bookings scheduled for today
            </p>
          ) : (
            <div className="space-y-4">
              {todaysBookings.map(({ booking, service, staffMember, customer }) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold">
                        {formatTime(booking.startsAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {service?.durationMinutes || 0} min
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">
                        {customer?.name || 'Unknown Customer'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {service?.name || 'Unknown Service'}
                        {staffMember && ` with ${staffMember.name}`}
                      </div>
                    </div>
                  </div>
                  <Badge className={statusColors[booking.status || 'pending']}>
                    {booking.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
