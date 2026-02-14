/**
 * Embedding Service using OpenRouter
 * Model: openai/text-embedding-3-small (1536 dimensions)
 *
 * Split Brain Prevention:
 * - Full embedding provenance metadata
 * - NFKC normalization for consistent preprocessing
 * - Content hashing for change detection
 * - Preprocess version tracking
 */

import { createHash } from 'crypto'
import { createLogger } from '@/lib/logger'
import { logAIUsage } from '@/lib/ai/usage'

const log = createLogger('lib:embeddings:index')

// ============================================
// EMBEDDING CONFIGURATION
// ============================================

/**
 * Current embedding configuration.
 * Increment preprocessVersion when normalizeText() changes.
 */
export const EMBEDDING_CONFIG = {
  provider: 'openrouter',
  model: 'openai/text-embedding-3-small',
  dim: 1536,
  preprocessVersion: 'p1',  // Increment when normalizeText changes
} as const

export type EmbeddingProvider = 'openrouter' | 'openai'

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
 * IMPORTANT: Changes to this function require incrementing
 * EMBEDDING_CONFIG.preprocessVersion to prevent split brain.
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

/**
 * Check if an embedding is stale (content changed since embedding)
 */
export function isStaleEmbedding(
  currentContent: string,
  storedHash: string | null
): boolean {
  if (!storedHash) return true
  const currentHash = hashContent(normalizeText(currentContent))
  return currentHash !== storedHash
}

// ============================================
// API KEY HANDLING
// ============================================

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY environment variable is required. ' +
        'Please add it to .env.local'
    )
  }
  return apiKey
}

// ============================================
// EMBEDDING GENERATION
// ============================================

/**
 * Generate embedding with full provenance metadata
 */
export async function generateEmbeddingWithMetadata(
  text: string,
  apiKey?: string,
  businessId?: string
): Promise<EmbeddingResult> {
  const normalized = normalizeText(text)
  const contentHash = hashContent(normalized)
  const embedding = await generateEmbeddingRaw(normalized, apiKey, businessId)

  return {
    embedding,
    provider: EMBEDDING_CONFIG.provider,
    model: EMBEDDING_CONFIG.model,
    dim: EMBEDDING_CONFIG.dim,
    preprocessVersion: EMBEDDING_CONFIG.preprocessVersion,
    contentHash,
  }
}

/**
 * Generate embedding for text (legacy API - returns just the vector)
 * @deprecated Use generateEmbeddingWithMetadata for new code
 */
export async function generateEmbedding(text: string, apiKey?: string, businessId?: string): Promise<number[]> {
  // For backward compatibility, normalize and embed
  const normalized = normalizeText(text)
  return generateEmbeddingRaw(normalized, apiKey, businessId)
}

/**
 * Internal: Call OpenRouter API for embeddings
 */
async function generateEmbeddingRaw(normalizedText: string, apiKey?: string, businessId?: string): Promise<number[]> {
  const OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL || 'https://www.hebelki.de'
  const OPENROUTER_SITE_NAME = process.env.OPENROUTER_SITE_NAME || 'Hebelki'

  try {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey || getApiKey()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': OPENROUTER_SITE_URL,
        'X-Title': OPENROUTER_SITE_NAME,
      },
      body: JSON.stringify({
        model: EMBEDDING_CONFIG.model,
        input: normalizedText,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenRouter embeddings failed: ${JSON.stringify(error)}`)
    }

    const data = await response.json() as {
      data: { embedding: number[] }[]
      usage?: { prompt_tokens?: number; total_tokens?: number }
    }

    // Fire-and-forget usage logging
    if (businessId && data.usage) {
      logAIUsage({
        businessId,
        channel: 'embedding',
        model: EMBEDDING_CONFIG.model,
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: 0,
        totalTokens: data.usage.total_tokens || data.usage.prompt_tokens || 0,
      })
    }

    return data.data[0].embedding
  } catch (error) {
    log.error('Error generating embedding:', error)
    throw error
  }
}

/**
 * Generate embeddings for multiple texts with full metadata
 */
export async function generateEmbeddingsWithMetadata(
  texts: string[],
  apiKey?: string,
  businessId?: string
): Promise<EmbeddingResult[]> {
  if (texts.length === 0) return []

  // Normalize all texts and compute hashes
  const normalized = texts.map(normalizeText)
  const hashes = normalized.map(hashContent)

  // Batch API call
  const embeddings = await generateEmbeddingsRaw(normalized, apiKey, businessId)

  // Return with full metadata
  return embeddings.map((embedding, i) => ({
    embedding,
    provider: EMBEDDING_CONFIG.provider,
    model: EMBEDDING_CONFIG.model,
    dim: EMBEDDING_CONFIG.dim,
    preprocessVersion: EMBEDDING_CONFIG.preprocessVersion,
    contentHash: hashes[i],
  }))
}

/**
 * Generate embeddings for multiple texts (legacy API)
 * @deprecated Use generateEmbeddingsWithMetadata for new code
 */
export async function generateEmbeddings(texts: string[], apiKey?: string, businessId?: string): Promise<number[][]> {
  const normalized = texts.map(normalizeText)
  return generateEmbeddingsRaw(normalized, apiKey, businessId)
}

/**
 * Internal: Batch API call for embeddings
 */
async function generateEmbeddingsRaw(normalizedTexts: string[], apiKey?: string, businessId?: string): Promise<number[][]> {
  if (normalizedTexts.length === 0) return []

  const OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL || 'https://www.hebelki.de'
  const OPENROUTER_SITE_NAME = process.env.OPENROUTER_SITE_NAME || 'Hebelki'

  try {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey || getApiKey()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': OPENROUTER_SITE_URL,
        'X-Title': OPENROUTER_SITE_NAME,
      },
      body: JSON.stringify({
        model: EMBEDDING_CONFIG.model,
        input: normalizedTexts,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenRouter embeddings failed: ${JSON.stringify(error)}`)
    }

    const data = await response.json() as {
      data: { embedding: number[] }[]
      usage?: { prompt_tokens?: number; total_tokens?: number }
    }

    // Fire-and-forget usage logging
    if (businessId && data.usage) {
      logAIUsage({
        businessId,
        channel: 'embedding',
        model: EMBEDDING_CONFIG.model,
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: 0,
        totalTokens: data.usage.total_tokens || data.usage.prompt_tokens || 0,
      })
    }

    return data.data.map((item) => item.embedding)
  } catch (error) {
    log.error('Error generating embeddings:', error)
    throw error
  }
}

/**
 * Generate embeddings in batches with full metadata
 */
export async function generateEmbeddingsBatchedWithMetadata(
  texts: string[],
  batchSize: number = 50,
  apiKey?: string,
  businessId?: string
): Promise<EmbeddingResult[]> {
  const allResults: EmbeddingResult[] = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const results = await generateEmbeddingsWithMetadata(batch, apiKey, businessId)
    allResults.push(...results)

    // Small delay between batches to avoid rate limits
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return allResults
}
