/**
 * Chatbot Knowledge Base API
 *
 * GET: List knowledge entries for a business
 * POST: Create a new knowledge entry
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatbotKnowledge } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { requireBusinessAccess } from '@/lib/auth-helpers'
import { generateEmbedding } from '@/lib/embeddings'
import { KnowledgeEntrySchema } from '@/lib/schemas/chatbot'
import { ZodError } from 'zod'
import {
  parseError,
  ValidationError,
  DatabaseError,
  ExternalAPIError,
  withRetry,
} from '@/lib/errors/error-handler'

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
    console.error('[Knowledge GET]', appError.code, appError.message, appError.details)

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
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input with Zod
    const validated = KnowledgeEntrySchema.parse(body)

    // Verify user has access to this business
    await requireBusinessAccess(validated.businessId)

    // Generate embedding for semantic search with retry
    const embeddingText = `${validated.title}\n${validated.content}`
    console.log(`[Knowledge Create] Generating embedding for: "${validated.title}"`)

    const embedding = await withRetry(
      async () => {
        try {
          return await generateEmbedding(embeddingText)
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
          console.log(`[Knowledge Create] Retrying embedding generation (attempt ${attempt})`)
        },
      }
    )

    // Create knowledge entry with embedding and retry on database errors
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
              embedding, // ✅ NOW INCLUDED
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

    console.log(`[Knowledge Create] ✅ Created entry ${entry.id} with embedding`)

    return NextResponse.json({
      success: true,
      entry,
    })
  } catch (error) {
    // Handle validation errors specially
    if (error instanceof ZodError) {
      console.error('[Knowledge POST] Validation error:', error.issues)
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
    console.error('[Knowledge POST]', appError.code, appError.message, appError.details)

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
