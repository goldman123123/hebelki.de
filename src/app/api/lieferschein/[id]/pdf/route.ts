/**
 * Lieferschein PDF Download API
 *
 * GET /api/lieferschein/[id]/pdf - Download Lieferschein PDF
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { verifyBookingOwnership, getBookingById } from '@/lib/db/queries'
import { generateAndUploadLieferschein } from '@/lib/lieferschein'
import { getDownloadUrl } from '@/lib/r2/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:lieferschein:id:pdf')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id: bookingId } = await params

  try {
    // Verify booking belongs to this business
    const isOwner = await verifyBookingOwnership(bookingId, authResult.business.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const bookingData = await getBookingById(bookingId)
    if (!bookingData) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    let r2Key = (bookingData.booking as Record<string, unknown>).lieferscheinR2Key as string | null

    // If PDF doesn't exist, generate it
    if (!r2Key) {
      r2Key = await generateAndUploadLieferschein(bookingId)
    }

    // Generate presigned download URL (valid for 1 hour)
    const downloadUrl = await getDownloadUrl(r2Key, 3600)

    // Redirect to the presigned URL
    return NextResponse.redirect(downloadUrl)
  } catch (error) {
    log.error('Error getting Lieferschein PDF:', error)
    const message = error instanceof Error ? error.message : 'Failed to get Lieferschein PDF'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
