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
import { getTranslations } from 'next-intl/server'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function GdprConfirmPage({ params }: PageProps) {
  const { token } = await params
  const t = await getTranslations('gdpr.confirm')

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('invalidLink')}</h1>
          <p className="text-gray-600">
            {t('invalidLinkDesc')}
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('dataDeleted')}</h1>
          <p className="text-gray-600">
            {t('dataDeletedDesc')}
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('linkExpired')}</h1>
          <p className="text-gray-600">
            {t('linkExpiredDesc')}
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('dataDeleted')}</h1>
          <p className="text-gray-600">
            {t('dataDeletedDesc')}
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('customerNotFound')}</h1>
          <p className="text-gray-600">
            {t('customerNotFoundDesc')}
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('confirmTitle')}</h1>
          <p className="text-gray-600">
            {business?.name || 'Business'}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">{t('dataToDelete')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('customerProfile')}</span>
              <span className="font-medium">{customer.name || customer.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('bookings')}</span>
              <span className="font-medium">{bookingCount?.count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('conversations')}</span>
              <span className="font-medium">{conversationCount?.count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('invoices')}</span>
              <span className="font-medium">{invoiceCount?.count || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>&#9888;</strong> {t('warning')}
          </p>
        </div>

        <div className="space-y-3">
          <a
            href={exportUrl}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Download className="h-5 w-5" />
            {t('downloadData')}
          </a>

          <GdprActions token={token} />
        </div>
      </div>
    </div>
  )
}
