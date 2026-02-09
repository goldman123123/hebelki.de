/**
 * GET /api/bookings/[id]/invoices
 *
 * Get ALL invoices for a booking (including cancelled and stornos) for history UI.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { verifyBookingOwnership } from '@/lib/db/queries'
import { getAllInvoicesForBooking } from '@/lib/invoices'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireBusinessAuth()
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { id } = await params

    const isOwner = await verifyBookingOwnership(id, authResult.business.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const allInvoices = await getAllInvoicesForBooking(id)

    return NextResponse.json({ invoices: allInvoices })
  } catch (error) {
    console.error('Error getting invoices history:', error)
    return NextResponse.json({ error: 'Failed to get invoices' }, { status: 500 })
  }
}
