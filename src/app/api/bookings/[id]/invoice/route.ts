/**
 * Booking Invoice API
 *
 * GET /api/bookings/[id]/invoice - Get invoice for a booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { getInvoiceByBookingId } from '@/lib/invoices'
import { verifyBookingOwnership } from '@/lib/db/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params

  try {
    // Verify booking belongs to this business
    const isOwner = await verifyBookingOwnership(id, authResult.business.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Get invoice for this booking
    const invoice = await getInvoiceByBookingId(id)

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Error getting booking invoice:', error)
    return NextResponse.json({ error: 'Failed to get invoice' }, { status: 500 })
  }
}
