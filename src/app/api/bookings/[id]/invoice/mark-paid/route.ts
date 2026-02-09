/**
 * POST /api/bookings/[id]/invoice/mark-paid
 *
 * Mark invoice as paid.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { verifyBookingOwnership } from '@/lib/db/queries'
import { getInvoiceByBookingId, markInvoicePaid } from '@/lib/invoices'

export async function POST(
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

    const invoice = await getInvoiceByBookingId(id)
    if (!invoice) {
      return NextResponse.json({ error: 'No invoice found for this booking' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))

    const updated = await markInvoicePaid(invoice.id, authResult.userId, {
      paymentMethod: body.paymentMethod,
      paymentReference: body.paymentReference,
    })

    return NextResponse.json({ success: true, invoice: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark invoice as paid'
    console.error('Error marking invoice as paid:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
