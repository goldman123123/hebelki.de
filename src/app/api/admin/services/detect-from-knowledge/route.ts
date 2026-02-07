/**
 * API: POST /api/admin/services/detect-from-knowledge
 *
 * Detects services from chatbot_knowledge entries for a business.
 * Used by onboarding wizard after scraping completes - extracts services
 * from content that was already scraped and stored in chatbot_knowledge.
 *
 * Unlike detect-from-documents which requires documentIds, this queries
 * by businessId + source='website' to find scraped content.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/auth-helpers'
import { extractServicesFromContent } from '@/lib/ai-extractor'
import { deduplicateServices } from '@/lib/ai-extractor/deduplicator'
import { db } from '@/lib/db'
import { businesses, chatbotKnowledge } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { ScrapedPage } from '@/lib/ai-extractor/types'

interface DetectFromKnowledgeRequest {
  businessId: string
}

export async function POST(request: NextRequest) {
  try {
    const body: DetectFromKnowledgeRequest = await request.json()
    const { businessId } = body

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
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

    console.log(`[Service Detection from Knowledge] Starting for business ${businessId}`)

    // Query recent knowledge entries from website scraping
    const knowledge = await db
      .select({
        content: chatbotKnowledge.content,
        title: chatbotKnowledge.title,
      })
      .from(chatbotKnowledge)
      .where(
        and(
          eq(chatbotKnowledge.businessId, businessId),
          eq(chatbotKnowledge.source, 'website')
        )
      )
      .orderBy(desc(chatbotKnowledge.createdAt))
      .limit(50) // Limit to most recent entries to avoid processing too much

    console.log(`[Service Detection from Knowledge] Found ${knowledge.length} knowledge entries`)

    if (knowledge.length === 0) {
      return NextResponse.json({
        services: [],
        knowledgeProcessed: 0,
        message: 'No knowledge entries found from website scraping',
      })
    }

    // Convert to ScrapedPage format for extraction
    const scrapedPages: ScrapedPage[] = knowledge.map((k, i) => ({
      url: `knowledge://${i}`,
      markdown: k.title ? `## ${k.title}\n\n${k.content}` : k.content,
      html: '', // Not needed for text content
      metadata: { title: k.title || '' },
    }))

    console.log(`[Service Detection from Knowledge] Processing ${scrapedPages.length} content pages`)

    // Extract services using AI
    const rawServices = await extractServicesFromContent(scrapedPages, businessType)

    console.log(`[Service Detection from Knowledge] Extracted ${rawServices.length} raw services`)

    // Deduplicate services
    const services = deduplicateServices(rawServices)

    console.log(`[Service Detection from Knowledge] Found ${services.length} unique services after deduplication`)

    return NextResponse.json({
      services,
      knowledgeProcessed: knowledge.length,
    })
  } catch (error) {
    console.error('[Service Detection from Knowledge] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Detection failed' },
      { status: 500 }
    )
  }
}
