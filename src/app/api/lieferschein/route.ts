/**
 * Lieferschein API
 *
 * POST /api/lieferschein - Generate Lieferschein PDF for a booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { generateAndUploadLieferschein } from '@/lib/lieferschein'
import { verifyBookingOwnership } from '@/lib/db/queries'
import { z } from 'zod'

const createLieferscheinSchema = z.object({
  bookingId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const parsed = createLieferscheinSchema.safeParse(body)

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

    // Generate Lieferschein PDF and upload to R2
    const r2Key = await generateAndUploadLieferschein(bookingId, authResult.userId)

    return NextResponse.json({
      success: true,
      r2Key,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate Lieferschein'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
