/**
 * POST /api/bookings/[id]/invoice/send
 *
 * Send invoice to customer — sets status to 'sent' and triggers email.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { verifyBookingOwnership } from '@/lib/db/queries'
import { getInvoiceByBookingId, sendInvoice } from '@/lib/invoices'
import { emitEventStandalone } from '@/modules/core/events'

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

    const updated = await sendInvoice(invoice.id, authResult.userId)

    // Emit event for email delivery
    await emitEventStandalone(authResult.business.id, 'invoice.sent', {
      invoiceId: updated.id,
      invoiceNumber: updated.invoiceNumber,
      businessId: authResult.business.id,
      businessName: authResult.business.name,
      pdfR2Key: updated.pdfR2Key || '',
      total: updated.total,
    })

    return NextResponse.json({ success: true, invoice: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send invoice'
    console.error('Error sending invoice:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
