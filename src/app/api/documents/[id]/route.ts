/**
 * GET/DELETE/PATCH /api/documents/[id]
 *
 * Get document details, mark for deletion, or update metadata/classification
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  documents,
  documentVersions,
  ingestionJobs,
  documentPages,
  documentChunks,
  chunkEmbeddings,
} from '@/lib/db/schema'
import { requireBusinessAccess } from '@/lib/auth-helpers'
import { getDownloadUrl } from '@/lib/r2/client'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:documents:id')

type Params = Promise<{ id: string }>

/**
 * GET /api/documents/[id]
 * Get document details including all versions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id: documentId } = await params
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this business
    await requireBusinessAccess(businessId)

    // Get document
    const doc = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.businessId, businessId)
        )
      )
      .limit(1)
      .then(rows => rows[0])

    if (!doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get all versions
    const versions = await db
      .select({
        id: documentVersions.id,
        version: documentVersions.version,
        r2Key: documentVersions.r2Key,
        fileSize: documentVersions.fileSize,
        mimeType: documentVersions.mimeType,
        sha256Hash: documentVersions.sha256Hash,
        createdAt: documentVersions.createdAt,
      })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.version))

    // Get latest version's job status and generate download URL
    let downloadUrl: string | null = null
    let latestJob = null

    if (versions.length > 0) {
      const latestVersion = versions[0]

      // Generate presigned download URL (1 hour expiry)
      downloadUrl = await getDownloadUrl(latestVersion.r2Key, 3600)

      // Get job status
      const job = await db
        .select({
          id: ingestionJobs.id,
          status: ingestionJobs.status,
          stage: ingestionJobs.stage,
          errorCode: ingestionJobs.errorCode,
          attempts: ingestionJobs.attempts,
          lastError: ingestionJobs.lastError,
          metrics: ingestionJobs.metrics,
          startedAt: ingestionJobs.startedAt,
          completedAt: ingestionJobs.completedAt,
          createdAt: ingestionJobs.createdAt,
        })
        .from(ingestionJobs)
        .where(eq(ingestionJobs.documentVersionId, latestVersion.id))
        .orderBy(desc(ingestionJobs.createdAt))
        .limit(1)
        .then(rows => rows[0])

      if (job) {
        latestJob = job
      }
    }

    // Get chunk count for latest version
    let chunkCount = 0
    let pageCount = 0
    if (versions.length > 0) {
      const latestVersion = versions[0]

      const chunks = await db
        .select({ id: documentChunks.id })
        .from(documentChunks)
        .where(eq(documentChunks.documentVersionId, latestVersion.id))

      chunkCount = chunks.length

      const pages = await db
        .select({ id: documentPages.id })
        .from(documentPages)
        .where(eq(documentPages.documentVersionId, latestVersion.id))

      pageCount = pages.length
    }

    return NextResponse.json({
      id: doc.id,
      title: doc.title,
      originalFilename: doc.originalFilename,
      status: doc.status,
      uploadedBy: doc.uploadedBy,
      labels: doc.labels,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      versions: versions.map(v => ({
        id: v.id,
        version: v.version,
        fileSize: v.fileSize,
        mimeType: v.mimeType,
        createdAt: v.createdAt,
      })),
      downloadUrl,
      processingStatus: latestJob,
      stats: {
        pageCount,
        chunkCount,
        versionCount: versions.length,
      },
    })
  } catch (error) {
    log.error('[GET /api/documents/[id]] Error:', error)

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to get document' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/documents/[id]
 * Mark document for deletion (two-phase delete)
 *
 * Phase 1: Mark as deleted_pending (API does this)
 * Phase 2: Worker cleans up R2 + DB rows, marks as deleted
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id: documentId } = await params
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this business
    await requireBusinessAccess(businessId)

    // Get document
    const doc = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.businessId, businessId)
        )
      )
      .limit(1)
      .then(rows => rows[0])

    if (!doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Already deleted or pending deletion
    if (doc.status === 'deleted' || doc.status === 'deleted_pending') {
      return NextResponse.json({
        success: true,
        status: doc.status,
        message: doc.status === 'deleted'
          ? 'Document already deleted'
          : 'Document deletion in progress',
      })
    }

    // Phase 1: Mark as deleted_pending
    await db
      .update(documents)
      .set({
        status: 'deleted_pending',
        updatedAt: new Date(),
        deletedAt: new Date(),
      })
      .where(eq(documents.id, documentId))

    // Cancel any pending/in-progress jobs
    const versions = await db
      .select({ id: documentVersions.id })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))

    for (const version of versions) {
      await db
        .update(ingestionJobs)
        .set({
          status: 'failed',
          errorCode: 'document_deleted',
          lastError: 'Document deleted',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(ingestionJobs.documentVersionId, version.id),
            // Only cancel jobs that aren't already done/failed
            eq(ingestionJobs.status, 'queued')
          )
        )
    }

    return NextResponse.json({
      success: true,
      status: 'deleted_pending',
      message: 'Document marked for deletion. Cleanup will complete shortly.',
    })
  } catch (error) {
    log.error('[DELETE /api/documents/[id]] Error:', error)

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/documents/[id]
 * Update document metadata and classification
 *
 * Supported fields:
 * - title: Document title
 * - labels: Array of labels
 * - audience: 'public' | 'internal'
 * - scopeType: 'global' | 'customer' | 'staff'
 * - scopeId: UUID (required when scopeType != 'global')
 * - dataClass: 'knowledge' | 'stored_only'
 *
 * Side effects:
 * - dataClass change to 'knowledge': Creates new ingestion job
 * - dataClass change to 'stored_only': Cancels pending jobs, deletes embeddings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id: documentId } = await params
    const body = await request.json()
    const { businessId, title, labels, audience, scopeType, scopeId, dataClass } = body

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    // Validate audience if provided
    if (audience !== undefined && !['public', 'internal'].includes(audience)) {
      return NextResponse.json(
        { error: 'audience must be "public" or "internal"' },
        { status: 400 }
      )
    }

    // Validate scopeType if provided
    if (scopeType !== undefined && !['global', 'customer', 'staff'].includes(scopeType)) {
      return NextResponse.json(
        { error: 'scopeType must be "global", "customer", or "staff"' },
        { status: 400 }
      )
    }

    // Validate dataClass if provided
    if (dataClass !== undefined && !['knowledge', 'stored_only'].includes(dataClass)) {
      return NextResponse.json(
        { error: 'dataClass must be "knowledge" or "stored_only"' },
        { status: 400 }
      )
    }

    // Validate scopeId requirement
    if (scopeType !== undefined && scopeType !== 'global' && !scopeId) {
      return NextResponse.json(
        { error: 'scopeId is required when scopeType is not "global"' },
        { status: 400 }
      )
    }

    // Verify user has access to this business
    await requireBusinessAccess(businessId)

    // Get document
    const doc = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.businessId, businessId)
        )
      )
      .limit(1)
      .then(rows => rows[0])

    if (!doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updates: Partial<typeof documents.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (title !== undefined) {
      updates.title = title
    }

    if (labels !== undefined) {
      updates.labels = labels
    }

    if (audience !== undefined) {
      updates.audience = audience
    }

    if (scopeType !== undefined) {
      updates.scopeType = scopeType
      // Set scopeId to null if scopeType is global
      if (scopeType === 'global') {
        updates.scopeId = null
      } else if (scopeId !== undefined) {
        updates.scopeId = scopeId
      }
    } else if (scopeId !== undefined) {
      updates.scopeId = scopeId
    }

    if (dataClass !== undefined) {
      updates.dataClass = dataClass
    }

    // Track if we need to handle dataClass change side effects
    const dataClassChanged = dataClass !== undefined && dataClass !== doc.dataClass
    const changingToKnowledge = dataClassChanged && dataClass === 'knowledge'
    const changingToStoredOnly = dataClassChanged && dataClass === 'stored_only'
    let reindexing = false

    // Update document
    const [updated] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, documentId))
      .returning()

    // Handle dataClass change side effects
    if (dataClassChanged) {
      // Get latest version
      const latestVersion = await db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.version))
        .limit(1)
        .then(rows => rows[0])

      if (latestVersion) {
        if (changingToKnowledge) {
          // Create new ingestion job
          // Get source type from file extension
          const ext = doc.originalFilename.toLowerCase().split('.').pop() || 'unknown'
          const sourceTypeMap: Record<string, string> = {
            pdf: 'pdf',
            docx: 'docx',
            doc: 'doc',
            txt: 'txt',
            html: 'html',
            htm: 'html',
            csv: 'csv',
            xlsx: 'xlsx',
            xls: 'xls',
          }

          await db.insert(ingestionJobs).values({
            documentVersionId: latestVersion.id,
            businessId: businessId,
            sourceType: sourceTypeMap[ext] || 'unknown',
            status: 'queued',
            attempts: 0,
          })

          reindexing = true
        } else if (changingToStoredOnly) {
          // Cancel any pending/processing jobs
          await db
            .update(ingestionJobs)
            .set({
              status: 'cancelled',
              errorCode: 'dataclass_changed',
              lastError: 'Data class changed to stored_only',
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(ingestionJobs.documentVersionId, latestVersion.id),
                inArray(ingestionJobs.status, ['queued', 'processing'])
              )
            )

          // Delete embeddings for this version
          // First get chunk IDs, then delete embeddings
          const chunks = await db
            .select({ id: documentChunks.id })
            .from(documentChunks)
            .where(eq(documentChunks.documentVersionId, latestVersion.id))

          if (chunks.length > 0) {
            const chunkIds = chunks.map(c => c.id)
            await db
              .delete(chunkEmbeddings)
              .where(inArray(chunkEmbeddings.chunkId, chunkIds))
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        id: updated.id,
        title: updated.title,
        labels: updated.labels,
        audience: updated.audience,
        scopeType: updated.scopeType,
        scopeId: updated.scopeId,
        dataClass: updated.dataClass,
        updatedAt: updated.updatedAt,
      },
      reindexing,
    })
  } catch (error) {
    log.error('[PATCH /api/documents/[id]] Error:', error)

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    )
  }
}
