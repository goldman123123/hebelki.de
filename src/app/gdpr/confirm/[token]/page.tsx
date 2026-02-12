import { db } from '@/lib/db'
import {
  deletionRequests,
  customers,
  businesses,
  bookings,
  chatbotConversations,
  invoices,
} from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { AlertCircle, CheckCircle, Download, Trash2, Clock } from 'lucide-react'
import { GdprActions } from './actions'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function GdprConfirmPage({ params }: PageProps) {
  const { token } = await params

  // Find the deletion request
  const [deletionRequest] = await db
    .select()
    .from(deletionRequests)
    .where(eq(deletionRequests.token, token))
    .limit(1)

  if (!deletionRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ungültiger Link</h1>
          <p className="text-gray-600">
            Dieser Löschlink ist ungültig oder existiert nicht mehr.
          </p>
        </div>
      </div>
    )
  }

  // Already completed
  if (deletionRequest.status === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Daten gelöscht</h1>
          <p className="text-gray-600">
            Ihre Daten wurden bereits erfolgreich gelöscht.
          </p>
        </div>
      </div>
    )
  }

  // Expired
  if (new Date() > deletionRequest.expiresAt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link abgelaufen</h1>
          <p className="text-gray-600">
            Dieser Löschlink ist abgelaufen. Bitte stellen Sie eine neue Löschanfrage.
          </p>
        </div>
      </div>
    )
  }

  // Ensure customerId is still set
  if (!deletionRequest.customerId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Daten gelöscht</h1>
          <p className="text-gray-600">
            Ihre Daten wurden bereits erfolgreich gelöscht.
          </p>
        </div>
      </div>
    )
  }

  // Get business name
  const [business] = await db
    .select({ name: businesses.name })
    .from(businesses)
    .where(eq(businesses.id, deletionRequest.businessId))
    .limit(1)

  // Get customer info
  const [customer] = await db
    .select({ name: customers.name, email: customers.email })
    .from(customers)
    .where(
      and(
        eq(customers.id, deletionRequest.customerId),
        eq(customers.businessId, deletionRequest.businessId)
      )
    )
    .limit(1)

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Kunde nicht gefunden</h1>
          <p className="text-gray-600">
            Die zugehörigen Kundendaten wurden nicht gefunden oder bereits gelöscht.
          </p>
        </div>
      </div>
    )
  }

  // Count what will be deleted
  const [bookingCount] = await db
    .select({ count: count() })
    .from(bookings)
    .where(eq(bookings.customerId, deletionRequest.customerId))

  const [conversationCount] = await db
    .select({ count: count() })
    .from(chatbotConversations)
    .where(eq(chatbotConversations.customerId, deletionRequest.customerId))

  const [invoiceCount] = await db
    .select({ count: count() })
    .from(invoices)
    .where(eq(invoices.customerId, deletionRequest.customerId))

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hebelki.de'
  const exportUrl = `${baseUrl}/api/gdpr/export?token=${token}`

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <Trash2 className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Datenlöschung bestätigen</h1>
          <p className="text-gray-600">
            {business?.name || 'Unternehmen'}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Folgende Daten werden gelöscht:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Kundenprofil</span>
              <span className="font-medium">{customer.name || customer.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Buchungen</span>
              <span className="font-medium">{bookingCount?.count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Gespräche</span>
              <span className="font-medium">{conversationCount?.count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Rechnungen</span>
              <span className="font-medium">{invoiceCount?.count || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Achtung:</strong> Diese Aktion kann nicht rückgängig gemacht werden.
            Wir empfehlen, Ihre Daten vorher herunterzuladen.
          </p>
        </div>

        <div className="space-y-3">
          <a
            href={exportUrl}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Download className="h-5 w-5" />
            Meine Daten herunterladen
          </a>

          <GdprActions token={token} />
        </div>
      </div>
    </div>
  )
}
