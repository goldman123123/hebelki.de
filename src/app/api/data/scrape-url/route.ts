/**
 * API: POST /api/data/scrape-url
 *
 * Creates a URL scraping job for the documents-worker.
 * The worker will scrape the selected URLs and add content to chatbot_knowledge.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ingestionJobs } from '@/lib/db/schema'
import { requireBusinessAccess } from '@/lib/auth-helpers'

interface ScrapeRequest {
  businessId: string
  sourceUrl: string
  selectedUrls: string[]
  purpose: 'chatbot' | 'intern' | 'kunden'
}

// Map purpose to scrape config
const purposeConfig: Record<string, { audience: string; scopeType: string; dataClass: string }> = {
  chatbot: { audience: 'public', scopeType: 'global', dataClass: 'knowledge' },
  intern: { audience: 'internal', scopeType: 'global', dataClass: 'knowledge' },
  kunden: { audience: 'internal', scopeType: 'customer', dataClass: 'knowledge' },
}

export async function POST(request: NextRequest) {
  try {
    const body: ScrapeRequest = await request.json()
    const { businessId, sourceUrl, selectedUrls, purpose } = body

    if (!businessId || !sourceUrl || !selectedUrls || selectedUrls.length === 0) {
      return NextResponse.json(
        { error: 'businessId, sourceUrl, and selectedUrls are required' },
        { status: 400 }
      )
    }

    // Verify business access
    await requireBusinessAccess(businessId)

    // Get purpose config
    const config = purposeConfig[purpose]
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid purpose' },
        { status: 400 }
      )
    }

    // Create ingestion job for the worker
    const [job] = await db.insert(ingestionJobs).values({
      businessId,
      sourceType: 'url',
      sourceUrl,
      discoveredUrls: selectedUrls,
      scrapeConfig: config,
      extractServices: false,
      status: 'queued',
      stage: 'discovering',
      attempts: 0,
      maxAttempts: 3,
    }).returning({ id: ingestionJobs.id })

    console.log(`[Scrape] Created job ${job.id} for ${selectedUrls.length} URLs`)

    return NextResponse.json({
      jobId: job.id,
      status: 'queued',
      urlCount: selectedUrls.length,
    })
  } catch (error) {
    console.error('[Scrape] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create scrape job' },
      { status: 500 }
    )
  }
}
