/**
 * Embedding generation using OpenRouter
 * Model: openai/text-embedding-3-small (1536 dimensions)
 *
 * Split Brain Prevention (2026-02):
 * - Full embedding metadata for provenance tracking
 * - NFKC normalization for consistent preprocessing
 * - Content hashing for change detection
 */

import { createHash } from 'crypto'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required')
}

const OPENROUTER_SITE_URL = 'https://www.hebelki.de'
const OPENROUTER_SITE_NAME = 'Hebelki Documents Worker'

// ============================================
// EMBEDDING CONFIGURATION
// ============================================

/**
 * Current embedding configuration.
 * Must match src/lib/embeddings/index.ts
 * Increment preprocessVersion when normalizeText() changes.
 */
export const EMBEDDING_CONFIG = {
  provider: 'openrouter',
  model: 'openai/text-embedding-3-small',
  dim: 1536,
  preprocessVersion: 'p1',  // Increment when normalizeText changes
} as const

export interface EmbeddingResult {
  embedding: number[]
  provider: string
  model: string
  dim: number
  preprocessVersion: string
  contentHash: string
}

// ============================================
// PREPROCESSING
// ============================================

/**
 * Normalize text before embedding.
 * Version: p1
 *
 * IMPORTANT: Must match src/lib/embeddings/index.ts normalizeText()
 * Changes require incrementing EMBEDDING_CONFIG.preprocessVersion
 */
export function normalizeText(text: string): string {
  return text
    // Unicode normalization (NFKC handles umlauts, smart quotes, ligatures, etc.)
    .normalize('NFKC')
    // Normalize line endings (Windows → Unix)
    .replace(/\r\n/g, '\n')
    // Collapse 3+ newlines to 2 (preserve paragraph breaks)
    .replace(/\n{3,}/g, '\n\n')
    // Collapse horizontal whitespace (tabs, multiple spaces)
    .replace(/[ \t]+/g, ' ')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Trim whole string
    .trim()
}

/**
 * Generate SHA-256 hash of content for change detection
 */
export function hashContent(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

// ============================================
// EMBEDDING GENERATION
// ============================================

/**
 * Generate embeddings for multiple texts with full metadata
 */
const EMBEDDING_TIMEOUT_MS = 30_000
const EMBEDDING_MAX_RETRIES = 3

export async function generateEmbeddingsWithMetadata(
  texts: string[]
): Promise<EmbeddingResult[]> {
  if (texts.length === 0) return []

  // Normalize all texts and compute hashes
  const normalized = texts.map(normalizeText)
  const hashes = normalized.map(hashContent)

  console.log(`[Embeddings] Generating embeddings for ${texts.length} texts`)

  let lastError: Error | null = null
  for (let attempt = 1; attempt <= EMBEDDING_MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS)

    try {
      const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': OPENROUTER_SITE_URL,
          'X-Title': OPENROUTER_SITE_NAME,
        },
        body: JSON.stringify({
          model: EMBEDDING_CONFIG.model,
          input: normalized,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`OpenRouter embeddings failed: ${JSON.stringify(error)}`)
      }

      const data = await response.json() as { data: Array<{ embedding: number[] }> }
      const embeddings = data.data.map((item) => item.embedding)

      console.log(`[Embeddings] Generated ${embeddings.length} embeddings`)

      return embeddings.map((embedding, i) => ({
        embedding,
        provider: EMBEDDING_CONFIG.provider,
        model: EMBEDDING_CONFIG.model,
        dim: EMBEDDING_CONFIG.dim,
        preprocessVersion: EMBEDDING_CONFIG.preprocessVersion,
        contentHash: hashes[i],
      }))
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const isAbort = lastError.name === 'AbortError'
      console.warn(`[Embeddings] Attempt ${attempt}/${EMBEDDING_MAX_RETRIES} failed${isAbort ? ' (timeout)' : ''}: ${lastError.message}`)

      if (attempt < EMBEDDING_MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000 // 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  console.error('[Embeddings] All retries exhausted')
  throw lastError!
}

/**
 * Generate embeddings for multiple texts (legacy API - returns just vectors)
 * @deprecated Use generateEmbeddingsWithMetadata for new code
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const results = await generateEmbeddingsWithMetadata(texts)
  return results.map(r => r.embedding)
}

/**
 * Generate embedding for a single text with full metadata
 */
export async function generateEmbeddingWithMetadata(text: string): Promise<EmbeddingResult> {
  const results = await generateEmbeddingsWithMetadata([text])
  return results[0]
}

/**
 * Generate embedding for a single text (legacy API)
 * @deprecated Use generateEmbeddingWithMetadata for new code
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await generateEmbeddingWithMetadata(text)
  return result.embedding
}

/**
 * Generate embeddings in batches with full metadata
 */
export async function generateEmbeddingsBatchedWithMetadata(
  texts: string[],
  batchSize: number = 50
): Promise<EmbeddingResult[]> {
  const allResults: EmbeddingResult[] = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const results = await generateEmbeddingsWithMetadata(batch)
    allResults.push(...results)

    // Small delay between batches to avoid rate limits
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return allResults
}

/**
 * Generate embeddings in batches (legacy API)
 * @deprecated Use generateEmbeddingsBatchedWithMetadata for new code
 */
export async function generateEmbeddingsBatched(
  texts: string[],
  batchSize: number = 50
): Promise<number[][]> {
  const results = await generateEmbeddingsBatchedWithMetadata(texts, batchSize)
  return results.map(r => r.embedding)
}
