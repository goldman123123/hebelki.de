/**
 * POST /api/documents/upload/init
 *
 * Initialize a document upload (supports multiple file types):
 * - PDF, DOCX, TXT, CSV, XLSX, HTML
 *
 * 1. Create document record
 * 2. Create document version record
 * 3. Create ingestion job (status: pending_upload)
 * 4. Generate and return presigned upload URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { documents, documentVersions, ingestionJobs } from '@/lib/db/schema'
import { requireBusinessAccess, requireAuth } from '@/lib/auth-helpers'
import { generateR2Key, getUploadUrl } from '@/lib/r2/client'
import { z } from 'zod'

/**
 * Supported MIME types and their source type mappings
 */
const SUPPORTED_TYPES: Record<string, string> = {
  // PDF
  'application/pdf': 'pdf',

  // Word documents
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',

  // Plain text
  'text/plain': 'txt',

  // CSV
  'text/csv': 'csv',
  'application/csv': 'csv',

  // Excel
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',

  // HTML
  'text/html': 'html',
  'application/xhtml+xml': 'html',
}

/**
 * Get source type from MIME type or filename extension
 */
function getSourceType(mimeType: string, filename: string): string | null {
  // Try MIME type first
  if (SUPPORTED_TYPES[mimeType]) {
    return SUPPORTED_TYPES[mimeType]
  }

  // Fallback to file extension
  const ext = filename.toLowerCase().split('.').pop()
  const extensionMap: Record<string, string> = {
    pdf: 'pdf',
    docx: 'docx',
    doc: 'doc',
    txt: 'txt',
    csv: 'csv',
    xlsx: 'xlsx',
    xls: 'xls',
    html: 'html',
    htm: 'html',
  }

  return extensionMap[ext || ''] || null
}

/**
 * MIME types that default to stored_only (potential PII)
 */
const STORED_ONLY_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]

const initSchema = z.object({
  businessId: z.string().uuid(),
  title: z.string().min(1).max(255),
  filename: z.string().min(1).max(255),
  contentType: z.string(),
  // Phase 1: Business Logic Separation fields
  audience: z.enum(['public', 'internal']).optional(),
  scopeType: z.enum(['global', 'customer', 'staff']).optional(),
  scopeId: z.string().uuid().optional(),
  dataClass: z.enum(['knowledge', 'stored_only']).optional(),
  containsPii: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth()
    const body = await request.json()
    const data = initSchema.parse(body)

    // Verify user has access to this business
    await requireBusinessAccess(data.businessId)

    // Determine source type from content type or filename
    const sourceType = getSourceType(data.contentType, data.filename)

    if (!sourceType) {
      const supportedExtensions = 'PDF, DOCX, DOC, TXT, CSV, XLSX, XLS, HTML'
      return NextResponse.json(
        {
          error: 'Unsupported file type',
          message: `Only the following formats are supported: ${supportedExtensions}`,
          contentType: data.contentType,
        },
        { status: 400 }
      )
    }

    // ============================================
    // PHASE 1: Smart Defaults for Access Control
    // ============================================

    // Determine dataClass: CSV/XLSX default to stored_only (safety)
    const isTabularData = STORED_ONLY_MIME_TYPES.includes(data.contentType) ||
      data.filename.toLowerCase().endsWith('.csv') ||
      data.filename.toLowerCase().endsWith('.xlsx') ||
      data.filename.toLowerCase().endsWith('.xls')

    const dataClass = data.dataClass || (isTabularData ? 'stored_only' : 'knowledge')

    // Default audience and scope
    const audience = data.audience || 'public'
    const scopeType = data.scopeType || 'global'
    const scopeId = data.scopeId || null

    // Validate: scopeId required if scopeType != global
    if (scopeType !== 'global' && !scopeId) {
      return NextResponse.json(
        {
          error: 'Invalid scope configuration',
          message: 'scopeId is required when scopeType is "customer" or "staff"',
        },
        { status: 400 }
      )
    }

    // CSV/XLSX files are assumed to contain PII by default, allow override
    const containsPii = data.containsPii !== undefined ? data.containsPii : isTabularData

    // Create document record
    // Note: Only include scopeId if it has a value (avoid inserting empty string to UUID column)
    const [document] = await db
      .insert(documents)
      .values({
        businessId: data.businessId,
        title: data.title,
        originalFilename: data.filename,
        uploadedBy: userId,
        status: 'active',
        // Phase 1 fields
        audience,
        scopeType,
        ...(scopeId ? { scopeId } : {}),
        dataClass,
        containsPii,
      })
      .returning()

    // Generate R2 key for version 1
    const r2Key = generateR2Key(data.businessId, document.id, 1)

    // Create document version record
    const [version] = await db
      .insert(documentVersions)
      .values({
        documentId: document.id,
        version: 1,
        r2Key,
        mimeType: data.contentType,
      })
      .returning()

    // Create ingestion job (queued, waiting for upload)
    // Include dataClass so worker can skip stored_only documents
    const [job] = await db
      .insert(ingestionJobs)
      .values({
        documentVersionId: version.id,
        businessId: data.businessId,
        sourceType,
        status: dataClass === 'stored_only' ? 'done' : 'queued', // Skip processing for stored_only
        stage: dataClass === 'stored_only' ? 'skipped' : 'pending_upload',
        metrics: {
          initiatedBy: userId,
          filename: data.filename,
          contentType: data.contentType,
          dataClass,
          skipped: dataClass === 'stored_only',
          skipReason: dataClass === 'stored_only' ? 'stored_only: document stored but not indexed' : undefined,
        },
      })
      .returning()

    // Generate presigned upload URL (15 minutes expiry)
    const uploadUrl = await getUploadUrl(r2Key, data.contentType, 900)

    return NextResponse.json({
      documentId: document.id,
      versionId: version.id,
      jobId: job.id,
      r2Key,
      sourceType,
      uploadUrl,
      expiresIn: 900, // seconds
      // Phase 1 fields
      audience,
      scopeType,
      scopeId,
      dataClass,
      containsPii,
      willBeIndexed: dataClass === 'knowledge', // Helpful for UI
    })
  } catch (error) {
    console.error('[POST /api/documents/upload/init] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }

    // Return more detailed error info in development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Failed to initialize upload',
        message: errorMessage,
        // Include stack in dev only
        ...(process.env.NODE_ENV === 'development' && error instanceof Error && { stack: error.stack }),
      },
      { status: 500 }
    )
  }
}
