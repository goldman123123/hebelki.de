/**
 * GET /api/admin/gdpr/requests
 *
 * Protected endpoint. Returns deletion requests for the authenticated business.
 * Joins with customers table for names.
 */

import { NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { deletionRequests, customers } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:admin:gdpr:requests')

export async function GET() {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const results = await db
      .select({
        id: deletionRequests.id,
        customerEmail: deletionRequests.customerEmail,
        customerName: customers.name,
        status: deletionRequests.status,
        requestedAt: deletionRequests.requestedAt,
        confirmedAt: deletionRequests.confirmedAt,
        completedAt: deletionRequests.completedAt,
        expiresAt: deletionRequests.expiresAt,
      })
      .from(deletionRequests)
      .leftJoin(customers, eq(deletionRequests.customerId, customers.id))
      .where(eq(deletionRequests.businessId, authResult.business.id))
      .orderBy(desc(deletionRequests.requestedAt))

    return NextResponse.json({ requests: results })
  } catch (error) {
    log.error('[GET /api/admin/gdpr/requests] Error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Löschanfragen' },
      { status: 500 }
    )
  }
}
