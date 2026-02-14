/**
 * Chatbot Knowledge Base API
 *
 * GET: List knowledge entries for a business
 * POST: Create a new knowledge entry
 *
 * Split Brain Prevention (2026-02):
 * - Full embedding metadata (provider, model, dim, preprocessVersion, contentHash)
 * - Consistent header pattern for embedding text
 * - NFKC normalization via embeddings module
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatbotKnowledge } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { requireBusinessAccess } from '@/lib/auth-helpers'
import { generateEmbeddingWithMetadata, normalizeText } from '@/lib/embeddings'
import { KnowledgeEntrySchema } from '@/lib/schemas/chatbot'
import { ZodError } from 'zod'
import {
  parseError,
  ValidationError,
  DatabaseError,
  ExternalAPIError,
  withRetry,
} from '@/lib/errors/error-handler'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:chatbot:knowledge')

/**
 * GET /api/chatbot/knowledge?businessId=xxx
 *
 * List all knowledge entries for a business
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      throw new ValidationError('businessId is required')
    }

    // Verify user has access to this business
    await requireBusinessAccess(businessId)

    // Fetch knowledge entries with retry on database errors
    const entries = await withRetry(
      async () => {
        return db
          .select({
            id: chatbotKnowledge.id,
            title: chatbotKnowledge.title,
            content: chatbotKnowledge.content,
            category: chatbotKnowledge.category,
            source: chatbotKnowledge.source,
            isActive: chatbotKnowledge.isActive,
            createdAt: chatbotKnowledge.createdAt,
            updatedAt: chatbotKnowledge.updatedAt,
          })
          .from(chatbotKnowledge)
          .where(eq(chatbotKnowledge.businessId, businessId))
          .orderBy(desc(chatbotKnowledge.updatedAt))
      },
      {
        maxRetries: 2,
        initialDelay: 500,
        shouldRetry: (error) => {
          // Retry on database connection errors
          return error.code === 'DATABASE_ERROR' || error.statusCode >= 500
        },
      }
    )

    return NextResponse.json({
      success: true,
      entries,
      count: entries.length,
    })
  } catch (error) {
    const appError = parseError(error)
    log.error('', appError.code, appError.message, appError.details)

    return NextResponse.json(
      {
        success: false,
        error: appError.message,
        code: appError.code,
      },
      { status: appError.statusCode }
    )
  }
}

/**
 * POST /api/chatbot/knowledge
 *
 * Create a new knowledge entry with embedding generation
 * Stores full embedding metadata for split brain prevention
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input with Zod
    const validated = KnowledgeEntrySchema.parse(body)

    // Verify user has access to this business
    await requireBusinessAccess(validated.businessId)

    // Consistent header pattern: {Title}\n\n{Content}
    // This matches document chunk format for consistent embedding space
    const embeddingText = `${validated.title}\n\n${validated.content}`
    log.info(`Generating embedding for: "${validated.title}"`)

    // Generate embedding with full metadata for provenance tracking
    const embeddingResult = await withRetry(
      async () => {
        try {
          return await generateEmbeddingWithMetadata(embeddingText)
        } catch (error) {
          // Wrap embedding errors in ExternalAPIError for proper retry logic
          throw new ExternalAPIError(
            'OpenRouter',
            error instanceof Error ? error.message : 'Embedding generation failed',
            503
          )
        }
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        onRetry: (error, attempt) => {
          log.info(`Retrying embedding generation (attempt ${attempt})`)
        },
      }
    )

    // Create knowledge entry with full embedding metadata
    const entry = await withRetry(
      async () => {
        try {
          const rows = await db
            .insert(chatbotKnowledge)
            .values({
              businessId: validated.businessId,
              title: validated.title,
              content: validated.content,
              category: validated.category || null,
              source: validated.source,
              // Embedding vector
              embedding: embeddingResult.embedding,
              // Full embedding provenance (split brain prevention)
              embeddingProvider: embeddingResult.provider,
              embeddingModel: embeddingResult.model,
              embeddingDim: embeddingResult.dim,
              preprocessVersion: embeddingResult.preprocessVersion,
              contentHash: embeddingResult.contentHash,
              embeddedAt: new Date(),
              // Authority level (default normal, can be set by admin)
              authorityLevel: 'normal',
              // Legacy metadata field
              metadata: validated.confidence
                ? { confidence: validated.confidence }
                : {},
              isActive: true,
            })
            .returning()

          if (!rows || rows.length === 0) {
            throw new DatabaseError('Failed to create entry - no rows returned')
          }

          return rows[0]
        } catch (error) {
          throw new DatabaseError(
            error instanceof Error ? error.message : 'Database insert failed'
          )
        }
      },
      {
        maxRetries: 2,
        initialDelay: 500,
      }
    )

    log.info(`✅ Created entry ${entry.id}`, {
      model: embeddingResult.model,
      preprocessVersion: embeddingResult.preprocessVersion,
      contentHash: embeddingResult.contentHash.substring(0, 16) + '...',
    })

    return NextResponse.json({
      success: true,
      entry,
    })
  } catch (error) {
    // Handle validation errors specially
    if (error instanceof ZodError) {
      log.error('Validation error:', error.issues)
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    const appError = parseError(error)
    log.error('', appError.code, appError.message, appError.details)

    return NextResponse.json(
      {
        success: false,
        error: appError.message,
        code: appError.code,
        details: appError.details,
      },
      { status: appError.statusCode }
    )
  }
}
