/**
 * API: POST /api/admin/services/detect-from-documents
 *
 * Detects services from existing documents in the knowledge base.
 * Gets document content and runs AI extraction to find services.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/auth-helpers'
import { extractServicesFromContent } from '@/lib/ai-extractor'
import { db } from '@/lib/db'
import { businesses, documents, documentChunks, chatbotKnowledge } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { deduplicateServices } from '@/lib/ai-extractor/deduplicator'
import { ScrapedPage } from '@/lib/ai-extractor/types'

interface DetectFromDocsRequest {
  businessId: string
  documentIds: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: DetectFromDocsRequest = await request.json()
    const { businessId, documentIds } = body

    if (!businessId || !documentIds || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'businessId and documentIds are required' },
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

    console.log(`[Service Detection from Docs] Starting for business ${businessId}`)
    console.log(`[Service Detection from Docs] Processing ${documentIds.length} documents`)

    // Try to get content from document chunks first
    const chunks = await db
      .select({
        content: documentChunks.content,
        documentId: documentChunks.documentVersionId,
      })
      .from(documentChunks)
      .innerJoin(documents, eq(documents.id, documentChunks.documentVersionId))
      .where(
        and(
          eq(documents.businessId, businessId),
          inArray(documents.id, documentIds)
        )
      )

    // Also try chatbot_knowledge as a fallback/supplement
    const knowledge = await db
      .select({
        content: chatbotKnowledge.content,
        title: chatbotKnowledge.title,
        sourceDocumentId: chatbotKnowledge.sourceDocumentId,
      })
      .from(chatbotKnowledge)
      .where(
        and(
          eq(chatbotKnowledge.businessId, businessId),
          chatbotKnowledge.sourceDocumentId !== null
            ? inArray(chatbotKnowledge.sourceDocumentId, documentIds)
            : undefined
        )
      )

    // Combine content into ScrapedPage format
    const scrapedPages: ScrapedPage[] = []

    // Add chunks as pages
    const chunksByDoc = new Map<string, string[]>()
    for (const chunk of chunks) {
      const docId = chunk.documentId
      if (!chunksByDoc.has(docId)) {
        chunksByDoc.set(docId, [])
      }
      chunksByDoc.get(docId)!.push(chunk.content)
    }

    for (const [docId, contents] of chunksByDoc) {
      scrapedPages.push({
        url: `document://${docId}`,
        markdown: contents.join('\n\n'),
        html: '', // Not needed for text content
        metadata: { title: `Document ${docId}` },
      })
    }

    // Add knowledge entries if no chunks found
    if (scrapedPages.length === 0 && knowledge.length > 0) {
      const knowledgeByDoc = new Map<string, string[]>()
      for (const entry of knowledge) {
        const docId = entry.sourceDocumentId || 'unknown'
        if (!knowledgeByDoc.has(docId)) {
          knowledgeByDoc.set(docId, [])
        }
        const content = entry.title
          ? `## ${entry.title}\n\n${entry.content}`
          : entry.content
        knowledgeByDoc.get(docId)!.push(content)
      }

      for (const [docId, contents] of knowledgeByDoc) {
        scrapedPages.push({
          url: `knowledge://${docId}`,
          markdown: contents.join('\n\n---\n\n'),
          html: '', // Not needed for text content
          metadata: { title: `Knowledge from ${docId}` },
        })
      }
    }

    if (scrapedPages.length === 0) {
      console.log('[Service Detection from Docs] No content found in selected documents')
      return NextResponse.json({
        services: [],
        documentsProcessed: 0,
        message: 'No content found in selected documents',
      })
    }

    console.log(`[Service Detection from Docs] Found ${scrapedPages.length} content pages to process`)

    // Extract services
    const rawServices = await extractServicesFromContent(scrapedPages, businessType)

    // Deduplicate
    const services = deduplicateServices(rawServices)

    console.log(`[Service Detection from Docs] Found ${services.length} unique services`)

    return NextResponse.json({
      services,
      documentsProcessed: documentIds.length,
      pagesScraped: scrapedPages.length,
    })
  } catch (error) {
    console.error('[Service Detection from Docs] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Detection failed' },
      { status: 500 }
    )
  }
}
