/**
 * Re-Embedding Job
 *
 * Background worker to re-embed legacy entries and document chunks
 * when the preprocessing version changes.
 *
 * Split Brain Prevention (2026-02):
 * - Finds entries with preprocessVersion='legacy' or outdated versions
 * - Re-embeds with current config
 * - Updates all metadata fields
 */

import { db } from '@/lib/db'
import { chatbotKnowledge, chunkEmbeddings, documentChunks, documents, documentVersions } from '@/lib/db/schema'
import { eq, and, or, isNull, ne, sql, inArray } from 'drizzle-orm'
import {
  generateEmbeddingWithMetadata,
  EMBEDDING_CONFIG,
  normalizeText,
} from '@/lib/embeddings'

export interface ReEmbedResult {
  processed: number
  failed: number
  skipped: number
  durationMs: number
}

export interface ReEmbedOptions {
  batchSize?: number
  dryRun?: boolean
  onProgress?: (processed: number, total: number) => void
}

/**
 * Re-embed legacy knowledge base entries for a business
 */
export async function reEmbedLegacyKnowledgeEntries(
  businessId: string,
  options: ReEmbedOptions = {}
): Promise<ReEmbedResult> {
  const { batchSize = 100, dryRun = false, onProgress } = options
  const startTime = Date.now()

  let processed = 0
  let failed = 0
  let skipped = 0

  console.log(`[Re-Embed KB] Starting for business ${businessId}`)
  console.log(`[Re-Embed KB] Target version: ${EMBEDDING_CONFIG.preprocessVersion}`)

  // Find legacy entries (preprocessVersion is NULL, 'legacy', or not current)
  const legacyEntries = await db
    .select({
      id: chatbotKnowledge.id,
      title: chatbotKnowledge.title,
      content: chatbotKnowledge.content,
      preprocessVersion: chatbotKnowledge.preprocessVersion,
    })
    .from(chatbotKnowledge)
    .where(
      and(
        eq(chatbotKnowledge.businessId, businessId),
        eq(chatbotKnowledge.isActive, true),
        or(
          isNull(chatbotKnowledge.preprocessVersion),
          eq(chatbotKnowledge.preprocessVersion, 'legacy'),
          ne(chatbotKnowledge.preprocessVersion, EMBEDDING_CONFIG.preprocessVersion)
        )
      )
    )
    .limit(batchSize)

  console.log(`[Re-Embed KB] Found ${legacyEntries.length} entries to re-embed`)

  if (dryRun) {
    console.log(`[Re-Embed KB] Dry run - not making changes`)
    return {
      processed: 0,
      failed: 0,
      skipped: legacyEntries.length,
      durationMs: Date.now() - startTime,
    }
  }

  for (const entry of legacyEntries) {
    try {
      // Consistent header pattern: {Title}\n\n{Content}
      const embeddingText = `${entry.title}\n\n${entry.content}`
      const result = await generateEmbeddingWithMetadata(embeddingText)

      await db
        .update(chatbotKnowledge)
        .set({
          embedding: result.embedding,
          embeddingProvider: result.provider,
          embeddingModel: result.model,
          embeddingDim: result.dim,
          preprocessVersion: result.preprocessVersion,
          contentHash: result.contentHash,
          embeddedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(chatbotKnowledge.id, entry.id))

      processed++
      console.log(`[Re-Embed KB] ✅ ${entry.id} (${entry.title})`)

      onProgress?.(processed, legacyEntries.length)
    } catch (error) {
      failed++
      console.error(`[Re-Embed KB] ❌ ${entry.id}:`, error)
    }
  }

  const durationMs = Date.now() - startTime
  console.log(`[Re-Embed KB] Completed: ${processed} processed, ${failed} failed in ${durationMs}ms`)

  return { processed, failed, skipped, durationMs }
}

/**
 * Re-embed legacy document chunks for a business
 */
export async function reEmbedLegacyDocumentChunks(
  businessId: string,
  options: ReEmbedOptions = {}
): Promise<ReEmbedResult> {
  const { batchSize = 100, dryRun = false, onProgress } = options
  const startTime = Date.now()

  let processed = 0
  let failed = 0
  let skipped = 0

  console.log(`[Re-Embed Docs] Starting for business ${businessId}`)
  console.log(`[Re-Embed Docs] Target version: ${EMBEDDING_CONFIG.preprocessVersion}`)

  // Find legacy chunk embeddings
  const legacyChunks = await db
    .select({
      chunkId: chunkEmbeddings.chunkId,
      content: documentChunks.content,
      documentVersionId: documentChunks.documentVersionId,
      preprocessVersion: chunkEmbeddings.preprocessVersion,
    })
    .from(chunkEmbeddings)
    .innerJoin(documentChunks, eq(documentChunks.id, chunkEmbeddings.chunkId))
    .where(
      and(
        eq(chunkEmbeddings.businessId, businessId),
        or(
          isNull(chunkEmbeddings.preprocessVersion),
          eq(chunkEmbeddings.preprocessVersion, 'legacy'),
          ne(chunkEmbeddings.preprocessVersion, EMBEDDING_CONFIG.preprocessVersion)
        )
      )
    )
    .limit(batchSize)

  console.log(`[Re-Embed Docs] Found ${legacyChunks.length} chunks to re-embed`)

  if (dryRun) {
    console.log(`[Re-Embed Docs] Dry run - not making changes`)
    return {
      processed: 0,
      failed: 0,
      skipped: legacyChunks.length,
      durationMs: Date.now() - startTime,
    }
  }

  // Build document version ID to title map
  const versionIds = [...new Set(legacyChunks.map(c => c.documentVersionId))]
  const versionTitles = new Map<string, string>()

  if (versionIds.length > 0) {
    const titleResults = await db
      .select({
        versionId: documentVersions.id,
        title: documents.title,
      })
      .from(documentVersions)
      .innerJoin(documents, eq(documents.id, documentVersions.documentId))
      .where(inArray(documentVersions.id, versionIds))

    for (const row of titleResults) {
      versionTitles.set(row.versionId, row.title)
    }
  }

  for (const chunk of legacyChunks) {
    try {
      // Get document title for consistent header pattern
      const documentTitle = versionTitles.get(chunk.documentVersionId) || 'Document'

      // Consistent header pattern: {DocumentTitle}\n\n{Content}
      const embeddingText = `${documentTitle}\n\n${chunk.content}`
      const result = await generateEmbeddingWithMetadata(embeddingText)

      await db
        .update(chunkEmbeddings)
        .set({
          embedding: result.embedding,
          embeddingProvider: result.provider,
          embeddingModel: result.model,
          embeddingDim: result.dim,
          preprocessVersion: result.preprocessVersion,
          contentHash: result.contentHash,
          embeddedAt: new Date(),
        })
        .where(eq(chunkEmbeddings.chunkId, chunk.chunkId))

      processed++
      console.log(`[Re-Embed Docs] ✅ chunk ${chunk.chunkId}`)

      onProgress?.(processed, legacyChunks.length)
    } catch (error) {
      failed++
      console.error(`[Re-Embed Docs] ❌ chunk ${chunk.chunkId}:`, error)
    }
  }

  const durationMs = Date.now() - startTime
  console.log(`[Re-Embed Docs] Completed: ${processed} processed, ${failed} failed in ${durationMs}ms`)

  return { processed, failed, skipped, durationMs }
}

/**
 * Re-embed all legacy entries for a business (KB + documents)
 */
export async function reEmbedAllLegacy(
  businessId: string,
  options: ReEmbedOptions = {}
): Promise<{ kb: ReEmbedResult; docs: ReEmbedResult }> {
  console.log(`\n=== Re-Embed All Legacy for ${businessId} ===\n`)

  const kb = await reEmbedLegacyKnowledgeEntries(businessId, options)
  const docs = await reEmbedLegacyDocumentChunks(businessId, options)

  console.log(`\n=== Summary ===`)
  console.log(`KB:   ${kb.processed} processed, ${kb.failed} failed`)
  console.log(`Docs: ${docs.processed} processed, ${docs.failed} failed`)
  console.log(`Total time: ${kb.durationMs + docs.durationMs}ms`)

  return { kb, docs }
}

/**
 * Get counts of legacy embeddings per business
 */
export async function getLegacyEmbeddingCounts(): Promise<
  Array<{
    businessId: string
    kbLegacy: number
    kbCurrent: number
    docsLegacy: number
    docsCurrent: number
  }>
> {
  const results: Array<{
    businessId: string
    kbLegacy: number
    kbCurrent: number
    docsLegacy: number
    docsCurrent: number
  }> = []

  // Get KB counts by business
  const kbCounts = await db
    .select({
      businessId: chatbotKnowledge.businessId,
      preprocessVersion: chatbotKnowledge.preprocessVersion,
      count: sql<number>`count(*)::int`,
    })
    .from(chatbotKnowledge)
    .where(eq(chatbotKnowledge.isActive, true))
    .groupBy(chatbotKnowledge.businessId, chatbotKnowledge.preprocessVersion)

  // Get doc counts by business
  const docCounts = await db
    .select({
      businessId: chunkEmbeddings.businessId,
      preprocessVersion: chunkEmbeddings.preprocessVersion,
      count: sql<number>`count(*)::int`,
    })
    .from(chunkEmbeddings)
    .groupBy(chunkEmbeddings.businessId, chunkEmbeddings.preprocessVersion)

  // Aggregate by business
  const byBusiness = new Map<string, {
    kbLegacy: number
    kbCurrent: number
    docsLegacy: number
    docsCurrent: number
  }>()

  for (const row of kbCounts) {
    const existing = byBusiness.get(row.businessId) || {
      kbLegacy: 0,
      kbCurrent: 0,
      docsLegacy: 0,
      docsCurrent: 0,
    }

    if (
      row.preprocessVersion === EMBEDDING_CONFIG.preprocessVersion
    ) {
      existing.kbCurrent += row.count
    } else {
      existing.kbLegacy += row.count
    }

    byBusiness.set(row.businessId, existing)
  }

  for (const row of docCounts) {
    const existing = byBusiness.get(row.businessId) || {
      kbLegacy: 0,
      kbCurrent: 0,
      docsLegacy: 0,
      docsCurrent: 0,
    }

    if (
      row.preprocessVersion === EMBEDDING_CONFIG.preprocessVersion
    ) {
      existing.docsCurrent += row.count
    } else {
      existing.docsLegacy += row.count
    }

    byBusiness.set(row.businessId, existing)
  }

  for (const [businessId, counts] of byBusiness) {
    results.push({ businessId, ...counts })
  }

  return results
}
