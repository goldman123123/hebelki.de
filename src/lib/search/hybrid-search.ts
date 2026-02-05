/**
 * Hybrid Search Implementation (2026 RAG Best Practices)
 *
 * Combines vector search (semantic) with keyword search (full-text)
 * using Reciprocal Rank Fusion (RRF) for improved accuracy.
 *
 * Research sources:
 * - https://levelup.gitconnected.com/designing-a-production-grade-rag-architecture-bee5a4e4d9aa
 * - https://arxiv.org/abs/2501.07391
 */

import { generateEmbedding } from '@/lib/embeddings'
import { db } from '@/lib/db'
import { chatbotKnowledge } from '@/lib/db/schema'
import { eq, and, or, ilike, isNotNull, sql } from 'drizzle-orm'
import { augmentQuery, shouldAugmentQuery } from './query-augmentation'

export interface SearchResult {
  id: string
  title: string
  content: string
  category: string | null
  source: string
  score: number // 0-1 (higher = more relevant)
  method: 'vector' | 'keyword' | 'hybrid'
}

export interface HybridSearchOptions {
  limit?: number
  category?: string
  vectorWeight?: number // 0-1, default 0.6
  keywordWeight?: number // 0-1, default 0.4
  minScore?: number // Minimum score threshold (0-1)
}

/**
 * Perform hybrid search combining vector and keyword search
 * With optional query augmentation for multilingual queries
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
    minScore = 0.35, // Lowered from 0.5 to improve recall
  } = options

  console.log(`\n=== HYBRID SEARCH ===`)
  console.log(`Query: "${query}"`)
  console.log(`Business ID: ${businessId}`)
  console.log(`Category: ${category || 'none'}`)
  console.log(`Min Score: ${minScore}`)

  // Check if query augmentation would help
  const useAugmentation = shouldAugmentQuery(query)
  let searchQueries = [query]

  if (useAugmentation) {
    const augmented = augmentQuery(query)
    searchQueries = augmented.augmented.slice(0, 3) // Limit to top 3 variations
    console.log(`[Hybrid Search] Augmented query with ${searchQueries.length} variations:`, searchQueries)
  }

  // Run searches for all query variations in parallel
  const allSearches = await Promise.all(
    searchQueries.map(async searchQuery => {
      const [vectorResults, keywordResults] = await Promise.all([
        performVectorSearch(businessId, searchQuery, category, limit * 2),
        performKeywordSearch(businessId, searchQuery, category, limit * 2),
      ])
      return { vectorResults, keywordResults }
    })
  )

  // Merge results from all query variations
  const allVectorResults = allSearches.flatMap(s => s.vectorResults)
  const allKeywordResults = allSearches.flatMap(s => s.keywordResults)

  // Deduplicate by ID (keep highest ranked)
  const dedupeVector = deduplicateResults(allVectorResults)
  const dedupeKeyword = deduplicateResults(allKeywordResults)

  console.log(`Vector results: ${dedupeVector.length}`)
  if (dedupeVector.length === 0) {
    console.warn('⚠️ Vector search returned 0 results - possible embedding issues or low similarity')
  } else {
    dedupeVector.slice(0, 3).forEach((r, i) => {
      console.log(`  [${i}] ${r.title} - score: ${r.score.toFixed(3)}`)
    })
  }

  console.log(`Keyword results: ${dedupeKeyword.length}`)
  dedupeKeyword.slice(0, 3).forEach((r, i) => {
    console.log(`  [${i}] ${r.title} - score: ${r.score.toFixed(3)}`)
  })

  // Combine results using Reciprocal Rank Fusion
  const fusedResults = reciprocalRankFusion(
    dedupeVector,
    dedupeKeyword,
    { vectorWeight, keywordWeight }
  )

  console.log(`Fused results: ${fusedResults.length}`)

  // Filter by minimum score and limit
  const filteredResults = fusedResults.filter(r => r.score >= minScore)
  const belowThreshold = fusedResults.filter(r => r.score < minScore)

  if (belowThreshold.length > 0) {
    console.log(`Filtered out ${belowThreshold.length} results below threshold ${minScore}:`)
    belowThreshold.slice(0, 3).forEach(r => {
      console.log(`  ❌ ${r.title} - score: ${r.score.toFixed(3)}`)
    })
  }

  const finalResults = filteredResults.slice(0, limit)

  console.log(`Final results: ${finalResults.length}`)
  console.log(`=== END HYBRID SEARCH ===\n`)

  return finalResults
}

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
 * Perform vector search using embeddings (semantic similarity)
 */
async function performVectorSearch(
  businessId: string,
  query: string,
  category: string | undefined,
  limit: number
): Promise<Array<SearchResult & { rank: number }>> {
  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query)

    // Search using cosine similarity (pgvector operator <=>)
    const results = await db
      .select({
        id: chatbotKnowledge.id,
        title: chatbotKnowledge.title,
        content: chatbotKnowledge.content,
        category: chatbotKnowledge.category,
        source: chatbotKnowledge.source,
        similarity: sql<number>`1 - (${chatbotKnowledge.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
      })
      .from(chatbotKnowledge)
      .where(
        and(
          eq(chatbotKnowledge.businessId, businessId),
          eq(chatbotKnowledge.isActive, true),
          isNotNull(chatbotKnowledge.embedding), // Skip entries without embeddings
          category ? eq(chatbotKnowledge.category, category) : undefined
        )
      )
      .orderBy(sql`${chatbotKnowledge.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`)
      .limit(limit)

    return results.map((result, index) => ({
      id: result.id,
      title: result.title || '',
      content: result.content,
      category: result.category,
      source: result.source,
      score: result.similarity,
      method: 'vector' as const,
      rank: index + 1,
    }))
  } catch (error) {
    console.error('[Vector Search] Error:', error)
    return []
  }
}

/**
 * Perform keyword search using PostgreSQL full-text search
 */
async function performKeywordSearch(
  businessId: string,
  query: string,
  category: string | undefined,
  limit: number
): Promise<Array<SearchResult & { rank: number }>> {
  try {
    // Use ILIKE for simple pattern matching (works with German text)
    const searchPattern = `%${query}%`

    const results = await db
      .select({
        id: chatbotKnowledge.id,
        title: chatbotKnowledge.title,
        content: chatbotKnowledge.content,
        category: chatbotKnowledge.category,
        source: chatbotKnowledge.source,
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
          category ? eq(chatbotKnowledge.category, category) : undefined
        )
      )
      .limit(limit)

    // Calculate simple relevance score based on match position
    return results.map((result, index) => {
      const titleMatch = result.title?.toLowerCase().includes(query.toLowerCase())
      const contentMatch = result.content.toLowerCase().includes(query.toLowerCase())

      // Higher score if query appears in title
      const baseScore = titleMatch ? 0.8 : 0.6
      // Decay score based on rank
      const rankPenalty = index * 0.05
      const score = Math.max(0.1, baseScore - rankPenalty)

      return {
        id: result.id,
        title: result.title || '',
        content: result.content,
        category: result.category,
        source: result.source,
        score,
        method: 'keyword' as const,
        rank: index + 1,
      }
    })
  } catch (error) {
    console.error('[Keyword Search] Error:', error)
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
  category?: string
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
  })
}
