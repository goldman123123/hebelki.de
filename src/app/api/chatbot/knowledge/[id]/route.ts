/**
 * Chatbot Knowledge Entry API
 *
 * PATCH: Update a knowledge entry
 * DELETE: Delete a knowledge entry
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatbotKnowledge } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireBusinessAccess } from '@/lib/auth-helpers'
import { generateEmbedding } from '@/lib/embeddings'
import { KnowledgeUpdateSchema } from '@/lib/schemas/chatbot'
import { ZodError } from 'zod'
import {
  parseError,
  NotFoundError,
  DatabaseError,
  ExternalAPIError,
  withRetry,
} from '@/lib/errors/error-handler'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

/**
 * PATCH /api/chatbot/knowledge/[id]
 *
 * Update a knowledge entry (regenerates embedding if content changes)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()

    // Validate input with Zod
    const validated = KnowledgeUpdateSchema.parse(body)

    // Fetch the entry to verify business ownership with retry
    const entry = await withRetry(
      async () => {
        const rows = await db
          .select()
          .from(chatbotKnowledge)
          .where(eq(chatbotKnowledge.id, id))
          .limit(1)

        if (!rows || rows.length === 0) {
          throw new NotFoundError('Knowledge entry')
        }

        return rows[0]
      },
      {
        maxRetries: 2,
        initialDelay: 500,
      }
    )

    // Verify user has access to this business
    await requireBusinessAccess(entry.businessId)

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (validated.title !== undefined) updates.title = validated.title
    if (validated.content !== undefined) updates.content = validated.content
    if (validated.category !== undefined) updates.category = validated.category
    if (validated.isActive !== undefined) updates.isActive = validated.isActive

    // If title or content changed, regenerate embedding for semantic search
    if (validated.title !== undefined || validated.content !== undefined) {
      const newTitle = validated.title ?? entry.title
      const newContent = validated.content ?? entry.content
      const embeddingText = `${newTitle}\n${newContent}`

      console.log(`[Knowledge Update] Regenerating embedding for: "${newTitle}"`)

      const embedding = await withRetry(
        async () => {
          try {
            return await generateEmbedding(embeddingText)
          } catch (error) {
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
            console.log(`[Knowledge Update] Retrying embedding generation (attempt ${attempt})`)
          },
        }
      )

      updates.embedding = embedding // ✅ REGENERATED
      console.log(`[Knowledge Update] ✅ Updated entry ${id} with new embedding`)
    }

    // Update the entry with retry
    const updatedEntry = await withRetry(
      async () => {
        try {
          const rows = await db
            .update(chatbotKnowledge)
            .set(updates)
            .where(eq(chatbotKnowledge.id, id))
            .returning()

          if (!rows || rows.length === 0) {
            throw new DatabaseError('Failed to update entry - no rows returned')
          }

          return rows[0]
        } catch (error) {
          throw new DatabaseError(
            error instanceof Error ? error.message : 'Database update failed'
          )
        }
      },
      {
        maxRetries: 2,
        initialDelay: 500,
      }
    )

    return NextResponse.json({
      success: true,
      entry: updatedEntry,
    })
  } catch (error) {
    // Handle validation errors specially
    if (error instanceof ZodError) {
      console.error('[Knowledge PATCH] Validation error:', error.issues)
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
    console.error('[Knowledge PATCH]', appError.code, appError.message, appError.details)

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

/**
 * DELETE /api/chatbot/knowledge/[id]
 *
 * Delete a knowledge entry
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    // Fetch the entry to verify business ownership with retry
    const entry = await withRetry(
      async () => {
        const rows = await db
          .select()
          .from(chatbotKnowledge)
          .where(eq(chatbotKnowledge.id, id))
          .limit(1)

        if (!rows || rows.length === 0) {
          throw new NotFoundError('Knowledge entry')
        }

        return rows[0]
      },
      {
        maxRetries: 2,
        initialDelay: 500,
      }
    )

    // Verify user has access to this business
    await requireBusinessAccess(entry.businessId)

    // Delete the entry with retry
    await withRetry(
      async () => {
        try {
          await db
            .delete(chatbotKnowledge)
            .where(eq(chatbotKnowledge.id, id))
        } catch (error) {
          throw new DatabaseError(
            error instanceof Error ? error.message : 'Database delete failed'
          )
        }
      },
      {
        maxRetries: 2,
        initialDelay: 500,
      }
    )

    console.log(`[Knowledge DELETE] ✅ Deleted entry ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Knowledge entry deleted',
    })
  } catch (error) {
    const appError = parseError(error)
    console.error('[Knowledge DELETE]', appError.code, appError.message, appError.details)

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
