/**
 * POST /api/bookings/[id]/invoice/cancel
 *
 * Stornieren — creates Stornorechnung and optionally a replacement draft.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { verifyBookingOwnership } from '@/lib/db/queries'
import { getInvoiceByBookingId, cancelInvoiceWithStorno, createReplacementInvoice } from '@/lib/invoices'

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
    const reason = body.reason as string | undefined
    const createReplacement = body.createReplacement as boolean | undefined

    // Cancel and create storno
    const { cancelled, storno } = await cancelInvoiceWithStorno(
      invoice.id,
      authResult.userId,
      reason
    )

    // Optionally create replacement
    let replacement = null
    if (createReplacement) {
      replacement = await createReplacementInvoice(id, cancelled.id, authResult.userId)
    }

    return NextResponse.json({
      success: true,
      cancelled,
      storno,
      replacement,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel invoice'
    console.error('Error cancelling invoice:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
