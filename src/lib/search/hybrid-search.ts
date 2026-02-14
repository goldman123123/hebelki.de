/**
 * Hybrid Search Implementation (2026 RAG Best Practices)
 *
 * Combines vector search (semantic) with keyword search (full-text)
 * using Reciprocal Rank Fusion (RRF) for improved accuracy.
 *
 * Now searches BOTH:
 * - chatbot_knowledge (manual entries, scraped content)
 * - document_chunks (PDF documents via chunk_embeddings)
 *
 * Phase 1 Updates (Business Logic Separation):
 * - Added AccessContext for audience/scope filtering
 * - Customer mode: only public + global documents
 * - Staff/Owner mode: public + internal, with customer-scoped access
 * - Document status filter: only 'active' documents
 *
 * Split Brain Prevention (2026-02):
 * - Embedding compatibility filtering by model/dim/preprocessVersion
 * - Authority-based weighting for trusted sources
 * - Field-level conflict detection for factual data
 *
 * Research sources:
 * - https://levelup.gitconnected.com/designing-a-production-grade-rag-architecture-bee5a4e4d9aa
 * - https://arxiv.org/abs/2501.07391
 */

import { generateEmbedding, EMBEDDING_CONFIG, normalizeText, hashContent } from '@/lib/embeddings'
import { db } from '@/lib/db'
import {
  chatbotKnowledge,
  documentChunks,
  chunkEmbeddings,
  documents,
  documentVersions,
} from '@/lib/db/schema'
import { eq, and, or, ilike, isNotNull, sql, inArray } from 'drizzle-orm'
import { augmentQuery, shouldAugmentQuery } from './query-augmentation'
import { createLogger } from '@/lib/logger'

const log = createLogger('lib:search:hybrid-search')

// ============================================
// ACCESS CONTROL TYPES
// ============================================

/**
 * Access context for search queries
 * Determines what documents/knowledge the user can access
 */
export interface AccessContext {
  businessId: string
  // Actor type determines access level
  actorType: 'customer' | 'staff' | 'owner'
  // Actor ID (customerId for customer, clerkUserId for staff/owner)
  actorId?: string
  // Optional: specific customer scope for staff queries
  customerScopeId?: string
}

/**
 * Audience values for documents and knowledge
 */
export type Audience = 'public' | 'internal'

/**
 * Scope type values
 */
export type ScopeType = 'global' | 'customer' | 'staff'

export interface SearchResult {
  id: string
  title: string
  content: string
  category: string | null
  source: string
  score: number // 0-1 (higher = more relevant)
  method: 'vector' | 'keyword' | 'hybrid'
}

// Extended result for document chunks with provenance
export interface DocumentSearchResult extends SearchResult {
  documentId: string
  documentTitle: string
  pageStart: number
  pageEnd: number
}

export interface HybridSearchOptions {
  limit?: number
  category?: string
  vectorWeight?: number // 0-1, default 0.6
  keywordWeight?: number // 0-1, default 0.4
  minScore?: number // Minimum score threshold (0-1)
  includeDocuments?: boolean // Search document chunks (default: true)
  documentsOnly?: boolean // Only search documents, not knowledge base
  // Access control (Phase 1)
  accessContext?: AccessContext // If not provided, defaults to public/global only
  // Split brain prevention (Phase 2)
  filterIncompatibleEmbeddings?: boolean // Filter out legacy embeddings (default: true)
  detectConflicts?: boolean // Detect field-level conflicts (default: true)
}

// ============================================
// AUTHORITY-BASED WEIGHTING
// ============================================

/**
 * Authority levels for knowledge entries and documents
 */
export type AuthorityLevel = 'canonical' | 'high' | 'normal' | 'low' | 'unverified'

/**
 * Weights for authority levels
 * Higher authority = higher weight in ranking
 */
export const AUTHORITY_WEIGHTS: Record<AuthorityLevel, number> = {
  canonical: 1.5,    // Official policies, verified facts
  high: 1.3,         // Curated entries, authoritative docs
  normal: 1.0,       // Default
  low: 0.85,         // Scraped, may be outdated
  unverified: 0.7,   // Chat-extracted, needs review
}

/**
 * Weights for content categories
 * Critical categories get higher weight
 */
export const CATEGORY_WEIGHTS: Record<string, number> = {
  policy: 1.3,       // Policies should rank high
  pricing: 1.2,      // Prices are critical
  hours: 1.2,        // Hours are factual
  faq: 1.1,          // FAQs are curated
  services: 1.0,
  other: 0.95,
}

// ============================================
// CONFLICT DETECTION TYPES
// ============================================

/**
 * An extracted fact from content
 */
export interface ExtractedFact {
  field: string
  value: string | number
  unit?: string
  source: string
  sourceId: string
}

/**
 * A detected conflict between sources
 */
export interface Conflict {
  field: string
  values: Array<{ value: string | number; source: string; sourceId: string }>
}

/**
 * Search metadata including conflict detection
 */
export interface SearchMetadata {
  conflictDetected: boolean
  conflicts: Conflict[]
  incompatibleEmbeddingsFiltered: number
  staleEmbeddingsDetected: string[]
  queryAugmented: boolean
  queryVariations: string[]
}

/**
 * Extended search result with authority and provenance
 */
export interface ExtendedSearchResult extends SearchResult {
  authorityLevel?: AuthorityLevel
  embeddingCompatible?: boolean
  preprocessVersion?: string | null
}

/**
 * Perform hybrid search combining vector and keyword search
 * With optional query augmentation for multilingual queries
 *
 * Access Control (Phase 1):
 * - If accessContext not provided: defaults to customer mode (public + global only)
 * - Customer mode: audience='public', scopeType='global' OR own customer-scoped docs
 * - Staff/Owner mode: audience='public' OR 'internal', with customer-scoped access
 */
export async function hybridSearch(
  businessId: string,
  query: string,
  options: HybridSearchOptions = {}
): Promise<SearchResult[]> {
  const {
    limit = 10,
    category,
    vectorWeight = 0.6,
    keywordWeight = 0.4,
    minScore = 0.5, // Default threshold for quality matches
    includeDocuments = true,
    documentsOnly = false,
    accessContext,
  } = options

  // Default access context: customer mode (safest)
  const effectiveContext: AccessContext = accessContext || {
    businessId,
    actorType: 'customer',
  }

  log.info(`\n=== HYBRID SEARCH ===`)
  log.info(`Query: "${query}"`)
  log.info(`Business ID: ${businessId}`)
  log.info(`Category: ${category || 'none'}`)
  log.info(`Min Score: ${minScore}`)
  log.info(`Include Documents: ${includeDocuments}`)
  log.info(`Actor Type: ${effectiveContext.actorType}`)

  // Check if query augmentation would help
  const useAugmentation = shouldAugmentQuery(query)
  let searchQueries = [query]

  if (useAugmentation) {
    const augmented = augmentQuery(query)
    searchQueries = augmented.augmented.slice(0, 3) // Limit to top 3 variations
    log.info(`Augmented query with ${searchQueries.length} variations:`, searchQueries)
  }

  // Run searches for all query variations in parallel
  const allSearches = await Promise.all(
    searchQueries.map(async searchQuery => {
      const searchPromises: Promise<Array<SearchResult & { rank: number }>>[] = []

      // Knowledge base searches (unless documentsOnly)
      if (!documentsOnly) {
        searchPromises.push(
          performVectorSearch(businessId, searchQuery, category, limit * 2, effectiveContext),
          performKeywordSearch(businessId, searchQuery, category, limit * 2, effectiveContext)
        )
      }

      // Document chunk searches (if enabled)
      if (includeDocuments) {
        searchPromises.push(
          performDocumentVectorSearch(businessId, searchQuery, limit * 2, effectiveContext),
          performDocumentKeywordSearch(businessId, searchQuery, limit * 2, effectiveContext)
        )
      }

      const results = await Promise.all(searchPromises)

      // Split results based on what we searched
      if (!documentsOnly && includeDocuments) {
        return {
          vectorResults: results[0],
          keywordResults: results[1],
          docVectorResults: results[2],
          docKeywordResults: results[3],
        }
      } else if (documentsOnly) {
        return {
          vectorResults: [],
          keywordResults: [],
          docVectorResults: results[0],
          docKeywordResults: results[1],
        }
      } else {
        return {
          vectorResults: results[0],
          keywordResults: results[1],
          docVectorResults: [],
          docKeywordResults: [],
        }
      }
    })
  )

  // Merge results from all query variations
  const allVectorResults = allSearches.flatMap(s => s.vectorResults)
  const allKeywordResults = allSearches.flatMap(s => s.keywordResults)
  const allDocVectorResults = allSearches.flatMap(s => s.docVectorResults)
  const allDocKeywordResults = allSearches.flatMap(s => s.docKeywordResults)

  // Deduplicate by ID (keep highest ranked)
  const dedupeVector = deduplicateResults(allVectorResults)
  const dedupeKeyword = deduplicateResults(allKeywordResults)
  const dedupeDocVector = deduplicateResults(allDocVectorResults)
  const dedupeDocKeyword = deduplicateResults(allDocKeywordResults)

  log.info(`Knowledge base - Vector: ${dedupeVector.length}, Keyword: ${dedupeKeyword.length}`)
  log.info(`Documents - Vector: ${dedupeDocVector.length}, Keyword: ${dedupeDocKeyword.length}`)

  if (dedupeVector.length === 0 && dedupeDocVector.length === 0) {
    log.warn('Vector search returned 0 results - possible embedding issues or low similarity')
  } else {
    const topVector = [...dedupeVector, ...dedupeDocVector].slice(0, 3)
    topVector.forEach((r, i) => {
      log.info(`  [${i}] ${r.title} - score: ${r.score.toFixed(3)} (${r.source})`)
    })
  }

  // Combine all vector and keyword results
  const combinedVector = [...dedupeVector, ...dedupeDocVector]
  const combinedKeyword = [...dedupeKeyword, ...dedupeDocKeyword]

  // Combine results using Reciprocal Rank Fusion
  const fusedResults = reciprocalRankFusion(
    combinedVector,
    combinedKeyword,
    { vectorWeight, keywordWeight }
  )

  log.info(`Fused results: ${fusedResults.length}`)

  // Filter by minimum score and limit
  const filteredResults = fusedResults.filter(r => r.score >= minScore)
  const belowThreshold = fusedResults.filter(r => r.score < minScore)

  if (belowThreshold.length > 0) {
    log.info(`Filtered out ${belowThreshold.length} results below threshold ${minScore}:`)
    belowThreshold.slice(0, 3).forEach(r => {
      log.info(`  ❌ ${r.title} - score: ${r.score.toFixed(3)}`)
    })
  }

  const finalResults = filteredResults.slice(0, limit)

  log.info(`Final results: ${finalResults.length}`)
  log.info(`=== END HYBRID SEARCH ===\n`)

  return finalResults
}

// ============================================
// FACT EXTRACTION FOR CONFLICT DETECTION
// ============================================

/**
 * Regex patterns for German business facts
 * Used to detect conflicts between sources
 */
const FACT_EXTRACTORS: Array<{
  field: string
  pattern: RegExp
  extract: (match: RegExpMatchArray) => { value: number | string; unit: string }
}> = [
  {
    field: 'cancellationHours',
    pattern: /(\d+)\s*(h|std|stunden?|hours?)\s*(vorher|vor|im\s*voraus|notice|cancellation)/i,
    extract: (m) => ({ value: parseInt(m[1]), unit: 'hours' }),
  },
  {
    field: 'minNoticeHours',
    pattern: /(mindestens|min\.?|minimum)\s*(\d+)\s*(h|std|stunden?|hours?)/i,
    extract: (m) => ({ value: parseInt(m[2]), unit: 'hours' }),
  },
  {
    field: 'maxAdvanceDays',
    pattern: /(maximal|max\.?|bis\s*zu)\s*(\d+)\s*(tage?|days?|wochen?|weeks?)/i,
    extract: (m) => {
      const val = parseInt(m[2])
      const unit = m[3].toLowerCase().startsWith('w') ? 'weeks' : 'days'
      return { value: unit === 'weeks' ? val * 7 : val, unit: 'days' }
    },
  },
  {
    field: 'vatRate',
    pattern: /(\d+(?:[,.]\d+)?)\s*%\s*(mwst|ust|vat|mehrwertsteuer)/i,
    extract: (m) => ({ value: parseFloat(m[1].replace(',', '.')), unit: 'percent' }),
  },
  {
    field: 'openingHours',
    pattern: /(mo|di|mi|do|fr|sa|so|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)[^:]*:\s*(\d{1,2})[:.h](\d{2})?\s*[-–]\s*(\d{1,2})[:.h](\d{2})?/i,
    extract: (m) => ({
      value: `${m[1]}:${m[2]}:${m[3] || '00'}-${m[4]}:${m[5] || '00'}`,
      unit: 'schedule',
    }),
  },
  {
    field: 'price',
    pattern: /(\d+(?:[,.]\d{2})?)\s*(?:€|eur|euro)/i,
    extract: (m) => ({ value: parseFloat(m[1].replace(',', '.')), unit: 'EUR' }),
  },
  {
    field: 'duration',
    pattern: /(\d+)\s*(min(?:uten?)?|minutes?)\s*(?:dauer|session|behandlung|termin)?/i,
    extract: (m) => ({ value: parseInt(m[1]), unit: 'minutes' }),
  },
]

/**
 * Extract facts from content for conflict detection
 */
function extractFacts(
  content: string,
  source: string,
  sourceId: string
): ExtractedFact[] {
  const facts: ExtractedFact[] = []

  for (const extractor of FACT_EXTRACTORS) {
    const match = content.match(extractor.pattern)
    if (match) {
      const { value, unit } = extractor.extract(match)
      facts.push({
        field: extractor.field,
        value,
        unit,
        source,
        sourceId,
      })
    }
  }

  return facts
}

/**
 * Detect field-level conflicts between search results
 */
function detectFieldConflicts(results: SearchResult[]): Conflict[] {
  // Extract facts from top N results
  const allFacts: ExtractedFact[] = []
  for (const result of results.slice(0, 10)) {
    allFacts.push(...extractFacts(result.content, result.source, result.id))
  }

  // Group by field
  const byField = new Map<string, ExtractedFact[]>()
  for (const fact of allFacts) {
    const existing = byField.get(fact.field) || []
    existing.push(fact)
    byField.set(fact.field, existing)
  }

  // Detect conflicts (different values for same field)
  const conflicts: Conflict[] = []
  for (const [field, facts] of byField) {
    const uniqueValues = new Set(facts.map(f => String(f.value)))
    if (uniqueValues.size > 1) {
      conflicts.push({
        field,
        values: facts.map(f => ({
          value: f.value,
          source: f.source,
          sourceId: f.sourceId,
        })),
      })
    }
  }

  return conflicts
}

// ============================================
// AUTHORITY-BASED WEIGHTING
// ============================================

/**
 * Get the combined weight for a search result based on authority and category
 */
function getSourceWeight(
  authorityLevel: string | null | undefined,
  category: string | null | undefined
): number {
  const authority = (authorityLevel || 'normal') as AuthorityLevel
  const authorityWeight = AUTHORITY_WEIGHTS[authority] ?? 1.0
  const categoryWeight = CATEGORY_WEIGHTS[category || 'other'] ?? 1.0
  return authorityWeight * categoryWeight
}

// ============================================
// EMBEDDING COMPATIBILITY
// ============================================

interface EmbeddingMetadata {
  embeddingModel?: string | null
  embeddingDim?: number | null
  preprocessVersion?: string | null
}

/**
 * Check if an embedding is compatible with the current config
 */
function isEmbeddingCompatible(metadata: EmbeddingMetadata): boolean {
  // If no metadata, treat as compatible (legacy data)
  if (!metadata.embeddingModel && !metadata.preprocessVersion) {
    return true
  }

  // Strict check on critical fields
  const compatible =
    metadata.embeddingModel === EMBEDDING_CONFIG.model &&
    metadata.embeddingDim === EMBEDDING_CONFIG.dim &&
    (metadata.preprocessVersion === EMBEDDING_CONFIG.preprocessVersion ||
      metadata.preprocessVersion === 'legacy') // Allow legacy during migration

  return compatible
}

/**
 * Filter and log incompatible embeddings
 */
function filterCompatibleEmbeddings<T extends { id: string } & EmbeddingMetadata>(
  results: T[],
  logPrefix: string = ''
): { compatible: T[]; filteredCount: number } {
  const compatible: T[] = []
  let filteredCount = 0

  for (const r of results) {
    if (isEmbeddingCompatible(r)) {
      compatible.push(r)
    } else {
      filteredCount++
      log.warn(`${logPrefix}Incompatible embedding: ${r.id}`, {
        has: {
          model: r.embeddingModel,
          dim: r.embeddingDim,
          preprocess: r.preprocessVersion,
        },
        want: {
          model: EMBEDDING_CONFIG.model,
          dim: EMBEDDING_CONFIG.dim,
          preprocess: EMBEDDING_CONFIG.preprocessVersion,
        },
      })
    }
  }

  return { compatible, filteredCount }
}

// ============================================
// DEDUPLICATION
// ============================================

/**
 * Deduplicate search results, keeping the highest-ranked instance
 */
function deduplicateResults<T extends { id: string; rank: number }>(
  results: T[]
): T[] {
  const seen = new Map<string, T>()

  for (const result of results) {
    const existing = seen.get(result.id)
    if (!existing || result.rank < existing.rank) {
      seen.set(result.id, result)
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.rank - b.rank)
}

/**
 * Build access control conditions for knowledge base queries
 */
function buildKnowledgeAccessConditions(context: AccessContext) {
  if (context.actorType === 'customer') {
    // Customer mode: only public + global, OR customer-scoped to this customer
    const customerConditions = [
      // Public + global knowledge (always included)
      and(
        eq(chatbotKnowledge.audience, 'public'),
        eq(chatbotKnowledge.scopeType, 'global')
      )
    ]

    // Add customer-scoped condition only if actorId is provided
    if (context.actorId) {
      customerConditions.push(
        and(
          eq(chatbotKnowledge.scopeType, 'customer'),
          eq(chatbotKnowledge.scopeId, context.actorId)
        )!
      )
    }

    return or(...customerConditions)
  } else {
    // Staff/Owner mode: can access public + internal
    // AND global + customer-scoped if specified
    const audienceCondition = or(
      eq(chatbotKnowledge.audience, 'public'),
      eq(chatbotKnowledge.audience, 'internal')
    )

    const scopeConditions = [
      eq(chatbotKnowledge.scopeType, 'global'),
    ]

    // Note: We don't filter by staff-scoped here because actorId is a Clerk user ID,
    // not a UUID. Staff-scoped documents would need the staff member's UUID.

    // If querying about a specific customer, include their customer-scoped docs
    if (context.customerScopeId) {
      scopeConditions.push(
        and(
          eq(chatbotKnowledge.scopeType, 'customer'),
          eq(chatbotKnowledge.scopeId, context.customerScopeId)
        )!
      )
    }

    return and(audienceCondition, or(...scopeConditions))
  }
}

/**
 * Perform vector search using embeddings (semantic similarity)
 * Now includes embedding metadata for compatibility filtering and authority weighting
 */
async function performVectorSearch(
  businessId: string,
  query: string,
  category: string | undefined,
  limit: number,
  context: AccessContext
): Promise<Array<SearchResult & { rank: number; authorityLevel?: string | null; embeddingModel?: string | null; embeddingDim?: number | null; preprocessVersion?: string | null }>> {
  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query)

    // Build access control condition
    const accessCondition = buildKnowledgeAccessConditions(context)

    // Search using cosine similarity (pgvector operator <=>)
    // Include embedding metadata for compatibility filtering
    const results = await db
      .select({
        id: chatbotKnowledge.id,
        title: chatbotKnowledge.title,
        content: chatbotKnowledge.content,
        category: chatbotKnowledge.category,
        source: chatbotKnowledge.source,
        similarity: sql<number>`1 - (${chatbotKnowledge.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
        // Embedding metadata for compatibility filtering
        embeddingModel: chatbotKnowledge.embeddingModel,
        embeddingDim: chatbotKnowledge.embeddingDim,
        preprocessVersion: chatbotKnowledge.preprocessVersion,
        // Authority for weighting
        authorityLevel: chatbotKnowledge.authorityLevel,
      })
      .from(chatbotKnowledge)
      .where(
        and(
          eq(chatbotKnowledge.businessId, businessId),
          eq(chatbotKnowledge.isActive, true),
          isNotNull(chatbotKnowledge.embedding), // Skip entries without embeddings
          category ? eq(chatbotKnowledge.category, category) : undefined,
          accessCondition
        )
      )
      .orderBy(sql`${chatbotKnowledge.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`)
      .limit(limit)

    // Apply authority-based weighting to similarity scores
    return results.map((result, index) => {
      const authorityWeight = getSourceWeight(result.authorityLevel, result.category)
      const weightedScore = result.similarity * authorityWeight

      return {
        id: result.id,
        title: result.title || '',
        content: result.content,
        category: result.category,
        source: result.source,
        score: weightedScore,
        method: 'vector' as const,
        rank: index + 1,
        // Include metadata for compatibility filtering
        authorityLevel: result.authorityLevel,
        embeddingModel: result.embeddingModel,
        embeddingDim: result.embeddingDim,
        preprocessVersion: result.preprocessVersion,
      }
    })
  } catch (error) {
    log.error('Error:', error)
    return []
  }
}

/**
 * Perform keyword search using PostgreSQL full-text search
 * Now includes authority weighting for ranking
 */
async function performKeywordSearch(
  businessId: string,
  query: string,
  category: string | undefined,
  limit: number,
  context: AccessContext
): Promise<Array<SearchResult & { rank: number; authorityLevel?: string | null }>> {
  try {
    // Use ILIKE for simple pattern matching (works with German text)
    const searchPattern = `%${query}%`

    // Build access control condition
    const accessCondition = buildKnowledgeAccessConditions(context)

    const results = await db
      .select({
        id: chatbotKnowledge.id,
        title: chatbotKnowledge.title,
        content: chatbotKnowledge.content,
        category: chatbotKnowledge.category,
        source: chatbotKnowledge.source,
        authorityLevel: chatbotKnowledge.authorityLevel,
      })
      .from(chatbotKnowledge)
      .where(
        and(
          eq(chatbotKnowledge.businessId, businessId),
          eq(chatbotKnowledge.isActive, true),
          or(
            ilike(chatbotKnowledge.title, searchPattern),
            ilike(chatbotKnowledge.content, searchPattern)
          ),
          category ? eq(chatbotKnowledge.category, category) : undefined,
          accessCondition
        )
      )
      .limit(limit)

    // Calculate relevance score with authority weighting
    return results.map((result, index) => {
      const titleMatch = result.title?.toLowerCase().includes(query.toLowerCase())

      // Higher score if query appears in title
      const baseScore = titleMatch ? 0.8 : 0.6
      // Decay score based on rank
      const rankPenalty = index * 0.05
      const rawScore = Math.max(0.1, baseScore - rankPenalty)

      // Apply authority weighting
      const authorityWeight = getSourceWeight(result.authorityLevel, result.category)
      const weightedScore = rawScore * authorityWeight

      return {
        id: result.id,
        title: result.title || '',
        content: result.content,
        category: result.category,
        source: result.source,
        score: weightedScore,
        method: 'keyword' as const,
        rank: index + 1,
        authorityLevel: result.authorityLevel,
      }
    })
  } catch (error) {
    log.error('Error:', error)
    return []
  }
}

/**
 * Reciprocal Rank Fusion (RRF) algorithm
 * Combines rankings from multiple sources into a single ranked list
 *
 * RRF Score = Σ (weight / (k + rank))
 * where k is a constant (typically 60)
 */
function reciprocalRankFusion(
  vectorResults: Array<SearchResult & { rank: number }>,
  keywordResults: Array<SearchResult & { rank: number }>,
  weights: { vectorWeight: number; keywordWeight: number }
): SearchResult[] {
  const k = 60 // RRF constant (standard value from research)
  const scores = new Map<string, number>()
  const resultsMap = new Map<string, SearchResult>()

  // Calculate RRF scores for vector results
  vectorResults.forEach(result => {
    const rrfScore = weights.vectorWeight / (k + result.rank)
    scores.set(result.id, (scores.get(result.id) || 0) + rrfScore)
    resultsMap.set(result.id, result)
  })

  // Calculate RRF scores for keyword results
  keywordResults.forEach(result => {
    const rrfScore = weights.keywordWeight / (k + result.rank)
    scores.set(result.id, (scores.get(result.id) || 0) + rrfScore)

    // If not already in map from vector search, add it
    if (!resultsMap.has(result.id)) {
      resultsMap.set(result.id, result)
    }
  })

  // Normalize scores to 0-1 range
  const maxScore = Math.max(...Array.from(scores.values()))
  const normalizedScores = new Map<string, number>()
  scores.forEach((score, id) => {
    normalizedScores.set(id, maxScore > 0 ? score / maxScore : 0)
  })

  // Combine and sort by fused score
  const fusedResults = Array.from(resultsMap.values())
    .map(result => ({
      ...result,
      score: normalizedScores.get(result.id) || 0,
      method: 'hybrid' as const,
    }))
    .sort((a, b) => b.score - a.score)

  return fusedResults
}

/**
 * Search with category-specific thresholds
 * Different categories need different similarity thresholds
 */
export async function searchWithCategoryThreshold(
  businessId: string,
  query: string,
  category?: string,
  accessContext?: AccessContext
): Promise<SearchResult[]> {
  // Category-specific thresholds based on use case
  const thresholds: Record<string, number> = {
    faq: 0.5, // FAQs - balanced match
    services: 0.4, // Services can be broader
    pricing: 0.5, // Pricing needs accuracy
    policies: 0.4, // Policies can be broader
    qualifications: 0.35, // Qualifications - lowered to improve recall
    contact: 0.4, // Contact info can be broader
    hours: 0.5, // Hours need accuracy
    other: 0.35, // Other can be broader
  }

  const minScore = category ? (thresholds[category] || 0.35) : 0.35

  return hybridSearch(businessId, query, {
    category,
    minScore,
    limit: 5,
    accessContext,
  })
}

// ============================================
// DOCUMENT CHUNK SEARCH
// ============================================

/**
 * Build access control conditions for document queries
 * Documents must be:
 * 1. status = 'active' (not deleted)
 * 2. Match audience/scope based on actor type
 */
function buildDocumentAccessConditions(context: AccessContext) {
  // Always filter by active status + access control
  if (context.actorType === 'customer') {
    // Customer mode: only public + global, OR customer-scoped to this customer
    const customerConditions = [
      // Public + global documents (always included)
      and(
        eq(documents.audience, 'public'),
        eq(documents.scopeType, 'global')
      )
    ]

    // Add customer-scoped condition only if actorId is provided
    if (context.actorId) {
      customerConditions.push(
        and(
          eq(documents.scopeType, 'customer'),
          eq(documents.scopeId, context.actorId)
        )!
      )
    }

    return and(eq(documents.status, 'active'), or(...customerConditions))
  } else {
    // Staff/Owner mode: can access public + internal
    // AND global + customer-scoped if specified
    const audienceCondition = or(
      eq(documents.audience, 'public'),
      eq(documents.audience, 'internal')
    )

    const scopeConditions = [
      eq(documents.scopeType, 'global'),
    ]

    // Note: We don't filter by staff-scoped here because actorId is a Clerk user ID,
    // not a UUID. Staff-scoped documents would need the staff member's UUID.

    // If querying about a specific customer, include their customer-scoped docs
    if (context.customerScopeId) {
      scopeConditions.push(
        and(
          eq(documents.scopeType, 'customer'),
          eq(documents.scopeId, context.customerScopeId)
        )!
      )
    }

    return and(eq(documents.status, 'active'), audienceCondition, or(...scopeConditions))
  }
}

/**
 * Perform vector search on document chunks
 * Uses chunk_embeddings table for HNSW similarity search
 * Now includes access control and document status filtering
 */
async function performDocumentVectorSearch(
  businessId: string,
  query: string,
  limit: number,
  context: AccessContext
): Promise<Array<SearchResult & { rank: number }>> {
  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query)

    // First, get accessible document IDs based on access context
    const accessCondition = buildDocumentAccessConditions(context)

    log.info(`Query: "${query}", Business: ${businessId}, Actor: ${context.actorType}`)

    const accessibleDocs = await db
      .select({ id: documents.id, title: documents.title })
      .from(documents)
      .where(and(
        eq(documents.businessId, businessId),
        accessCondition
      ))

    const accessibleDocIds = accessibleDocs.map(d => d.id)

    log.info(`Accessible docs: ${accessibleDocIds.length}`, accessibleDocs.map(d => d.title))

    if (accessibleDocIds.length === 0) {
      log.info(`No accessible documents found!`)
      return [] // No accessible documents
    }

    // Get version IDs for accessible documents
    const accessibleVersions = await db
      .select({ id: documentVersions.id, documentId: documentVersions.documentId })
      .from(documentVersions)
      .where(inArray(documentVersions.documentId, accessibleDocIds))

    const versionIdToDocId = new Map(accessibleVersions.map(v => [v.id, v.documentId]))
    const accessibleVersionIds = accessibleVersions.map(v => v.id)

    if (accessibleVersionIds.length === 0) {
      return []
    }

    // Search document chunks using cosine similarity, filtered by accessible versions
    const results = await db
      .select({
        chunkId: documentChunks.id,
        content: documentChunks.content,
        pageStart: documentChunks.pageStart,
        pageEnd: documentChunks.pageEnd,
        chunkMetadata: documentChunks.metadata,
        documentVersionId: documentChunks.documentVersionId,
        similarity: sql<number>`1 - (${chunkEmbeddings.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
      })
      .from(documentChunks)
      .innerJoin(chunkEmbeddings, eq(chunkEmbeddings.chunkId, documentChunks.id))
      .where(and(
        eq(documentChunks.businessId, businessId),
        inArray(documentChunks.documentVersionId, accessibleVersionIds)
      ))
      .orderBy(sql`${chunkEmbeddings.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`)
      .limit(limit)

    // Get document info for each chunk (cached via versionIdToDocId)
    const docCache = new Map<string, { id: string; title: string }>()

    const enrichedResults = await Promise.all(
      results.map(async (result, index) => {
        const docId = versionIdToDocId.get(result.documentVersionId)
        let documentTitle = 'Document'
        let documentId = ''

        if (docId) {
          // Check cache first
          if (docCache.has(docId)) {
            const cached = docCache.get(docId)!
            documentTitle = cached.title
            documentId = cached.id
          } else {
            const doc = await db
              .select({
                id: documents.id,
                title: documents.title,
              })
              .from(documents)
              .where(eq(documents.id, docId))
              .limit(1)
              .then(rows => rows[0])

            if (doc) {
              documentTitle = doc.title
              documentId = doc.id
              docCache.set(docId, { id: doc.id, title: doc.title })
            }
          }
        }

        // Create title from document title + page reference
        const pageRef = result.pageStart === result.pageEnd
          ? `p.${result.pageStart}`
          : `pp.${result.pageStart}-${result.pageEnd}`

        return {
          id: result.chunkId,
          title: `${documentTitle} (${pageRef})`,
          content: result.content,
          category: 'document' as string | null,
          source: 'document',
          score: result.similarity,
          method: 'vector' as const,
          rank: index + 1,
          // Extended document info
          documentId,
          documentTitle,
          pageStart: result.pageStart,
          pageEnd: result.pageEnd,
        }
      })
    )

    return enrichedResults
  } catch (error) {
    log.error('Error:', error)
    return []
  }
}

/**
 * Perform keyword search on document chunks
 * Now includes access control and document status filtering
 */
async function performDocumentKeywordSearch(
  businessId: string,
  query: string,
  limit: number,
  context: AccessContext
): Promise<Array<SearchResult & { rank: number }>> {
  try {
    const searchPattern = `%${query}%`

    // First, get accessible document IDs based on access context
    const accessCondition = buildDocumentAccessConditions(context)

    log.info(`Query: "${query}", Business: ${businessId}, Actor: ${context.actorType}`)

    const accessibleDocs = await db
      .select({ id: documents.id, title: documents.title })
      .from(documents)
      .where(and(
        eq(documents.businessId, businessId),
        accessCondition
      ))

    const accessibleDocIds = accessibleDocs.map(d => d.id)

    log.info(`Accessible docs: ${accessibleDocIds.length}`, accessibleDocs.map(d => d.title))

    if (accessibleDocIds.length === 0) {
      log.info(`No accessible documents found!`)
      return [] // No accessible documents
    }

    // Get version IDs for accessible documents
    const accessibleVersions = await db
      .select({ id: documentVersions.id, documentId: documentVersions.documentId })
      .from(documentVersions)
      .where(inArray(documentVersions.documentId, accessibleDocIds))

    const versionIdToDocId = new Map(accessibleVersions.map(v => [v.id, v.documentId]))
    const accessibleVersionIds = accessibleVersions.map(v => v.id)

    if (accessibleVersionIds.length === 0) {
      return []
    }

    const results = await db
      .select({
        chunkId: documentChunks.id,
        content: documentChunks.content,
        pageStart: documentChunks.pageStart,
        pageEnd: documentChunks.pageEnd,
        documentVersionId: documentChunks.documentVersionId,
      })
      .from(documentChunks)
      .where(
        and(
          eq(documentChunks.businessId, businessId),
          inArray(documentChunks.documentVersionId, accessibleVersionIds),
          ilike(documentChunks.content, searchPattern)
        )
      )
      .limit(limit)

    // Get document info for each chunk (cached via versionIdToDocId)
    const docCache = new Map<string, { id: string; title: string }>()

    const enrichedResults = await Promise.all(
      results.map(async (result, index) => {
        const docId = versionIdToDocId.get(result.documentVersionId)
        let documentTitle = 'Document'
        let documentId = ''

        if (docId) {
          // Check cache first
          if (docCache.has(docId)) {
            const cached = docCache.get(docId)!
            documentTitle = cached.title
            documentId = cached.id
          } else {
            const doc = await db
              .select({
                id: documents.id,
                title: documents.title,
              })
              .from(documents)
              .where(eq(documents.id, docId))
              .limit(1)
              .then(rows => rows[0])

            if (doc) {
              documentTitle = doc.title
              documentId = doc.id
              docCache.set(docId, { id: doc.id, title: doc.title })
            }
          }
        }

        // Create title from document title + page reference
        const pageRef = result.pageStart === result.pageEnd
          ? `p.${result.pageStart}`
          : `pp.${result.pageStart}-${result.pageEnd}`

        // Calculate score based on match
        const contentMatch = result.content.toLowerCase().includes(query.toLowerCase())
        const baseScore = contentMatch ? 0.7 : 0.5
        const rankPenalty = index * 0.05
        const score = Math.max(0.1, baseScore - rankPenalty)

        return {
          id: result.chunkId,
          title: `${documentTitle} (${pageRef})`,
          content: result.content,
          category: 'document' as string | null,
          source: 'document',
          score,
          method: 'keyword' as const,
          rank: index + 1,
          // Extended document info
          documentId,
          documentTitle,
          pageStart: result.pageStart,
          pageEnd: result.pageEnd,
        }
      })
    )

    return enrichedResults
  } catch (error) {
    log.error('Error:', error)
    return []
  }
}

/**
 * Search only document chunks (not knowledge base)
 * Returns DocumentSearchResult with full provenance info
 */
export async function searchDocuments(
  businessId: string,
  query: string,
  options: { limit?: number; minScore?: number; accessContext?: AccessContext } = {}
): Promise<DocumentSearchResult[]> {
  const { limit = 10, minScore = 0.35, accessContext } = options

  const results = await hybridSearch(businessId, query, {
    limit,
    minScore,
    documentsOnly: true,
    includeDocuments: true,
    accessContext,
  })

  // Filter to only document results and cast to DocumentSearchResult
  return results
    .filter(r => r.source === 'document')
    .map(r => r as DocumentSearchResult)
}

// ============================================
// ENHANCED SEARCH WITH METADATA
// ============================================

/**
 * Extended search options for hybridSearchWithMetadata
 */
export interface ExtendedSearchOptions extends HybridSearchOptions {
  returnMetadata?: boolean
}

/**
 * Hybrid search result with full metadata
 */
export interface HybridSearchResult {
  results: SearchResult[]
  metadata: SearchMetadata
}

/**
 * Perform hybrid search with full metadata including conflict detection
 *
 * This is the preferred API for chatbot responses as it provides:
 * - Compatibility-filtered results
 * - Authority-weighted scoring
 * - Field-level conflict detection
 * - Query augmentation info
 */
export async function hybridSearchWithMetadata(
  businessId: string,
  query: string,
  options: ExtendedSearchOptions = {}
): Promise<HybridSearchResult> {
  const {
    filterIncompatibleEmbeddings = true,
    detectConflicts: shouldDetectConflicts = true,
  } = options

  // Get results from standard hybrid search
  const results = await hybridSearch(businessId, query, options)

  // Build metadata
  const metadata: SearchMetadata = {
    conflictDetected: false,
    conflicts: [],
    incompatibleEmbeddingsFiltered: 0,
    staleEmbeddingsDetected: [],
    queryAugmented: shouldAugmentQuery(query),
    queryVariations: shouldAugmentQuery(query) ? augmentQuery(query).augmented.slice(0, 3) : [query],
  }

  // Detect conflicts in top results
  if (shouldDetectConflicts && results.length > 1) {
    const conflicts = detectFieldConflicts(results)
    if (conflicts.length > 0) {
      metadata.conflictDetected = true
      metadata.conflicts = conflicts

      log.warn('Conflicts detected:', conflicts.map(c => ({
        field: c.field,
        valueCount: c.values.length,
        values: c.values.map(v => v.value),
      })))
    }
  }

  return { results, metadata }
}

/**
 * Check if stale embeddings exist for a business
 * Useful for monitoring and triggering re-embedding jobs
 */
export async function checkStaleEmbeddings(
  businessId: string
): Promise<{ staleCount: number; legacyCount: number; totalCount: number }> {
  try {
    // Count knowledge entries by preprocess version
    const kbCounts = await db
      .select({
        preprocessVersion: chatbotKnowledge.preprocessVersion,
        count: sql<number>`count(*)::int`,
      })
      .from(chatbotKnowledge)
      .where(
        and(
          eq(chatbotKnowledge.businessId, businessId),
          eq(chatbotKnowledge.isActive, true),
          isNotNull(chatbotKnowledge.embedding)
        )
      )
      .groupBy(chatbotKnowledge.preprocessVersion)

    let legacyCount = 0
    let staleCount = 0
    let totalCount = 0

    for (const row of kbCounts) {
      totalCount += row.count
      if (row.preprocessVersion === 'legacy' || !row.preprocessVersion) {
        legacyCount += row.count
      } else if (row.preprocessVersion !== EMBEDDING_CONFIG.preprocessVersion) {
        staleCount += row.count
      }
    }

    return { staleCount, legacyCount, totalCount }
  } catch (error) {
    log.error('Error:', error)
    return { staleCount: 0, legacyCount: 0, totalCount: 0 }
  }
}
