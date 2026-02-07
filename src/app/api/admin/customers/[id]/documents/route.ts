/**
 * GET /api/admin/customers/[id]/documents - List customer-scoped documents
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { documents, documentVersions, ingestionJobs, customers } from '@/lib/db/schema'
import { eq, and, desc, ne } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id: customerId } = await params
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status') || 'active'
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  try {
    // Verify customer belongs to this business
    const [customer] = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.businessId, authResult.business.id)
        )
      )
      .limit(1)

    if (!customer) {
      return NextResponse.json(
        { error: 'Kunde nicht gefunden' },
        { status: 404 }
      )
    }

    // Build status filter
    const statusFilter = status === 'all'
      ? ne(documents.status, 'deleted')
      : eq(documents.status, status)

    // Get customer-scoped documents
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
      .where(
        and(
          eq(documents.businessId, authResult.business.id),
          eq(documents.scopeType, 'customer'),
          eq(documents.scopeId, customerId),
          statusFilter
        )
      )
      .orderBy(desc(documents.createdAt))
      .limit(limit)
      .offset(offset)

    // Get version and job info for each document
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

        return {
          ...doc,
          customerName: customer.name,
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
      customer: {
        id: customer.id,
        name: customer.name,
      },
      pagination: {
        limit,
        offset,
        hasMore: docs.length === limit,
      },
    })
  } catch (error) {
    console.error('[GET /api/admin/customers/[id]/documents] Error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Dokumente' },
      { status: 500 }
    )
  }
}
