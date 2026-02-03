import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { getBookingsByStatus } from '@/lib/db/queries'

export async function GET(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'

  const bookings = await getBookingsByStatus(authResult.business.id, status)

  return NextResponse.json({ bookings })
}
