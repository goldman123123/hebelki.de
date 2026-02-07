/**
 * Invoice API
 *
 * POST /api/invoices - Create invoice for a booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { createInvoiceForBooking, generateAndUploadInvoicePdf } from '@/lib/invoices'
import { verifyBookingOwnership } from '@/lib/db/queries'
import { z } from 'zod'

const createInvoiceSchema = z.object({
  bookingId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const parsed = createInvoiceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { bookingId } = parsed.data

    // Verify booking belongs to this business
    const isOwner = await verifyBookingOwnership(bookingId, authResult.business.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Create invoice
    const invoice = await createInvoiceForBooking(bookingId)

    // Generate PDF and upload to R2
    const r2Key = await generateAndUploadInvoicePdf(invoice.id)

    return NextResponse.json({
      success: true,
      invoice: {
        ...invoice,
        pdfR2Key: r2Key,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create invoice'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
