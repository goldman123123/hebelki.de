/**
 * Booking Invoice API
 *
 * GET  /api/bookings/[id]/invoice - Get invoice for a booking
 * PATCH /api/bookings/[id]/invoice - Recreate invoice with updated items from booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { getInvoiceByBookingId, updateInvoiceFromBooking, generateAndUploadInvoicePdf } from '@/lib/invoices'
import { verifyBookingOwnership } from '@/lib/db/queries'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:bookings:id:invoice')

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
    log.error('Error getting booking invoice:', error)
    return NextResponse.json({ error: 'Failed to get invoice' }, { status: 500 })
  }
}

export async function PATCH(
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

    // Get existing invoice for this booking
    const existing = await getInvoiceByBookingId(id)
    if (!existing) {
      return NextResponse.json({ error: 'No invoice found for this booking' }, { status: 404 })
    }

    // Guard: only draft invoices can be regenerated
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { error: `Rechnung ${existing.invoiceNumber} kann nicht bearbeitet werden (Status: ${existing.status}).` },
        { status: 409 }
      )
    }

    // Update invoice with current booking items
    const updated = await updateInvoiceFromBooking(existing.id)

    // Regenerate PDF
    const r2Key = await generateAndUploadInvoicePdf(existing.id)

    return NextResponse.json({
      success: true,
      invoice: {
        ...updated,
        pdfR2Key: r2Key,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to recreate invoice'
    log.error('Error recreating invoice:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
