/**
 * DELETE /api/admin/delete-account
 *
 * Auth-protected endpoint. Permanently deletes a business and all associated data.
 * Only the business owner can perform this action.
 * Requires business name confirmation in request body.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, dbRetry } from '@/lib/db'
import { businesses, businessMembers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:admin:delete-account')

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { confirmName } = body

    if (!confirmName || typeof confirmName !== 'string') {
      return NextResponse.json(
        { error: 'Bestätigungsname ist erforderlich.' },
        { status: 400 }
      )
    }

    // Get business + verify membership and role
    const [member] = await dbRetry(() =>
      db
        .select({
          business: businesses,
          role: businessMembers.role,
        })
        .from(businessMembers)
        .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
        .where(and(
          eq(businessMembers.clerkUserId, userId),
          eq(businessMembers.status, 'active')
        ))
        .limit(1)
    )

    if (!member) {
      return NextResponse.json({ error: 'Kein Unternehmen gefunden.' }, { status: 404 })
    }

    // Only owner can delete
    if (member.role !== 'owner') {
      return NextResponse.json(
        { error: 'Nur der Inhaber kann das Konto löschen.' },
        { status: 403 }
      )
    }

    // Verify name matches
    if (confirmName.trim() !== member.business.name) {
      return NextResponse.json(
        { error: 'Der eingegebene Name stimmt nicht überein.' },
        { status: 400 }
      )
    }

    // Delete business — CASCADE handles all child tables
    await dbRetry(() =>
      db.delete(businesses).where(eq(businesses.id, member.business.id))
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('[DELETE /api/admin/delete-account] Error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Kontos.' },
      { status: 500 }
    )
  }
}
