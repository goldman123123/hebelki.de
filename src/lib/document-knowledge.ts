/**
 * Document Knowledge Pipeline
 *
 * Queues invoice/Lieferschein PDFs for the existing document worker pipeline
 * (parse → chunk → embed → index) so their content becomes searchable via RAG.
 */

import { createHash } from 'crypto'
import { db } from './db'
import { documents, documentVersions, ingestionJobs } from './db/schema'
import { eq, and } from 'drizzle-orm'

interface QueueDocumentParams {
  businessId: string
  title: string
  originalFilename: string
  r2Key: string
  pdfBuffer: Buffer
  audience: 'internal' | 'public'
  scopeType: 'global' | 'customer' | 'staff'
  scopeId?: string
  dataClass: 'knowledge' | 'stored_only'
  containsPii: boolean
  authorityLevel: 'canonical' | 'high' | 'normal' | 'low' | 'unverified'
}

/**
 * Create documents + documentVersions + ingestionJobs records so the
 * existing Fly.io worker picks up and processes the PDF through the
 * standard pipeline (parse → chunk → embed → index).
 *
 * Idempotent: if a document with the same originalFilename already exists
 * for this business, it is hard-deleted first (cascades to versions, jobs,
 * pages, chunks, embeddings).
 */
export async function queueDocumentForEmbedding(params: QueueDocumentParams) {
  const {
    businessId, title, originalFilename, r2Key, pdfBuffer,
    audience, scopeType, scopeId, dataClass, containsPii, authorityLevel,
  } = params

  const fileSize = pdfBuffer.length
  const sha256Hash = createHash('sha256').update(pdfBuffer).digest('hex')

  // Delete existing document with same filename (cascade removes versions → jobs, pages, chunks → embeddings)
  const existing = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(
      eq(documents.businessId, businessId),
      eq(documents.originalFilename, originalFilename),
      eq(documents.status, 'active'),
    ))
    .limit(1)

  if (existing[0]) {
    await db.delete(documents).where(eq(documents.id, existing[0].id))
  }

  // Insert document
  const [doc] = await db.insert(documents).values({
    businessId,
    title,
    originalFilename,
    status: 'active',
    audience,
    scopeType,
    scopeId: scopeId ?? null,
    dataClass,
    containsPii,
    authorityLevel,
  }).returning({ id: documents.id })

  // Insert version
  const [version] = await db.insert(documentVersions).values({
    documentId: doc.id,
    version: 1,
    r2Key,
    fileSize,
    mimeType: 'application/pdf',
    sha256Hash,
  }).returning({ id: documentVersions.id })

  // Insert ingestion job — stage 'uploaded' because file is already in R2
  await db.insert(ingestionJobs).values({
    documentVersionId: version.id,
    businessId,
    sourceType: 'pdf',
    status: 'queued',
    stage: 'uploaded',
  })
}

/**
 * Build a human-readable title for an invoice document.
 * e.g. "Rechnung RE-2026-00001 – Müller, Hans"
 * or   "Stornorechnung RE-2026-00002 – Müller, Hans"
 */
export function buildInvoiceDocTitle(
  invoiceNumber: string,
  customerName: string | null,
  invoiceType: string,
): string {
  const prefix = invoiceType === 'storno' ? 'Stornorechnung' : 'Rechnung'
  const suffix = customerName ? ` – ${customerName}` : ''
  return `${prefix} ${invoiceNumber}${suffix}`
}

/**
 * Build a human-readable title for a Lieferschein document.
 * e.g. "Lieferschein – Müller, Hans (2026-02-11)"
 */
export function buildLieferscheinDocTitle(
  customerName: string,
  deliveryDate: string,
): string {
  return `Lieferschein – ${customerName} (${deliveryDate})`
}
