/**
 * POST /api/gdpr/confirm
 *
 * Public endpoint. Takes { token }.
 * Validates token, executes deletion: deletes customer (CASCADE handles related data),
 * marks request as completed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { customers, deletionRequests } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:gdpr:confirm')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token ist erforderlich' },
        { status: 400 }
      )
    }

    // Find the deletion request
    const [deletionRequest] = await db
      .select()
      .from(deletionRequests)
      .where(eq(deletionRequests.token, token))
      .limit(1)

    if (!deletionRequest) {
      return NextResponse.json(
        { error: 'Ungültiger oder abgelaufener Link' },
        { status: 404 }
      )
    }

    // Check if already completed
    if (deletionRequest.status === 'completed') {
      return NextResponse.json(
        { error: 'Ihre Daten wurden bereits gelöscht' },
        { status: 410 }
      )
    }

    // Check if expired
    if (new Date() > deletionRequest.expiresAt) {
      await db
        .update(deletionRequests)
        .set({ status: 'expired' })
        .where(eq(deletionRequests.id, deletionRequest.id))

      return NextResponse.json(
        { error: 'Dieser Link ist abgelaufen. Bitte stellen Sie eine neue Löschanfrage.' },
        { status: 410 }
      )
    }

    // Ensure customerId is still set (not yet deleted)
    if (!deletionRequest.customerId) {
      return NextResponse.json(
        { error: 'Kundendaten wurden bereits gelöscht' },
        { status: 410 }
      )
    }

    // Delete the customer (CASCADE handles bookings, conversations, invoices, etc.)
    await db
      .delete(customers)
      .where(
        and(
          eq(customers.id, deletionRequest.customerId),
          eq(customers.businessId, deletionRequest.businessId)
        )
      )

    // Mark deletion request as completed
    await db
      .update(deletionRequests)
      .set({
        status: 'completed',
        confirmedAt: new Date(),
        completedAt: new Date(),
      })
      .where(eq(deletionRequests.id, deletionRequest.id))

    return NextResponse.json({
      success: true,
      message: 'Ihre Daten wurden erfolgreich gelöscht.',
    })
  } catch (error) {
    log.error('[POST /api/gdpr/confirm] Error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' },
      { status: 500 }
    )
  }
}
