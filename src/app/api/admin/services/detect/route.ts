/**
 * API: POST /api/admin/services/detect
 *
 * Detects services from a URL using AI extraction.
 * Returns detected services for review before adding to the system.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/auth-helpers'
import { detectServicesFromUrl } from '@/lib/service-detector'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:admin:services:detect')

interface DetectRequest {
  businessId: string
  url: string
  selectedUrls?: string[] // If provided, only scrape these URLs
}

export async function POST(request: NextRequest) {
  try {
    const body: DetectRequest = await request.json()
    const { businessId, url, selectedUrls } = body

    if (!businessId || !url) {
      return NextResponse.json(
        { error: 'businessId and url are required' },
        { status: 400 }
      )
    }

    // Verify business access
    await requireBusinessAccess(businessId)

    // Get business type
    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, businessId),
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const businessType = business.type || 'general'

    log.info(`Starting for business ${businessId} from ${url}`)

    // Detect services
    const result = await detectServicesFromUrl({
      url,
      businessType,
      businessId,
      maxPages: 10,
      selectedUrls,
    })

    log.info(`Found ${result.services.length} services`)

    return NextResponse.json({
      services: result.services,
      pagesScraped: result.pagesScraped,
      pagesFailed: result.pagesFailed,
      source: result.source,
    })
  } catch (error) {
    log.error('Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Detection failed' },
      { status: 500 }
    )
  }
}
