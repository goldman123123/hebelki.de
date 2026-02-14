/**
 * Get Current User's Businesses
 *
 * GET /api/businesses/my
 * Returns all businesses the authenticated user has access to
 */

import { NextResponse } from 'next/server'
import { getUserBusinesses } from '@/lib/auth-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:businesses:my')

export async function GET() {
  try {
    const businesses = await getUserBusinesses()

    return NextResponse.json({
      success: true,
      businesses,
      count: businesses.length,
    })
  } catch (error) {
    log.error('Get user businesses error:', error)

    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('Unauthorized') ? 401 : 500

    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}
