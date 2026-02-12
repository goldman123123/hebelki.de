/**
 * Staff Online Status API
 *
 * GET /api/chatbot/support/status
 *
 * Returns the number of staff currently online (based on heartbeat).
 * Auth-protected: requires business membership.
 */

import { NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { getOnlineStaffCount } from '@/lib/staff-online'

export async function GET() {
  try {
    const authResult = await requireBusinessAuth()
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { business } = authResult
    const staffOnline = await getOnlineStaffCount(business.id)

    return NextResponse.json({
      success: true,
      staffOnline,
      isAnyOnline: staffOnline > 0,
    })
  } catch (error) {
    console.error('[Support Status API] Error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden des Status' },
      { status: 500 }
    )
  }
}
