import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Users, TrendingUp } from 'lucide-react'
import { getBookingStats, getTodaysBookings } from '@/lib/db/queries'
import { getBusinessForUser } from '@/lib/auth'
import { formatTime, formatDate } from '@/lib/utils'

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const business = await getBusinessForUser(userId)

  if (!business) {
    redirect('/onboarding')
  }

  const [stats, todaysBookings] = await Promise.all([
    getBookingStats(business.id),
    getTodaysBookings(business.id),
  ])

  const timezone = business.timezone || 'Europe/Berlin'

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
  }

  const statusLabels: Record<string, string> = {
    pending: 'Ausstehend',
    confirmed: 'Bestätigt',
    cancelled: 'Storniert',
    completed: 'Abgeschlossen',
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
        <p className="text-gray-600">
          Buchungs-URL:{' '}
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
              Heutige Buchungen
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
              Diese Woche
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
              Ausstehende Genehmigung
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
              Buchungen gesamt
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
          <CardTitle>Heutiger Terminplan</CardTitle>
          <CardDescription>
            {formatDate(new Date(), timezone)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todaysBookings.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              Keine Termine für heute geplant
            </p>
          ) : (
            <div className="space-y-4">
              {todaysBookings.map(({ booking, service, staffMember, customer }) => (
                <div
                  key={booking.id}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center shrink-0">
                      <div className="text-lg font-semibold">
                        {formatTime(booking.startsAt, timezone)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {service?.durationMinutes || 0} min
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {customer?.name || 'Unbekannter Kunde'}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {service?.name || 'Unbekannte Dienstleistung'}
                        {staffMember && ` mit ${staffMember.name}`}
                      </div>
                    </div>
                  </div>
                  <Badge className={`shrink-0 ${statusColors[booking.status || 'pending']}`}>
                    {statusLabels[booking.status || 'pending'] || booking.status}
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
