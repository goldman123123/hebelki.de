/**
 * API: POST /api/onboarding/detect-services
 *
 * Detects services from chatbot_knowledge entries for a business.
 * Used by onboarding wizard after scraping completes.
 *
 * This is a PUBLIC endpoint (listed in middleware) for onboarding flow.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { extractServicesFromContent } from '@/lib/ai-extractor'
import { deduplicateServices } from '@/lib/ai-extractor/deduplicator'
import { db } from '@/lib/db'
import { businesses, chatbotKnowledge, businessMembers } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { ScrapedPage } from '@/lib/ai-extractor/types'

interface DetectServicesRequest {
  businessId: string
}

export async function POST(request: NextRequest) {
  try {
    const body: DetectServicesRequest = await request.json()
    const { businessId } = body

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has access to this business
    const membership = await db.query.businessMembers.findFirst({
      where: and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.clerkUserId, userId)
      )
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to this business' },
        { status: 403 }
      )
    }

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

    console.log(`[Onboarding Detect Services] Starting for business ${businessId}`)

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
      .limit(50)

    console.log(`[Onboarding Detect Services] Found ${knowledge.length} knowledge entries`)

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
      html: '',
      metadata: { title: k.title || '' },
    }))

    console.log(`[Onboarding Detect Services] Processing ${scrapedPages.length} content pages`)

    // Extract services using AI
    const rawServices = await extractServicesFromContent(scrapedPages, businessType)

    console.log(`[Onboarding Detect Services] Extracted ${rawServices.length} raw services`)

    // Deduplicate services
    const services = deduplicateServices(rawServices)

    console.log(`[Onboarding Detect Services] Found ${services.length} unique services after deduplication`)

    return NextResponse.json({
      services,
      knowledgeProcessed: knowledge.length,
    })
  } catch (error) {
    console.error('[Onboarding Detect Services] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Detection failed' },
      { status: 500 }
    )
  }
}
