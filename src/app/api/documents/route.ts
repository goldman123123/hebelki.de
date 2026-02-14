/**
 * GET /api/documents
 *
 * List all documents for a business
 * Supports filtering by dataClass (knowledge, stored_only)
 * Includes audience, scopeType, scopeId, containsPii fields
 * Joins customers table for customer names when scopeType=customer
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { documents, documentVersions, ingestionJobs, customers } from '@/lib/db/schema'
import { requireBusinessAccess } from '@/lib/auth-helpers'
import { eq, and, desc, ne } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:documents')

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')
    const status = searchParams.get('status') || 'active'
    const dataClass = searchParams.get('dataClass') // 'knowledge' or 'stored_only' or null for all
    const audience = searchParams.get('audience') // 'public' or 'internal' or null for all
    const scopeType = searchParams.get('scopeType') // 'global', 'customer', 'staff' or null for all
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this business
    await requireBusinessAccess(businessId)

    // Build filters
    const filters = [eq(documents.businessId, businessId)]

    // Status filter
    if (status === 'all') {
      filters.push(ne(documents.status, 'deleted'))
    } else {
      filters.push(eq(documents.status, status))
    }

    // DataClass filter
    if (dataClass) {
      filters.push(eq(documents.dataClass, dataClass))
    }

    // Audience filter (public or internal)
    if (audience) {
      filters.push(eq(documents.audience, audience))
    }

    // ScopeType filter (global, customer, staff)
    if (scopeType) {
      filters.push(eq(documents.scopeType, scopeType))
    }

    // Get documents with all fields including new access control fields
    const docs = await db
      .select({
        id: documents.id,
        title: documents.title,
        originalFilename: documents.originalFilename,
        status: documents.status,
        uploadedBy: documents.uploadedBy,
        labels: documents.labels,
        audience: documents.audience,
        scopeType: documents.scopeType,
        scopeId: documents.scopeId,
        dataClass: documents.dataClass,
        containsPii: documents.containsPii,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(and(...filters))
      .orderBy(desc(documents.createdAt))
      .limit(limit)
      .offset(offset)

    // Get version, job info, and customer names for each document
    const documentsWithDetails = await Promise.all(
      docs.map(async (doc) => {
        // Get latest version
        const latestVersion = await db
          .select({
            id: documentVersions.id,
            version: documentVersions.version,
            fileSize: documentVersions.fileSize,
            createdAt: documentVersions.createdAt,
          })
          .from(documentVersions)
          .where(eq(documentVersions.documentId, doc.id))
          .orderBy(desc(documentVersions.version))
          .limit(1)
          .then(rows => rows[0])

        // Get latest job status
        let jobStatus = null
        if (latestVersion) {
          const job = await db
            .select({
              id: ingestionJobs.id,
              status: ingestionJobs.status,
              stage: ingestionJobs.stage,
              errorCode: ingestionJobs.errorCode,
              attempts: ingestionJobs.attempts,
              lastError: ingestionJobs.lastError,
              completedAt: ingestionJobs.completedAt,
            })
            .from(ingestionJobs)
            .where(eq(ingestionJobs.documentVersionId, latestVersion.id))
            .orderBy(desc(ingestionJobs.createdAt))
            .limit(1)
            .then(rows => rows[0])

          if (job) {
            jobStatus = {
              id: job.id,
              status: job.status,
              stage: job.stage,
              errorCode: job.errorCode,
              attempts: job.attempts,
              lastError: job.lastError,
              completedAt: job.completedAt,
            }
          }
        }

        // Get customer name if scopeType is 'customer'
        let customerName: string | null = null
        if (doc.scopeType === 'customer' && doc.scopeId) {
          const customer = await db
            .select({ name: customers.name })
            .from(customers)
            .where(eq(customers.id, doc.scopeId))
            .limit(1)
            .then(rows => rows[0])

          if (customer) {
            customerName = customer.name
          }
        }

        return {
          ...doc,
          customerName,
          latestVersion: latestVersion ? {
            id: latestVersion.id,
            version: latestVersion.version,
            fileSize: latestVersion.fileSize,
            createdAt: latestVersion.createdAt,
          } : null,
          processingStatus: jobStatus,
        }
      })
    )

    return NextResponse.json({
      documents: documentsWithDetails,
      pagination: {
        limit,
        offset,
        hasMore: docs.length === limit,
      },
    })
  } catch (error) {
    log.error('[GET /api/documents] Error:', error)

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    )
  }
}
